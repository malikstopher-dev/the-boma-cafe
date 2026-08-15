-- ============================================================
-- Migration 093: chat.message + notification.new events (E1-5)
-- ============================================================
-- E1-5 fixes dead anon realtime on staff chat + staff notifications.
-- staff_messages and staff_notifications are RLS-blocked for the anon
-- browser key (policies require app.staff_user_id), so postgres_changes
-- on those tables delivers NOTHING to the browser (E1-A audit finding).
--
-- This migration is additive: it funnels those tables through the
-- existing anon-readable realtime_events signal table (migration 080)
-- using the SAME generic emitter (emit_realtime_event). Payloads stay
-- minimal (event_name, table_name, entity_id, created_at) — message
-- content and notification text never leave the database (E1-5
-- principle); consumers refetch or fetch-by-id.
--
-- Note: the 080 stock.low trigger on staff_notifications stays. A
-- low/out-of-stock alert insert now emits BOTH stock.low (080) and
-- notification.new (this migration) — different consumers, both
-- debounced, no conflict.

-- chat.message — every staff message row (text or voice)
DROP TRIGGER IF EXISTS trg_realtime_chat_message ON public.staff_messages;
CREATE TRIGGER trg_realtime_chat_message
  AFTER INSERT ON public.staff_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.emit_realtime_event('chat.message', 'staff_messages');

-- notification.new — every staff notification (new_message, low stock, ...)
DROP TRIGGER IF EXISTS trg_realtime_notification_new ON public.staff_notifications;
CREATE TRIGGER trg_realtime_notification_new
  AFTER INSERT ON public.staff_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.emit_realtime_event('notification.new', 'staff_notifications');

NOTIFY pgrst, 'reload schema';