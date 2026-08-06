-- Rate limit table — survives Vercel cold starts (serverless)
-- Replaces in-memory Map in src/lib/rate-limit.ts
-- Lightweight: ~1 row per (key,minute) window, auto-cleanup via DELETE on read

CREATE TABLE IF NOT EXISTS public.rate_limits (
  key           TEXT        NOT NULL,
  window_start  TIMESTAMPTZ NOT NULL,
  count         INTEGER     NOT NULL DEFAULT 1,
  PRIMARY KEY (key, window_start)
);

-- Enable RLS — only service_role accesses this table
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Cleanup: delete rows older than 5 minutes (called by rate-limit lib)
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start
  ON public.rate_limits (window_start);

-- Allow service role full access (Revoked from anon/authenticated)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_privileges
    WHERE table_name = 'rate_limits' AND grantee = 'service_role'
  ) THEN
    GRANT ALL ON public.rate_limits TO service_role;
  END IF;

  REVOKE ALL ON public.rate_limits FROM anon, authenticated, PUBLIC;
END $$;

-- Atomic increment function — returns true if request is within limit
CREATE OR REPLACE FUNCTION public.increment_rate_limit(
  p_key          TEXT,
  p_window_start TIMESTAMPTZ,
  p_max          INTEGER
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Try to insert a new window row
  INSERT INTO public.rate_limits (key, window_start, count)
  VALUES (p_key, p_window_start, 1)
  ON CONFLICT (key, window_start) DO UPDATE
    SET count = public.rate_limits.count + 1
    RETURNING count INTO v_count;

  RETURN v_count <= p_max;
END;
$$;

-- Grant execute on RPC to service role only
REVOKE ALL ON FUNCTION public.increment_rate_limit(TEXT, TIMESTAMPTZ, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_rate_limit(TEXT, TIMESTAMPTZ, INTEGER) TO service_role;