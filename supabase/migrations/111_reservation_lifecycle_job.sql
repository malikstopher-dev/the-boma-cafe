-- Batch 1 / C-06: durable booking reservation lifecycle jobs.
-- Migration 092 is applied history, so replay the identical enqueue function
-- with only the registered job-type allow-list extended.

CREATE OR REPLACE FUNCTION enqueue_background_job(
  p_job_type        TEXT,
  p_payload         JSONB,
  p_idempotency_key TEXT DEFAULT NULL,
  p_priority        INT DEFAULT 0,
  p_max_retries     INT DEFAULT 3,
  p_scheduled_at    TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  id      UUID,
  status  TEXT,
  outcome TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_existing_id     UUID;
  v_existing_status TEXT;
  v_new_id          UUID;
  v_attempts        INT := 0;
BEGIN
  IF p_job_type IS NULL OR p_payload IS NULL THEN
    RAISE EXCEPTION 'enqueue_background_job: job_type and payload are required'
      USING ERRCODE = '23502';
  END IF;

  IF p_job_type NOT IN ('pdf_generation', 'order_deduction', 'reservation_lifecycle') THEN
    RAISE EXCEPTION 'enqueue_background_job: unknown job_type "%"', p_job_type
      USING ERRCODE = '22023';
  END IF;

  IF p_max_retries < 1 OR p_max_retries > 10 THEN
    p_max_retries := 3;
  END IF;

  IF p_idempotency_key IS NULL THEN
    INSERT INTO public.background_jobs (
      job_type, payload, idempotency_key, priority, max_retries, scheduled_at
    )
    VALUES (p_job_type, p_payload, NULL, p_priority, p_max_retries, p_scheduled_at)
    RETURNING public.background_jobs.id, public.background_jobs.status
      INTO v_new_id, v_existing_status;

    RETURN QUERY SELECT v_new_id, v_existing_status, 'inserted'::TEXT;
    RETURN;
  END IF;

  <<decision_loop>>
  LOOP
    v_attempts := v_attempts + 1;
    IF v_attempts > 3 THEN
      RAISE EXCEPTION 'enqueue_background_job: exceeded 3 attempts for key "%"', p_idempotency_key
        USING ERRCODE = '40P01';
    END IF;

    BEGIN
      SELECT public.background_jobs.id, public.background_jobs.status
        INTO v_existing_id, v_existing_status
      FROM public.background_jobs
      WHERE public.background_jobs.idempotency_key = p_idempotency_key
      ORDER BY public.background_jobs.created_at DESC
      LIMIT 1
      FOR UPDATE;

      IF v_existing_id IS NULL THEN
        INSERT INTO public.background_jobs (
          job_type, payload, idempotency_key, priority, max_retries, scheduled_at
        )
        VALUES (
          p_job_type, p_payload, p_idempotency_key, p_priority, p_max_retries, p_scheduled_at
        )
        RETURNING public.background_jobs.id, public.background_jobs.status
          INTO v_new_id, v_existing_status;

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

      DELETE FROM public.background_jobs
      WHERE public.background_jobs.id = v_existing_id;

      INSERT INTO public.background_jobs (
        job_type, payload, idempotency_key, priority, max_retries, scheduled_at
      )
      VALUES (
        p_job_type, p_payload, p_idempotency_key, p_priority, p_max_retries, p_scheduled_at
      )
      RETURNING public.background_jobs.id, public.background_jobs.status
        INTO v_new_id, v_existing_status;

      RETURN QUERY SELECT v_new_id, v_existing_status, 'replaced'::TEXT;
      RETURN;
    EXCEPTION
      WHEN unique_violation THEN
        CONTINUE;
    END;
  END LOOP decision_loop;
END;
$$;

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
