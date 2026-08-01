-- ============================================================
-- Migration 060: Atomic background_job enqueue (idempotent RPC)
--
-- Problem solved:
--   The web routes that enqueue pdf_generation jobs (booking submit,
--   admin regenerate-pdf) used the pattern:
--       INSERT ... ; on 23505: SELECT row by key; maybe DELETE; INSERT
--   across multiple HTTP round-trips on the JS client. Two simultaneous
--   Regenerate requests on a quote whose prior job was dead_letter could
--   both DELETE the stale row and both INSERT, racing on the UNIQUE slot
--   (one wins, the other gets a spurious 500) — and a third request could
--   sneak an insert between a peer's delete and its insert.
--
-- Solution:
--   A single SECURITY DEFINER function that performs the entire
--   idempotency decision inside one transaction, taking a row-level
--   FOR UPDATE lock on any existing row keyed by idempotency_key so
--   concurrent callers serialize on the same key. Returns the job id,
--   its terminal status, and an `outcome` tag the caller can branch on:
--     'inserted'         — no prior row, fresh job created
--     'already_queued'   — a pending/processing job already exists, left as-is
--     'already_completed'— a completed job already exists, left as-is
--     'replaced'        — a dead/failed/cancelled row was deleted and a new job created
--
-- Caller supplies payload + key; the function owns all row mutation.
-- ============================================================

