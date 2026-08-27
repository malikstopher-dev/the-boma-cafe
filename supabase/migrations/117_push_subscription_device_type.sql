-- Restore the device metadata column declared by migration 019 but absent in production.
ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS device_type TEXT;

NOTIFY pgrst, 'reload schema';
