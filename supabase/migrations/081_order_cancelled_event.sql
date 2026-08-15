-- ============================================================
-- Migration 081: order.cancelled realtime event (E1-2)
-- ============================================================
-- E1-2 makes the waiter PWA react to order cancellation in real
-- time. The E1-1 emitter deliberately mapped status='cancelled' to
-- NULL (no event), so the waiter's only cancellation signal was the
-- 30-second sibling poll.
--
-- Approved additive contract change (E1-2 mission): status='cancelled'
-- now emits `order.cancelled`. Backward compatible — no consumer read
-- this event before; it only fires on a status that previously emitted
-- nothing. The other order events (preparing/ready/completed) are
-- unchanged, and served still completes.

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
    INSERT INTO public.realtime_events (event_name, table_name, entity_id)
    VALUES (v_event, 'orders', NEW.id);
    DELETE FROM public.realtime_events
    WHERE created_at < now() - interval '24 hours';
  END IF;
  RETURN NEW;
END $$;

NOTIFY pgrst, 'reload schema';