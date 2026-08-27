-- 114_worker_leases_and_notification_outbox.sql
-- H-13/H-14: stale-worker fencing and provider-idempotent email delivery.

ALTER TABLE public.background_jobs
  ADD COLUMN IF NOT EXISTS lease_token UUID NOT NULL DEFAULT gen_random_uuid();

ALTER TABLE public.notification_queue
  ADD COLUMN IF NOT EXISTS provider_ids JSONB,
  ADD COLUMN IF NOT EXISTS delivery_attempts INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS outbox_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_queue_logical_key
  ON public.notification_queue(outbox_key)
  WHERE outbox_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.notification_delivery_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES public.notification_queue(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('started', 'sent', 'failed')),
  provider_ids JSONB,
  error TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notification_attempts_notification
  ON public.notification_delivery_attempts(notification_id, started_at DESC);

REVOKE ALL ON public.notification_delivery_attempts FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.claim_notification_outbox(
  p_recipient_type TEXT,
  p_notification_type TEXT,
  p_recipient_identifier TEXT,
  p_template_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_row public.notification_queue%ROWTYPE;
  v_outbox_key TEXT := p_recipient_type || ':' || p_notification_type || ':' || p_recipient_identifier;
BEGIN
  INSERT INTO public.notification_queue (
    recipient_type, recipient_identifier, notification_type, template_data,
    status, outbox_key
  ) VALUES (
    p_recipient_type, p_recipient_identifier, p_notification_type, p_template_data,
    'pending', v_outbox_key
  )
  ON CONFLICT (outbox_key) WHERE outbox_key IS NOT NULL
  DO UPDATE SET template_data = EXCLUDED.template_data
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'status', v_row.status,
    'should_send', v_row.status = 'pending'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.begin_notification_delivery(
  p_notification_id UUID,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_attempt_id UUID;
  v_status TEXT;
BEGIN
  SELECT status INTO v_status
  FROM public.notification_queue
  WHERE id = p_notification_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Notification outbox row not found: %', p_notification_id USING ERRCODE = 'P0002';
  END IF;

  IF v_status <> 'pending' THEN
    RETURN jsonb_build_object('should_send', FALSE, 'status', v_status, 'attempt_id', NULL);
  END IF;

  INSERT INTO public.notification_delivery_attempts (
    notification_id, idempotency_key, status
  ) VALUES (
    p_notification_id, p_idempotency_key, 'started'
  )
  ON CONFLICT (idempotency_key)
  DO UPDATE SET
    status = 'started',
    provider_ids = NULL,
    error = NULL,
    started_at = NOW(),
    completed_at = NULL
  RETURNING id INTO v_attempt_id;

  UPDATE public.notification_queue
  SET delivery_attempts = delivery_attempts + 1,
      last_attempt_at = NOW()
  WHERE id = p_notification_id;

  RETURN jsonb_build_object('should_send', TRUE, 'status', 'pending', 'attempt_id', v_attempt_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.finish_notification_delivery(
  p_notification_id UUID,
  p_attempt_id UUID,
  p_provider_ids JSONB,
  p_error TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF p_error IS NULL THEN
    UPDATE public.notification_delivery_attempts
    SET status = 'sent', provider_ids = p_provider_ids, completed_at = NOW()
    WHERE id = p_attempt_id AND notification_id = p_notification_id;

    UPDATE public.notification_queue
    SET status = 'sent', sent_at = NOW(), provider_ids = p_provider_ids
    WHERE id = p_notification_id;
  ELSE
    UPDATE public.notification_delivery_attempts
    SET status = 'failed', error = p_error, completed_at = NOW()
    WHERE id = p_attempt_id
      AND notification_id = p_notification_id
      AND NOT EXISTS (
        SELECT 1 FROM public.notification_queue
        WHERE id = p_notification_id AND status = 'sent'
      );
    -- Keep the outbox pending so the owning background job can retry.
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_notification_outbox(TEXT, TEXT, TEXT, JSONB)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.begin_notification_delivery(UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finish_notification_delivery(UUID, UUID, JSONB, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_notification_outbox(TEXT, TEXT, TEXT, JSONB)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.begin_notification_delivery(UUID, TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_notification_delivery(UUID, UUID, JSONB, TEXT)
  TO service_role;

NOTIFY pgrst, 'reload schema';
