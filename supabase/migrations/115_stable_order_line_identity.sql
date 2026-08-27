-- 115_stable_order_line_identity.sql
-- H-12: preserve duplicate/customized lines and block required unmatched stock.

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS source_line_id TEXT,
  ADD COLUMN IF NOT EXISTS source_type TEXT CHECK (source_type IN ('menu_item', 'bar_item', 'legacy')),
  ADD COLUMN IF NOT EXISTS source_item_id UUID,
  ADD COLUMN IF NOT EXISTS inventory_required BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reconciliation_status TEXT NOT NULL DEFAULT 'not_required'
    CHECK (reconciliation_status IN ('matched', 'not_required', 'requires_mapping'));

UPDATE public.order_items
SET source_line_id = 'legacy-existing:' || id::TEXT,
    source_type = COALESCE(source_type, 'legacy'),
    reconciliation_status = CASE
      WHEN product_id IS NOT NULL THEN 'matched'
      ELSE 'not_required'
    END
WHERE source_line_id IS NULL;

ALTER TABLE public.order_items
  ALTER COLUMN source_line_id SET NOT NULL;

ALTER TABLE public.order_items
  DROP CONSTRAINT IF EXISTS order_items_order_id_item_name_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_order_items_source_line
  ON public.order_items(order_id, source_line_id);

CREATE INDEX IF NOT EXISTS idx_order_items_reconciliation
  ON public.order_items(order_id, reconciliation_status)
  WHERE reconciliation_status = 'requires_mapping';

CREATE OR REPLACE FUNCTION public.deduct_order_items_v2(
  p_order_id UUID,
  p_location_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_status TEXT;
  v_unmatched TEXT;
BEGIN
  SELECT status INTO v_status
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id USING ERRCODE = 'P0002';
  END IF;

  SELECT string_agg(item_name || ' [' || source_line_id || ']', ', ' ORDER BY created_at, id)
    INTO v_unmatched
  FROM public.order_items
  WHERE order_id = p_order_id
    AND inventory_required = TRUE
    AND product_id IS NULL;

  IF v_unmatched IS NOT NULL THEN
    RAISE EXCEPTION 'Order item reconciliation required before deduction: %', v_unmatched
      USING ERRCODE = 'P0001';
  END IF;

  RETURN public.deduct_order_items(p_order_id, p_location_id);
END;
$$;

REVOKE ALL ON FUNCTION public.deduct_order_items(UUID, UUID)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.deduct_order_items_v2(UUID, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_order_items_v2(UUID, UUID)
  TO service_role;

NOTIFY pgrst, 'reload schema';
