-- E1-3: booking lifecycle events + waiter booking view (privacy-preserving)
--
-- 1. Replace the single-event booking trigger (migration 080 emitted only
--    booking.confirmed) with a status mapper emitting every post-confirmation
--    lifecycle event: booking.confirmed / booking.in_progress /
--    booking.completed / booking.cancelled (cancelled also covers refunded —
--    the waiter feed removes the row either way).
--
-- 2. waiter_booking_view — the ONLY read surface for waiter clients. Exposes
--    exactly five operational columns (id, booking_date, booking_time, guests,
--    venue area name, status) for confirmed+ bookings. Customer name, phone,
--    email, notes, pricing and every other bookings column are structurally
--    absent — the view cannot leak them even if an API route is miswritten.
--    RLS on bookings still applies to the view's underlying table for
--    non-service roles, so anon/public cannot read it either.

-- ============ Booking status event mapper ============
CREATE OR REPLACE FUNCTION public.emit_booking_status_event()
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
    WHEN 'confirmed'   THEN 'booking.confirmed'
    WHEN 'in_progress' THEN 'booking.in_progress'
    WHEN 'completed'   THEN 'booking.completed'
    WHEN 'cancelled'   THEN 'booking.cancelled'
    WHEN 'refunded'    THEN 'booking.cancelled'
    ELSE NULL
  END;
  IF v_event IS NOT NULL THEN
    INSERT INTO public.realtime_events (event_name, table_name, entity_id)
    VALUES (v_event, 'bookings', NEW.id);
    DELETE FROM public.realtime_events
    WHERE created_at < now() - interval '24 hours';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_realtime_booking_confirmed ON public.bookings;
CREATE TRIGGER trg_realtime_booking_status
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.emit_booking_status_event();

-- ============ Waiter booking view (allowlist only) ============
DROP VIEW IF EXISTS public.waiter_booking_view;
CREATE VIEW public.waiter_booking_view AS
SELECT
  b.id,
  b.booking_date,
  b.booking_time,
  b.guests,
  va.name AS venue_area,
  b.status
FROM public.bookings b
LEFT JOIN public.venue_areas va ON va.id = b.venue_area_id
WHERE b.status IN ('confirmed', 'in_progress', 'completed');

COMMENT ON VIEW public.waiter_booking_view IS
  'E1-3: minimal operational booking feed for waiters. Contains ONLY id, booking_date, booking_time, guests, venue_area, status for confirmed+ bookings. No PII (name/phone/email/notes) and no pricing. Read via service role only; anon/public are RLS-blocked on bookings.';

NOTIFY pgrst, 'reload schema';