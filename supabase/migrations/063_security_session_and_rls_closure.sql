-- ============================================================
-- Migration 063: Close anon/PUBLIC RLS leaks on staff & booking
-- internal tables (security remediation, 07 Aug 2026)
--
-- CONFIRMED live (anon key via REST):
--   staff_sessions        -> 200 with rows (session UUID = cookie
--                            credential; role; expires_at; IPs)
--   staff_notifications   -> 200 with rows (creator/recipient,
--                            message payload)
--   waiters               -> 200 with rows
--   availability          -> 200 with rows
--   staff_audit_log       -> 200 with rows (actor, action, IP/WPT)
--
-- Empty-but-open (no rows today, PUBLIC policies):
--   shifts, manager_approvals
--
-- Root causes: policies created in 027/012/034/032 with NO `TO`
-- clause (defaults to PUBLIC) and/or USING(true), many still
-- carrying INSERT/UPDATE grants for anon.
--
-- Strategy:
--   - DROP the permissive/no-TO policies on each table (they are
--     redundant: the ONLY legitimate access is server-side via
--     getAdminClient() [service_role], which bypasses RLS).
--   - REVOKE base (anon, authenticated) grants so PostgREST does
--     not even expose the endpoints (defense-in-depth, matches
--     migration 061 pattern).
--   - Kick every currently-active staff session so anyone who
--     captured a leaked session id can no longer use it (PIN
--     re-login required; safe for staff, mobile PWA + web).
--
-- Chat tables (staff_messages / staff_conversations /
-- staff_conversation_members) are intentionally NOT modified
-- (RLS identity model requires Supabase Auth -- blocked design);
--   their realtime SELECT policies remain for the staff app.
-- ============================================================

-- ============================================================
-- 1. staff_sessions
-- ============================================================
DROP POLICY IF EXISTS "Staff can read all sessions"            ON public.staff_sessions;
DROP POLICY IF EXISTS "Staff can insert sessions"              ON public.staff_sessions;
DROP POLICY IF EXISTS "Staff can update sessions"              ON public.staff_sessions;
REVOKE ALL ON public.staff_sessions FROM anon, authenticated;

-- ============================================================
-- 2. staff_notifications (027 + 029 policies)
-- ============================================================
DROP POLICY IF EXISTS "Users can view own notifications"       ON public.staff_notifications;
DROP POLICY IF EXISTS "Users can update own notifications"     ON public.staff_notifications;
DROP POLICY IF EXISTS "staff_notifications_select"             ON public.staff_notifications;
DROP POLICY IF EXISTS "staff_notifications_insert"             ON public.staff_notifications;
DROP POLICY IF EXISTS "staff_notifications_update"             ON public.staff_notifications;
REVOKE ALL ON public.staff_notifications FROM anon, authenticated;

-- ============================================================
-- 3. waiters (012 "Admin full access to waiters" = PUBLIC ALL)
-- ============================================================
DROP POLICY IF EXISTS "Admin full access to waiters"           ON public.waiters;
REVOKE ALL ON public.waiters FROM anon, authenticated;

-- ============================================================
-- 4. availability (034: public + anon SELECT; drop, keep
--    authenticated policy untouched for future auth users)
-- ============================================================
DROP POLICY IF EXISTS "Allow public read availability"        ON public.availability;
DROP POLICY IF EXISTS "Allow anon read availability"          ON public.availability;
REVOKE ALL ON public.availability FROM anon;

-- ============================================================
-- 5. shifts, staff_audit_log, manager_approvals (027, no-TO
-- ============================================================
DROP POLICY IF EXISTS "Staff can read all shifts"              ON public.shifts;
DROP POLICY IF EXISTS "Staff can insert shifts"                ON public.shifts;
DROP POLICY IF EXISTS "Staff can update shifts"                ON public.shifts;
REVOKE ALL ON public.shifts FROM anon, authenticated;

DROP POLICY IF EXISTS "Staff can read all audit log"           ON public.staff_audit_log;
DROP POLICY IF EXISTS "Staff can insert audit log"             ON public.staff_audit_log;
REVOKE ALL ON public.staff_audit_log FROM anon, authenticated;

DROP POLICY IF EXISTS "Staff can read all manager approvals"   ON public.manager_approvals;
DROP POLICY IF EXISTS "Staff can insert manager approvals"     ON public.manager_approvals;
REVOKE ALL ON public.manager_approvals FROM anon, authenticated;

-- ============================================================
-- 6. Invalidate currently active staff sessions (session ids
--    may have been exposed anonymously before this migration).
--    Staff simply re-login with their PIN. Idempotent.
-- ============================================================
UPDATE public.staff_sessions
SET    signed_out_at = COALESCE(signed_out_at, now()),
       signed_out_reason = 'security_remediation_063'
WHERE  signed_out_at IS NULL;