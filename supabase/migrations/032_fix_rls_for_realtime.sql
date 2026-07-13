-- ============================================================
-- Migration 032: Fix RLS for browser-side Realtime
-- 
-- The RLS policies from migration 029 use current_setting('app.staff_user_id', true)
-- which is never set by the Supabase client (anon key). This blocks Realtime events.
--
-- Fix: Make SELECT policies permissive (USING true) since:
-- 1. API routes (admin client) handle all authorization logic
-- 2. Realtime only needs SELECT to detect new inserts
-- 3. Actual message data is loaded via API, not direct Supabase queries
--
-- INSERT/UPDATE policies remain restrictive for defense-in-depth.
-- ============================================================

-- Drop restrictive SELECT policies
DROP POLICY IF EXISTS "staff_messages_select" ON staff_messages;
DROP POLICY IF EXISTS "staff_conversations_select" ON staff_conversations;
DROP POLICY IF EXISTS "staff_conversation_members_select" ON staff_conversation_members;
DROP POLICY IF EXISTS "staff_notifications_select" ON staff_notifications;

-- Create permissive SELECT policies for Realtime
CREATE POLICY "staff_messages_select" ON staff_messages
  FOR SELECT USING (true);

CREATE POLICY "staff_conversations_select" ON staff_conversations
  FOR SELECT USING (true);

CREATE POLICY "staff_conversation_members_select" ON staff_conversation_members
  FOR SELECT USING (true);

CREATE POLICY "staff_notifications_select" ON staff_notifications
  FOR SELECT USING (true);
