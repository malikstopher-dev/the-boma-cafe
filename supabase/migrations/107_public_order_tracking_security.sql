-- Batch 1 / C-01: public order tracking proof and atomic cancellation.
-- Human-readable order_ref remains display-only. The raw tracking token is
-- returned once by the order-creation API; only its SHA-256 hash is stored.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tracking_token_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_tracking_token_hash
  ON public.orders (tracking_token_hash)
  WHERE tracking_token_hash IS NOT NULL;

COMMENT ON COLUMN public.orders.tracking_token_hash IS
  'SHA-256 hash of the customer tracking token. Never return this column from API DTOs.';

CREATE OR REPLACE FUNCTION public.cancel_public_order(
  p_order_id UUID,
  p_expected_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  SELECT *
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('outcome', 'not_found');
  END IF;

  IF v_order.status IS DISTINCT FROM p_expected_status THEN
    RETURN jsonb_build_object('outcome', 'conflict', 'status', v_order.status);
  END IF;

  IF v_order.status NOT IN ('pending', 'confirmed') THEN
    RETURN jsonb_build_object('outcome', 'not_allowed', 'status', v_order.status);
  END IF;

  IF v_order.payment_status = 'paid' THEN
    RETURN jsonb_build_object('outcome', 'paid', 'status', v_order.status);
  END IF;

  UPDATE public.orders
  SET status = 'cancelled'
  WHERE id = v_order.id
    AND status = p_expected_status;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('outcome', 'conflict');
  END IF;

  INSERT INTO public.order_events (
    order_id,
    event_type,
    from_status,
    to_status,
    created_by,
    metadata
  ) VALUES (
    v_order.id,
    'ORDER_CANCELLED',
    v_order.status,
    'cancelled',
    'customer',
    jsonb_build_object('source', 'public_tracking')
  );

  RETURN jsonb_build_object('outcome', 'cancelled', 'status', 'cancelled');
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_public_order(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_public_order(UUID, TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';
