-- Migration 108: Atomic public booking submission and availability release.
--
-- The public submit route prepares validated pricing/display data, then this
-- service-role-only function owns every durable write. Availability tables are
-- locked for the final conflict check so concurrent submissions cannot both
-- reserve the same area and time range.

CREATE OR REPLACE FUNCTION public.submit_booking_atomic(
  p_booking JSONB,
  p_calculation JSONB,
  p_access_token TEXT,
  p_valid_until DATE,
  p_job_payload JSONB,
  p_idempotency_key TEXT,
  p_portal_base_url TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_existing_job public.background_jobs%ROWTYPE;
  v_job_result RECORD;
  v_job_payload JSONB;
  v_customer_id UUID;
  v_booking_id UUID;
  v_quote_id UUID;
  v_quote_number TEXT;
  v_quote_sequence INT;
  v_area public.venue_areas%ROWTYPE;
  v_item JSONB;
  v_guest_count INT;
  v_duration NUMERIC;
  v_booking_date DATE;
  v_start_time TIME;
  v_end_time TIME;
  v_year INT := EXTRACT(YEAR FROM CURRENT_DATE)::INT;
BEGIN
  IF p_booking IS NULL
     OR p_calculation IS NULL
     OR p_job_payload IS NULL
     OR NULLIF(BTRIM(p_access_token), '') IS NULL
     OR NULLIF(BTRIM(p_idempotency_key), '') IS NULL
     OR p_valid_until IS NULL THEN
    RAISE EXCEPTION 'BOOKING_INVALID_INPUT: required submission data is missing'
      USING ERRCODE = '22023';
  END IF;

  -- Exact-request retries serialize on the idempotency key before any read or
  -- write. Existing durable jobs always point to the original booking/quote.
  PERFORM pg_advisory_xact_lock(hashtextextended('booking-submit:' || p_idempotency_key, 0));

  SELECT * INTO v_existing_job
  FROM public.background_jobs
  WHERE idempotency_key = p_idempotency_key
  LIMIT 1
  FOR UPDATE;

  IF v_existing_job.id IS NOT NULL THEN
    IF NULLIF(v_existing_job.payload->>'bookingReference', '') IS NULL
       OR NULLIF(v_existing_job.payload->>'quoteId', '') IS NULL
       OR NULLIF(v_existing_job.payload->>'quoteNumber', '') IS NULL THEN
      RAISE EXCEPTION 'BOOKING_IDEMPOTENCY_CORRUPT: prior submission payload is incomplete';
    END IF;

    -- Failed/dead/cancelled work is requeued against the SAME business rows.
    -- Pending/processing/completed work is returned idempotently by the queue.
    SELECT q.id, q.status, q.outcome
      INTO v_job_result
    FROM public.enqueue_background_job(
      'pdf_generation',
      v_existing_job.payload,
      p_idempotency_key,
      1,
      3,
      NOW()
    ) AS q;

    RETURN jsonb_build_object(
      'booking_id', v_existing_job.payload->>'bookingReference',
      'quote_id', v_existing_job.payload->>'quoteId',
      'quote_number', v_existing_job.payload->>'quoteNumber',
      'job_id', v_job_result.id,
      'job_outcome', v_job_result.outcome,
      'job_payload', v_existing_job.payload,
      'duplicate', TRUE
    );
  END IF;

  BEGIN
    v_guest_count := (p_booking->>'adults')::INT + (p_booking->>'children')::INT;
    v_duration := (p_booking->>'duration_hours')::NUMERIC;
    v_booking_date := (p_booking->>'booking_date')::DATE;
    v_start_time := (p_booking->>'booking_time')::TIME;
    v_end_time := v_start_time + make_interval(secs => (v_duration * 3600)::INT);
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'BOOKING_INVALID_INPUT: invalid booking date, time, guests, or duration'
      USING ERRCODE = '22023';
  END;

  IF v_guest_count < 1 OR v_duration < 1 OR v_end_time <= v_start_time THEN
    RAISE EXCEPTION 'BOOKING_INVALID_INPUT: invalid guests or time range'
      USING ERRCODE = '22023';
  END IF;

  -- SHARE blocks concurrent blocked-date writes. SHARE ROW EXCLUSIVE blocks
  -- every availability INSERT/UPDATE/DELETE and serializes this final check.
  -- The locks are held through booking, quote, hold, audit, and job creation.
  LOCK TABLE public.blocked_dates IN SHARE MODE;
  LOCK TABLE public.availability IN SHARE ROW EXCLUSIVE MODE;

  SELECT * INTO v_area
  FROM public.venue_areas
  WHERE id = (p_booking->>'venue_area_id')::UUID
    AND is_active = TRUE
  FOR UPDATE;

  IF v_area.id IS NULL THEN
    RAISE EXCEPTION 'BOOKING_INVALID_AREA: venue area is unavailable'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_guest_count < v_area.capacity_min OR v_guest_count > v_area.capacity_max THEN
    RAISE EXCEPTION 'BOOKING_UNAVAILABLE: guest count is outside the venue capacity'
      USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.blocked_dates bd
    WHERE bd.start_date <= v_booking_date
      AND bd.end_date >= v_booking_date
      AND (bd.venue_area_id IS NULL OR bd.venue_area_id = v_area.id)
  ) THEN
    RAISE EXCEPTION 'BOOKING_UNAVAILABLE: venue area is blocked on this date'
      USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.availability a
    WHERE a.venue_area_id = v_area.id
      AND a.booking_date = v_booking_date
      AND a.start_time < v_end_time
      AND a.end_time > v_start_time
  ) THEN
    RAISE EXCEPTION 'BOOKING_UNAVAILABLE: venue area is already booked during this time'
      USING ERRCODE = 'P0001';
  END IF;

  -- Avoid duplicate customer rows when concurrent requests use the same email.
  PERFORM pg_advisory_xact_lock(hashtextextended('booking-customer:' || LOWER(p_booking->>'email'), 0));

  SELECT id INTO v_customer_id
  FROM public.customers
  WHERE LOWER(email) = LOWER(p_booking->>'email')
  ORDER BY created_at, id
  LIMIT 1
  FOR UPDATE;

  IF v_customer_id IS NULL THEN
    INSERT INTO public.customers (name, phone, email, company)
    VALUES (
      p_booking->>'name',
      p_booking->>'phone',
      p_booking->>'email',
      NULLIF(p_booking->>'company', '')
    )
    RETURNING id INTO v_customer_id;
  END IF;

  INSERT INTO public.bookings (
    customer_id,
    booking_type_id,
    venue_area_id,
    duration_hours,
    adults,
    children,
    special_requests,
    source,
    name,
    phone,
    email,
    booking_date,
    booking_time,
    guests,
    notes,
    status
  ) VALUES (
    v_customer_id,
    (p_booking->>'booking_type_id')::UUID,
    v_area.id,
    v_duration,
    (p_booking->>'adults')::INT,
    (p_booking->>'children')::INT,
    NULLIF(p_booking->>'special_requests', ''),
    'web',
    p_booking->>'name',
    p_booking->>'phone',
    p_booking->>'email',
    v_booking_date,
    v_start_time,
    v_guest_count,
    NULLIF(p_booking->>'special_requests', ''),
    'draft'
  ) RETURNING id INTO v_booking_id;

  -- Quote numbering is generated under a year-scoped transaction lock. The
  -- old process-local sequence could collide across Vercel instances.
  PERFORM pg_advisory_xact_lock(hashtextextended('booking-quote-number:' || v_year::TEXT, 0));

  SELECT COALESCE(MAX(substring(q.quote_number FROM '([0-9]+)$')::INT), 0) + 1
    INTO v_quote_sequence
  FROM public.quotes q
  WHERE q.quote_number LIKE 'BMC-' || v_year::TEXT || '-%'
    AND q.quote_number ~ ('^BMC-' || v_year::TEXT || '-[0-9]+$');

  v_quote_number := 'BMC-' || v_year::TEXT || '-' || LPAD(v_quote_sequence::TEXT, 4, '0');

  INSERT INTO public.quotes (
    booking_id,
    quote_number,
    status,
    subtotal,
    tax_rate,
    tax_amount,
    total,
    deposit_percentage,
    deposit_amount,
    balance_amount,
    validity_days,
    valid_until,
    access_token
  ) VALUES (
    v_booking_id,
    v_quote_number,
    'draft',
    (p_calculation->>'subtotal')::NUMERIC,
    (p_calculation->>'tax_rate')::NUMERIC,
    (p_calculation->>'tax_amount')::NUMERIC,
    (p_calculation->>'total')::NUMERIC,
    (p_calculation->>'deposit_percentage')::NUMERIC,
    (p_calculation->>'deposit_amount')::NUMERIC,
    (p_calculation->>'balance_amount')::NUMERIC,
    GREATEST(1, p_valid_until - CURRENT_DATE),
    p_valid_until,
    p_access_token
  ) RETURNING id INTO v_quote_id;

  IF jsonb_typeof(p_calculation->'line_items') <> 'array'
     OR jsonb_array_length(p_calculation->'line_items') = 0 THEN
    RAISE EXCEPTION 'BOOKING_INVALID_INPUT: quotation has no line items'
      USING ERRCODE = '22023';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_calculation->'line_items') LOOP
    INSERT INTO public.quote_items (
      quote_id,
      item_type,
      reference_id,
      label,
      description,
      quantity,
      unit_price,
      total_price,
      sort_order
    ) VALUES (
      v_quote_id,
      v_item->>'item_type',
      NULLIF(v_item->>'reference_id', '')::UUID,
      v_item->>'label',
      NULLIF(v_item->>'description', ''),
      (v_item->>'quantity')::INT,
      (v_item->>'unit_price')::NUMERIC,
      (v_item->>'total')::NUMERIC,
      COALESCE((v_item->>'sort_order')::INT, 0)
    );
  END LOOP;

  UPDATE public.bookings
  SET quote_id = v_quote_id,
      status = 'quote_sent'
  WHERE id = v_booking_id;

  INSERT INTO public.availability (
    venue_area_id,
    booking_id,
    booking_date,
    start_time,
    end_time,
    guest_count,
    status
  ) VALUES (
    v_area.id,
    v_booking_id,
    v_booking_date,
    v_start_time,
    v_end_time,
    v_guest_count,
    'tentative'
  );

  INSERT INTO public.booking_status_history (
    booking_id,
    previous_status,
    new_status,
    changed_by,
    reason
  ) VALUES (
    v_booking_id,
    NULL,
    'quote_sent',
    'system',
    'Booking submitted via website'
  );

  v_job_payload := p_job_payload || jsonb_build_object(
    'quoteId', v_quote_id,
    'quoteNumber', v_quote_number,
    'bookingReference', v_booking_id,
    'portalUrl', RTRIM(p_portal_base_url, '/') || '/' || v_quote_number || '?token=' || p_access_token
  );

  SELECT q.id, q.status, q.outcome
    INTO v_job_result
  FROM public.enqueue_background_job(
    'pdf_generation',
    v_job_payload,
    p_idempotency_key,
    1,
    3,
    NOW()
  ) AS q;

  IF v_job_result.id IS NULL THEN
    RAISE EXCEPTION 'BOOKING_JOB_FAILED: background job was not created';
  END IF;

  RETURN jsonb_build_object(
    'booking_id', v_booking_id,
    'quote_id', v_quote_id,
    'quote_number', v_quote_number,
    'job_id', v_job_result.id,
    'job_outcome', v_job_result.outcome,
    'job_payload', v_job_payload,
    'duplicate', FALSE
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_booking_atomic(JSONB, JSONB, TEXT, DATE, JSONB, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_booking_atomic(JSONB, JSONB, TEXT, DATE, JSONB, TEXT, TEXT)
  TO service_role;

-- Cancellation/refund releases the venue hold in the SAME transaction as the
-- canonical status update, regardless of which server-side writer performs it.
CREATE OR REPLACE FUNCTION public.release_booking_availability_on_terminal_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.status IN ('cancelled', 'refunded') AND OLD.status IS DISTINCT FROM NEW.status THEN
    DELETE FROM public.availability WHERE booking_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.release_booking_availability_on_terminal_status()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_release_booking_availability ON public.bookings;
CREATE TRIGGER trg_release_booking_availability
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.release_booking_availability_on_terminal_status();

NOTIFY pgrst, 'reload schema';