CREATE OR REPLACE FUNCTION enqueue_background_job(
  p_job_type       TEXT,
  p_payload        JSONB,
  p_idempotency_key TEXT DEFAULT NULL,
  p_priority       INT  DEFAULT 0,
  p_max_retries    INT  DEFAULT 3,
  p_scheduled_at   TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  id        UUID,
  status    TEXT,
  outcome   TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
-- pg_catalog first so any unqualified built-in resolves to the trusted
-- system schema before the caller-influenceable public namespace; this is
-- the standard hardening for SECURITY DEFINER functions. The body still
-- qualifies the only user table it touches as public.background_jobs to
-- remove all search_path ambiguity.
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_existing_id    UUID;
  v_existing_status TEXT;
  v_new_id         UUID;
  v_attempts       INT := 0;
BEGIN
  -- =====================================================================
  -- Guard 1: reject empty / unbounded payloads early. The worker only
  -- registers a small set of job_type handlers; a typo here would otherwise
  -- insert a pending row that the worker can never process (it dead-letters).
  -- The set is owned by this function so a new job type is a deliberate edit.
  -- =====================================================================
  IF p_job_type IS NULL OR p_payload IS NULL THEN
    RAISE EXCEPTION 'enqueue_background_job: job_type and payload are required'
      USING ERRCODE = '23502'; -- not_null_violation
  END IF;

  IF p_job_type NOT IN ('pdf_generation') THEN
    RAISE EXCEPTION 'enqueue_background_job: unknown job_type "%"', p_job_type
      USING ERRCODE = '22023'; -- invalid_parameter_value
  END IF;

  IF p_max_retries < 1 OR p_max_retries > 10 THEN
    p_max_retries := 3; -- silent clamp; range guard against abuse
  END IF;

  -- =====================================================================
  -- NULL idempotency key: insert directly. NULL keys never conflict (SQL
  -- UNIQUE treats each NULL as distinct), so there is nothing to lock.
  -- =====================================================================
  IF p_idempotency_key IS NULL THEN
    INSERT INTO public.background_jobs (job_type, payload, idempotency_key, priority, max_retries, scheduled_at)
    VALUES (p_job_type, p_payload, NULL, p_priority, p_max_retries, p_scheduled_at)
    RETURNING id, status INTO v_new_id, v_existing_status;

    RETURN QUERY SELECT v_new_id, v_existing_status, 'inserted'::TEXT;
    RETURN;
  END IF;

  -- =====================================================================
  -- Keyed enqueue. The whole decision loop is wrapped in an exception
  -- block because under READ COMMITTED a SELECT ... FOR UPDATE that
  -- returns no rows does NOT block a peer that also found no rows — both
  -- would reach INSERT and one would raise unique_violation (23505). We
  -- trap it and re-enter the decision loop, which now sees the committed
  -- row from the winner and takes the already_queued / already_completed
  -- branch. Bounded to 3 attempts to guarantee forward progress.
  -- =====================================================================
  <<decision_loop>>
  LOOP
    v_attempts := v_attempts + 1;
    IF v_attempts > 3 THEN
      RAISE EXCEPTION 'enqueue_background_job: exceeded 3 attempts for key "%"', p_idempotency_key
        USING ERRCODE = '40P01'; -- transaction_intervention_required
    END IF;

    BEGIN
      -- Serialize on any existing row keyed by p_idempotency_key. Under
      -- READ COMMITTED, FOR UPDATE blocks a peer txn that has not yet
      -- committed from seeing the same row, then RE-EVALUATES this query
      -- against the row version current at the peer's commit. So if the
      -- peer deleted+re-inserted (replaced branch), we wake up and lock
      -- its brand-new 'pending' row -> already_queued.
      SELECT id, status INTO v_existing_id, v_existing_status
      FROM public.background_jobs
      WHERE idempotency_key = p_idempotency_key
      ORDER BY created_at DESC
      LIMIT 1
      FOR UPDATE;

      IF v_existing_id IS NULL THEN
        -- No prior row for this key. Insert. A concurrent peer that also
        -- found no row will hit unique_violation below and re-loop, by
        -- which time our row is committed and visible -> already_queued.
        INSERT INTO public.background_jobs (job_type, payload, idempotency_key, priority, max_retries, scheduled_at)
        VALUES (p_job_type, p_payload, p_idempotency_key, p_priority, p_max_retries, p_scheduled_at)
        RETURNING id, status INTO v_new_id, v_existing_status;

        RETURN QUERY SELECT v_new_id, v_existing_status, 'inserted'::TEXT;
        RETURN;
      END IF;

      IF v_existing_status IN ('pending', 'processing') THEN
        RETURN QUERY SELECT v_existing_id, v_existing_status, 'already_queued'::TEXT;
        RETURN;
      END IF;

      IF v_existing_status = 'completed' THEN
        RETURN QUERY SELECT v_existing_id, v_existing_status, 'already_completed'::TEXT;
        RETURN;
      END IF;

      -- dead_letter / failed / cancelled: the slot is dead. Delete (still
      -- holding the FOR UPDATE lock on the deceased tuple) and insert a
      -- fresh job with the same key. Lock held until commit, so a peer
      -- waiting on FOR UPDATE will, post-commit, lock either the new
      -- 'pending' row (-> already_queued) or find nothing -> inserts cleanly.
      DELETE FROM public.background_jobs WHERE id = v_existing_id;

      INSERT INTO public.background_jobs (job_type, payload, idempotency_key, priority, max_retries, scheduled_at)
      VALUES (p_job_type, p_payload, p_idempotency_key, p_priority, p_max_retries, p_scheduled_at)
      RETURNING id, status INTO v_new_id, v_existing_status;

      RETURN QUERY SELECT v_new_id, v_existing_status, 'replaced'::TEXT;
      RETURN;

    EXCEPTION
      WHEN unique_violation THEN
        -- 23505: a peer won the INSERT race on the no-prior-row branch.
        -- Re-enter decision_loop; the winner's committed row is now
        -- visible under READ COMMITTED and we will take already_queued.
        -- The subtransaction rolled back only our failed INSERT; our
        -- outer transaction (and any FOR UPDATE lock we may have held on
        -- a different row) is intact.
        CONTINUE;
    END;
  END LOOP decision_loop;
END;
$$;

-- ============================================================
-- Permissions. SECURITY DEFINER runs as the function owner; the only
-- legitimate caller is the service-role client (Supabase service_role
-- role, used by getAdminClient() with the SERVICE_ROLE key). Revoke from
-- PUBLIC/anon so a leaked anon key cannot enqueue jobs, and explicitly
-- grant to service_role where it exists (Supabase projects do). The
-- DO block makes the grant idempotent across project role configs.
-- ============================================================
REVOKE ALL ON FUNCTION enqueue_background_job(TEXT, JSONB, TEXT, INT, INT, TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION enqueue_background_job(TEXT, JSONB, TEXT, INT, INT, TIMESTAMPTZ)
      TO service_role;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
