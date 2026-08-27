-- Batch 4 / M-11: durable public media storage and tracked compensation.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'menu-images', 'menu-images', TRUE, 10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::TEXT[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE OR REPLACE FUNCTION public.enqueue_storage_cleanup(p_bucket TEXT, p_path TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF NULLIF(p_bucket, '') IS NULL OR NULLIF(p_path, '') IS NULL THEN
    RAISE EXCEPTION 'bucket and path are required' USING ERRCODE = '22023';
  END IF;
  IF p_bucket NOT IN ('menu-images', 'staff-media', 'boma-images') THEN
    RAISE EXCEPTION 'unsupported cleanup bucket' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.background_jobs (
    job_type, payload, idempotency_key, priority, max_retries, scheduled_at
  ) VALUES (
    'storage_cleanup',
    jsonb_build_object('bucket', p_bucket, 'path', p_path),
    'storage_cleanup:' || p_bucket || ':' || p_path,
    10, 5, now()
  )
  ON CONFLICT (idempotency_key) DO UPDATE SET
    status = CASE WHEN public.background_jobs.status IN ('failed', 'dead_letter', 'cancelled') THEN 'pending' ELSE public.background_jobs.status END,
    scheduled_at = CASE WHEN public.background_jobs.status IN ('failed', 'dead_letter', 'cancelled') THEN now() ELSE public.background_jobs.scheduled_at END,
    error = CASE WHEN public.background_jobs.status IN ('failed', 'dead_letter', 'cancelled') THEN NULL ELSE public.background_jobs.error END
  RETURNING public.background_jobs.id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_storage_cleanup(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_storage_cleanup(TEXT, TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';
