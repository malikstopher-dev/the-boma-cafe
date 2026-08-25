-- ============================================================
-- Migration 105: realtime event scope columns (SYNC-1 Ship 4, Option A)
-- ============================================================
-- Owner-approved 2026-08-25 (Option A — minimal): additive
-- scope_type / scope_id on the realtime_events signal table so
-- consumers can subscribe to their own slice instead of receiving
-- every event house-wide.
--
-- Scoped by this migration (Option A):
--   chat.message   -> scope_type='conversation',
--                     scope_id=staff_messages.conversation_id
--   order.created  -> scope_type='station', scope_id=orders.station
--   order.preparing / ready / completed / cancelled -> same station scope
--
-- Deliberately left NULL = global (bookings, stock.moved,
-- po.received, stock.count.updated, stock.low, notification.new).
-- NULL-scope rows match NO scope_id filter, so existing unfiltered
-- subscriptions are completely unaffected.
--
-- HISTORY IMMUTABLE: 080/081/093 objects are replayed here via
-- CREATE OR REPLACE / trigger re-pointing; no applied migration is
-- edited. The generic emit_realtime_event() is untouched — its
-- callers keep emitting NULL-scope rows.

ALTER TABLE public.realtime_events ADD COLUMN IF NOT EXISTS scope_type TEXT;
ALTER TABLE public.realtime_events ADD COLUMN IF NOT EXISTS scope_id TEXT;

CREATE INDEX IF NOT EXISTS idx_realtime_events_scope
  ON public.realtime_events (event_name, scope_id)
  WHERE scope_id IS NOT NULL;

-- ============================================================
-- chat.message with conversation scope (replays 093's binding)
-- ============================================================
CREATE OR REPLACE FUNCTION public.emit_chat_message_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  INSERT INTO public.realtime_events (event_name, table_name, entity_id, scope_type, scope_id)
  VALUES ('chat.message', 'staff_messages', NEW.id, 'conversation', NEW.conversation_id);
  DELETE FROM public.realtime_events
  WHERE created_at < now() - interval '24 hours';
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_realtime_chat_message ON public.staff_messages;
CREATE TRIGGER trg_realtime_chat_message
  AFTER INSERT ON public.staff_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.emit_chat_message_event();

-- ============================================================
-- order.created with station scope (was generic emitter in 080)
-- ============================================================
CREATE OR REPLACE FUNCTION public.emit_order_created_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  INSERT INTO public.realtime_events (event_name, table_name, entity_id, scope_type, scope_id)
  VALUES ('order.created', 'orders', NEW.id, 'station', NEW.station);
  DELETE FROM public.realtime_events
  WHERE created_at < now() - interval '24 hours';
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_realtime_order_created ON public.orders;
CREATE TRIGGER trg_realtime_order_created
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.emit_order_created_event();

-- ============================================================
-- Order status mapper with station scope (replays 080 body + 081's
-- cancelled case, adding the scope columns)
-- ============================================================
CREATE OR REPLACE FUNCTION public.emit_order_status_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_event TEXT;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;
  v_event := CASE NEW.status
    WHEN 'preparing'  THEN 'order.preparing'
    WHEN 'ready'      THEN 'order.ready'
    WHEN 'served'     THEN 'order.completed'
    WHEN 'completed'  THEN 'order.completed'
    WHEN 'cancelled'  THEN 'order.cancelled'
    ELSE NULL
  END;
  IF v_event IS NOT NULL THEN
    INSERT INTO public.realtime_events (event_name, table_name, entity_id, scope_type, scope_id)
    VALUES (v_event, 'orders', NEW.id, 'station', NEW.station);
    DELETE FROM public.realtime_events
    WHERE created_at < now() - interval '24 hours';
  END IF;
  RETURN NEW;
END $$;

NOTIFY pgrst, 'reload schema';
