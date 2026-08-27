-- Batch 3: private staff voice media and atomic push-subscription ownership.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('staff-media', 'staff-media', false, 10485760, ARRAY['audio/webm'])
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

ALTER TABLE public.push_subscriptions
  DROP CONSTRAINT IF EXISTS push_subscriptions_role_check;
ALTER TABLE public.push_subscriptions
  ADD CONSTRAINT push_subscriptions_role_check
  CHECK (role IN ('admin', 'kitchen', 'waiter', 'bar'));

CREATE OR REPLACE FUNCTION public.register_owned_push_subscription(
  p_user_id TEXT,
  p_role TEXT,
  p_fcm_token TEXT,
  p_device_type TEXT DEFAULT NULL,
  p_app_version TEXT DEFAULT NULL
)
RETURNS TABLE (id UUID, outcome TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_user_id IS NULL OR btrim(p_user_id) = '' OR p_fcm_token IS NULL OR btrim(p_fcm_token) = '' THEN
    RAISE EXCEPTION 'push_subscription_identity_required';
  END IF;
  IF p_role NOT IN ('admin', 'kitchen', 'waiter', 'bar') THEN
    RAISE EXCEPTION 'invalid_push_subscription_role';
  END IF;

  INSERT INTO public.push_subscriptions (
    user_id, role, fcm_token, device_type, app_version, is_active, last_seen_at
  ) VALUES (
    p_user_id, p_role, p_fcm_token, p_device_type, p_app_version, true, now()
  )
  ON CONFLICT (fcm_token) DO UPDATE
  SET role = EXCLUDED.role,
      device_type = EXCLUDED.device_type,
      app_version = EXCLUDED.app_version,
      is_active = true,
      last_seen_at = now()
  WHERE public.push_subscriptions.user_id = EXCLUDED.user_id
  RETURNING public.push_subscriptions.id INTO v_id;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'push_subscription_owner_conflict';
  END IF;

  RETURN QUERY SELECT v_id, 'registered'::TEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.unregister_owned_push_subscription(
  p_user_id TEXT,
  p_fcm_token TEXT
)
RETURNS TABLE (id UUID, outcome TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_id UUID;
BEGIN
  UPDATE public.push_subscriptions
  SET is_active = false,
      last_seen_at = now()
  WHERE public.push_subscriptions.fcm_token = p_fcm_token
    AND public.push_subscriptions.user_id = p_user_id
  RETURNING public.push_subscriptions.id INTO v_id;

  IF v_id IS NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.push_subscriptions
      WHERE public.push_subscriptions.fcm_token = p_fcm_token
    ) THEN
      RAISE EXCEPTION 'push_subscription_owner_conflict';
    END IF;
    RAISE EXCEPTION 'push_subscription_not_found';
  END IF;

  RETURN QUERY SELECT v_id, 'unregistered'::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.register_owned_push_subscription(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.unregister_owned_push_subscription(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_owned_push_subscription(TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.unregister_owned_push_subscription(TEXT, TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';
