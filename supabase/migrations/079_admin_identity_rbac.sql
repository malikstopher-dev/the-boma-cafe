-- ============================================================
-- Migration 079: Admin identity, RBAC, sessions, audit trail
-- Mission E8 — separate management identity system.
--
-- DESIGN:
--   - admin_accounts : individual management identities (5 people),
--     bcrypt password hashes, role-based permissions.
--   - admin_sessions : individual sessions (cookie = session UUID,
--     same proven pattern as staff_sessions).
--   - admin_audit_log: every management action with admin identity,
--     before/after values, session, IP.
--
-- INDEPENDENCE:
--   - No FK to staff_profiles / staff_sessions anywhere.
--   - Staff (waiter/kitchen/bar) tables, PINs, sessions untouched.
--   - Service-role only (anon/authenticated revoked) — matches the
--     063 security closure pattern.
-- ============================================================

-- ============================================================
-- 1. admin_accounts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admin_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL CHECK (username = lower(username)),
  display_name TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT 'info@thebomacafe.co.za',
  role TEXT NOT NULL CHECK (role IN ('owner', 'full_manager', 'manager', 'assistant_manager')),
  password_hash TEXT,
  must_change_password BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.admin_accounts(id)
);

CREATE INDEX IF NOT EXISTS idx_admin_accounts_role ON public.admin_accounts(role);

ALTER TABLE public.admin_accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_accounts FROM anon, authenticated;
GRANT ALL ON public.admin_accounts TO service_role;

-- ============================================================
-- 2. admin_sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.admin_accounts(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  device_fingerprint TEXT,
  device_name TEXT,
  user_agent TEXT,
  ip_address TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  signed_out_at TIMESTAMPTZ,
  signed_out_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin ON public.admin_sessions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON public.admin_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_active ON public.admin_sessions(signed_out_at) WHERE signed_out_at IS NULL;

ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_sessions FROM anon, authenticated;
GRANT ALL ON public.admin_sessions TO service_role;

-- ============================================================
-- 3. admin_audit_log
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES public.admin_accounts(id) ON DELETE SET NULL,
  admin_name TEXT,
  admin_role TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  before_values JSONB,
  after_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  session_id UUID REFERENCES public.admin_sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_admin ON public.admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON public.admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_target ON public.admin_audit_log(target_type, target_id);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_audit_log FROM anon, authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;

-- ============================================================
-- 4. Seed the five management accounts (no passwords yet —
--    created in the 'inactive' state, activated via the admin
--    activation flow once code ships. Usernames are the internal
--    identity; email stays shared for display.)
-- ============================================================
INSERT INTO public.admin_accounts (username, display_name, email, role, must_change_password)
VALUES
  ('mahindra',  'MR MAHINDRA', 'info@thebomacafe.co.za', 'owner',             true),
  ('chriselda', 'Chriselda',   'info@thebomacafe.co.za', 'full_manager',      true),
  ('gibbs',     'Mr Gibbs',    'info@thebomacafe.co.za', 'manager',           true),
  ('isaac',     'Mr Isaac',    'info@thebomacafe.co.za', 'manager',           true),
  ('khosi',     'Ms Khosi',    'info@thebomacafe.co.za', 'assistant_manager', true)
ON CONFLICT (username) DO NOTHING;
