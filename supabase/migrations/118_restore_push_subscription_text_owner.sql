-- Restore migration 019's text owner contract while preserving existing UUID values.
ALTER TABLE public.push_subscriptions
  ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

NOTIFY pgrst, 'reload schema';
