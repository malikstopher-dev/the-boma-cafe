-- ============================================================
-- Migration 080: Realtime event signal table (E1-1)
-- ============================================================
-- E1-1 replaces polling with realtime refresh for admin surfaces.
-- Transport stays Supabase Realtime (postgres_changes) — no new
-- framework or event bus.
--
-- Why a signal table instead of subscribing to the source tables:
--   * The browser realtime client is the ANON key (admin/staff auth is
--     cookie/PIN based — no Supabase Auth session). Anon is RLS-blocked
--     on orders, bookings, staff_messages and staff_notifications
--     (policies require auth.jwt() role or app.staff_user_id), so
--     postgres_changes on those tables delivers NOTHING to the browser.
--   * inventory_* tables have no RLS, so they are readable — but a
--     uniform, minimal signal is cleaner and safer than watching six
--     tables with mixed payload sizes.
--
-- Every event funnels through ONE anon-readable table whose payload is
-- ONLY (event_name, table_name, entity_id, created_at). No customer
-- PII, prices, deposits, admin notes or internal fields ever leave the
-- database in a realtime payload (E1-5 security principle).
--
-- Writes happen ONLY from SECURITY DEFINER triggers fired on the source
-- tables: anon/public/authenticated are REVOKEd from everything except
-- SELECT, so anonymous clients can never forge events, and public
-- INSERT flows (orders/bookings) cannot be broken by the trigger
-- writing as the anon role.

-- ============ Signal table ============
CREATE TABLE IF NOT EXISTS public.realtime_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_name TEXT NOT NULL,
  table_name TEXT NOT NULL,
  entity_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_realtime_events_created_at
  ON public.realtime_events (created_at DESC);

ALTER TABLE public.realtime_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "realtime_events_read" ON public.realtime_events;
CREATE POLICY "realtime_events_read"
  ON public.realtime_events FOR SELECT
  TO anon, public, authenticated
  USING (true);

REVOKE ALL ON public.realtime_events FROM anon, public, authenticated;
GRANT SELECT ON public.realtime_events TO anon, public, authenticated;
GRANT ALL ON public.realtime_events TO service_role;

-- Publish to the Realtime publication (idempotent; guarded in case the
-- publication does not exist on a non-Supabase deployment).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'realtime_events'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.realtime_events;
    END IF;
  END IF;
END $$;

-- ============ Emitter functions ============
-- Generic emitter. SECURITY DEFINER: runs as the function owner
-- (postgres), so it can write the signal even when the triggering
-- statement ran as anon (public order/booking inserts).
-- Prunes events older than 24h on every emit (cheap with the index;
-- event volume is tens/hour at cafe scale).
CREATE OR REPLACE FUNCTION public.emit_realtime_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  INSERT INTO public.realtime_events (event_name, table_name, entity_id)
  VALUES (TG_ARGV[0], TG_ARGV[1], NEW.id);
  DELETE FROM public.realtime_events
  WHERE created_at < now() - interval '24 hours';
  RETURN NEW;
END $$;

-- Order status mapper: event name depends on NEW.status.
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

-- ============ Triggers (event contract) ============
-- order.created — order placed from any source (online, waiter, POS)
DROP TRIGGER IF EXISTS trg_realtime_order_created ON public.orders;
CREATE TRIGGER trg_realtime_order_created
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.emit_realtime_event('order.created', 'orders');

-- order.preparing / order.ready / order.completed (served completes too)
DROP TRIGGER IF EXISTS trg_realtime_order_status ON public.orders;
CREATE TRIGGER trg_realtime_order_status
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.emit_order_status_event();

-- booking.confirmed — the trigger is MANAGER confirmation, not creation
DROP TRIGGER IF EXISTS trg_realtime_booking_confirmed ON public.bookings;
CREATE TRIGGER trg_realtime_booking_confirmed
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW
  WHEN (NEW.status = 'confirmed')
  EXECUTE FUNCTION public.emit_realtime_event('booking.confirmed', 'bookings');

-- po.received — receiving moves the PO to partial or received
DROP TRIGGER IF EXISTS trg_realtime_po_received ON public.inventory_purchase_orders;
CREATE TRIGGER trg_realtime_po_received
  AFTER UPDATE OF status ON public.inventory_purchase_orders
  FOR EACH ROW
  WHEN (NEW.status IN ('partial', 'received'))
  EXECUTE FUNCTION public.emit_realtime_event('po.received', 'inventory_purchase_orders');

-- stock.moved — every ledger movement (purchase/sale/waste/count/transfer/gas)
DROP TRIGGER IF EXISTS trg_realtime_stock_moved ON public.inventory_transactions;
CREATE TRIGGER trg_realtime_stock_moved
  AFTER INSERT ON public.inventory_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.emit_realtime_event('stock.moved', 'inventory_transactions');

-- stock.count.updated — daily session create / submit / approve / cancel
DROP TRIGGER IF EXISTS trg_realtime_stock_count ON public.inventory_stock_counts;
CREATE TRIGGER trg_realtime_stock_count
  AFTER INSERT OR UPDATE ON public.inventory_stock_counts
  FOR EACH ROW
  EXECUTE FUNCTION public.emit_realtime_event('stock.count.updated', 'inventory_stock_counts');

-- stock.low — low/out-of-stock alert rows (admin user convention)
DROP TRIGGER IF EXISTS trg_realtime_stock_low ON public.staff_notifications;
CREATE TRIGGER trg_realtime_stock_low
  AFTER INSERT ON public.staff_notifications
  FOR EACH ROW
  WHEN (NEW.type IN ('inventory_low_stock', 'inventory_out_of_stock'))
  EXECUTE FUNCTION public.emit_realtime_event('stock.low', 'staff_notifications');

NOTIFY pgrst, 'reload schema';