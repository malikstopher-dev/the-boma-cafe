-- ============================================================
-- Migration 092: Extend enqueue_background_job allow-list for
-- order_deduction (E1-4)
--
-- E1-4 moves completed-order inventory deduction onto the
-- background worker. The completion hook in
-- src/app/api/supabase/orders/route.ts now enqueues an
-- 'order_deduction' job instead of running autoDeductCompletedOrder
-- inline. The worker handler (src/jobs/handlers/order-deduction.ts)
-- reuses the F2 deduct_order_items RPC (engine fallback) and
-- preserves F3 attribution.
--
-- The enqueue RPC (migration 060) owns the job_type allow-list;
-- a new job type is a deliberate edit to this function. This
-- migration replays the WHOLE function with the allow-list
-- extended ('pdf_generation', 'order_deduction'). Signature and
-- every other behaviour (idempotency decision loop, FOR UPDATE
-- serialization, 3-attempt race handling, max_retries clamp,
-- dead_letter/failed/cancelled replacement) are unchanged.
--
-- NOTE: migration 060 is applied history and must NOT be edited
-- in place (existing migration history is immutable — same lesson
-- as F3's 090/091 pair). CREATE OR REPLACE with the identical
-- signature replaces the body cleanly; no overload residue.
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

  IF p_job_type NOT IN ('pdf_generation', 'order_deduction') THEN
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
    RETURNING public.background_jobs.id, public.background_jobs.status INTO v_new_id, v_existing_status;

    RETURN QUERY SELECT v_new_id, v_existing_status, 'inserted'::text;
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
      SELECT public.background_jobs.id, public.background_jobs.status INTO v_existing_id, v_existing_status
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
        RETURNING public.background_jobs.id, public.background_jobs.status INTO v_new_id, v_existing_status;

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
      DELETE FROM public.background_jobs WHERE public.background_jobs.id = v_existing_id;

      INSERT INTO public.background_jobs (job_type, payload, idempotency_key, priority, max_retries, scheduled_at)
      VALUES (p_job_type, p_payload, p_idempotency_key, p_priority, p_max_retries, p_scheduled_at)
      RETURNING public.background_jobs.id, public.background_jobs.status INTO v_new_id, v_existing_status;

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