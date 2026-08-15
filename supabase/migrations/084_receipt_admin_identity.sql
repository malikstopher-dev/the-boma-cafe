-- 084_receipt_admin_identity.sql
-- P1a: every PO receipt permanently records WHO received the stock, using
-- the real E8 admin identity (admin_accounts), not the dead staff_profiles FK.
--
-- Additive only:
--   - inventory_po_receipts.received_by_admin_id   UUID REFERENCES admin_accounts(id)
--   - inventory_po_receipts.received_by_admin_name TEXT
-- Historical receipts are NOT touched (received_by_admin_id stays NULL for
-- past rows by design; "who" for those remains in admin_audit_log).
--
-- Also replays receive_purchase_order (074) with two NEW trailing params
-- (p_received_by_admin_id, p_received_by_admin_name). Ledger behaviour,
-- validation messages and the dead staff_profiles received_by column are
-- all unchanged. Because the function signature changes, the REVOKE/GRANT
-- must be re-issued for the new signature.

ALTER TABLE public.inventory_po_receipts
  ADD COLUMN IF NOT EXISTS received_by_admin_id UUID REFERENCES admin_accounts(id),
  ADD COLUMN IF NOT EXISTS received_by_admin_name TEXT;

CREATE INDEX IF NOT EXISTS idx_po_receipts_received_by_admin
  ON public.inventory_po_receipts (received_by_admin_id);

CREATE OR REPLACE FUNCTION public.receive_purchase_order(
  p_po_id                 UUID,
  p_invoice_number        TEXT DEFAULT NULL,
  p_notes                 TEXT DEFAULT NULL,
  p_received_by           UUID DEFAULT NULL,
  p_cost_centre_id        UUID DEFAULT NULL,
  p_items                 JSONB DEFAULT NULL,
  p_received_by_admin_id  UUID DEFAULT NULL,
  p_received_by_admin_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_po_status          TEXT;
  v_receipt_id         UUID;
  v_txn_ids            UUID[] := '{}'::UUID[];
  v_status             TEXT;
  v_cc                 UUID;
  v_qty                NUMERIC;
  v_el                 JSONB;
  v_po_item_id         UUID;
  v_po_item_loc        UUID;
  v_po_item_received   NUMERIC;
  v_po_item_cost       NUMERIC;
  v_receipt_unit_cost  NUMERIC;
  v_txn_id             UUID;
  v_balance            NUMERIC;
  v_notes              TEXT;
  v_all_received       BOOLEAN;
BEGIN
  -- Lock + validate the PO (row lock serializes concurrent receives)
  SELECT status INTO v_po_status
    FROM public.inventory_purchase_orders
   WHERE id = p_po_id
   FOR UPDATE;

  IF v_po_status IS NULL THEN
    RAISE EXCEPTION 'Purchase order not found';
  END IF;
  IF v_po_status NOT IN ('ordered', 'partial') THEN
    RAISE EXCEPTION 'Cannot receive items for PO with status %', v_po_status;
  END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'At least one receipt item is required';
  END IF;

  -- Receipt header (admin identity from the server context, never the client)
  INSERT INTO public.inventory_po_receipts
    (po_id, invoice_number, notes, received_by, received_by_admin_id, received_by_admin_name)
  VALUES
    (p_po_id, p_invoice_number, p_notes, p_received_by, p_received_by_admin_id, p_received_by_admin_name)
  RETURNING id INTO v_receipt_id;

  v_notes := 'PO receipt: ' || COALESCE(NULLIF(p_invoice_number, ''), 'no invoice');

  FOR v_el IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    IF v_el->>'quantity_received' IS NULL OR jsonb_typeof(v_el->'quantity_received') IS DISTINCT FROM 'number' THEN
      RAISE EXCEPTION 'Each item requires po_item_id, product_id, and quantity_received';
    END IF;

    v_qty := (v_el->>'quantity_received')::NUMERIC;
    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'quantity_received must be positive, got %', v_qty;
    END IF;

    -- The line must belong to the PO (engine key: po_item_id :: product_id)
    SELECT poi.id, poi.location_id, poi.quantity_received, poi.unit_cost
      INTO v_po_item_id, v_po_item_loc, v_po_item_received, v_po_item_cost
      FROM public.inventory_purchase_order_items poi
     WHERE poi.id = (v_el->>'po_item_id')::UUID
       AND poi.product_id = (v_el->>'product_id')::UUID
       AND poi.po_id = p_po_id;

    IF v_po_item_id IS NULL THEN
      RAISE EXCEPTION 'Item (po_item_id=%, product_id=%) does not belong to PO %',
        v_el->>'po_item_id', v_el->>'product_id', p_po_id;
    END IF;

    -- Cost centre: explicit (validated) wins, else the location's.
    -- Messages mirror resolveCostCentreId() so the route can map them.
    IF p_cost_centre_id IS NOT NULL THEN
      IF NOT EXISTS (SELECT 1 FROM public.cost_centres WHERE id = p_cost_centre_id AND is_active) THEN
        RAISE EXCEPTION 'Cost centre % does not exist or is not active', p_cost_centre_id;
      END IF;
      v_cc := p_cost_centre_id;
    ELSE
      SELECT cost_centre_id INTO v_cc FROM public.inventory_locations WHERE id = v_po_item_loc;
      IF v_cc IS NULL THEN
        RAISE EXCEPTION 'No cost centre could be determined for location %. Assign a cost centre to this location before recording stock movements.', v_po_item_loc;
      END IF;
    END IF;

    -- Product / location validation (ledger parity)
    IF NOT EXISTS (SELECT 1 FROM public.inventory_products WHERE id = (v_el->>'product_id')::UUID) THEN
      RAISE EXCEPTION 'Product not found: %', v_el->>'product_id';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.inventory_locations WHERE id = v_po_item_loc AND is_active) THEN
      RAISE EXCEPTION 'Location not found: %', v_po_item_loc;
    END IF;

    -- Receipt line
    v_receipt_unit_cost := NULLIF(v_el->>'unit_cost', '')::NUMERIC;
    INSERT INTO public.inventory_po_receipt_items (receipt_id, po_item_id, product_id, quantity_received, unit_cost)
    VALUES (v_receipt_id, v_po_item_id, (v_el->>'product_id')::UUID, v_qty, v_receipt_unit_cost);

    -- Ledger movement ('purchase' = increase, positive)
    INSERT INTO public.inventory_transactions
      (product_id, location_id, transaction_type, quantity, unit_cost,
       cost_centre_id, reason_type, reason_notes, manager_note, note_author,
       reference_type, reference_id, performed_by, notes, import_batch_id)
    VALUES
      ((v_el->>'product_id')::UUID, v_po_item_loc, 'purchase', v_qty, v_receipt_unit_cost,
       v_cc, NULL, NULL, NULL, NULL,
       'purchase_order', p_po_id, p_received_by, v_notes, NULL)
    RETURNING id INTO v_txn_id;

    v_txn_ids := array_append(v_txn_ids, v_txn_id);

    INSERT INTO public.inventory_audit_log (table_name, record_id, action, changes, performed_by)
    VALUES ('inventory_transactions', v_txn_id, 'created',
      jsonb_build_object(
        'product_id', (v_el->>'product_id')::UUID,
        'location_id', v_po_item_loc,
        'transaction_type', 'purchase',
        'quantity', v_qty,
        'cost_centre_id', v_cc,
        'reason_type', NULL,
        'reference_type', 'purchase_order',
        'reference_id', p_po_id
      ),
      p_received_by);

    -- Balance cache upsert (ledger stays authoritative; cache is derived)
    SELECT COALESCE(SUM(quantity), 0) INTO v_balance
      FROM public.inventory_transactions
     WHERE product_id = (v_el->>'product_id')::UUID AND location_id = v_po_item_loc;

    INSERT INTO public.inventory_product_balances (product_id, location_id, balance, refreshed_at)
    VALUES ((v_el->>'product_id')::UUID, v_po_item_loc, v_balance, NOW())
    ON CONFLICT (product_id, location_id) DO UPDATE
      SET balance = EXCLUDED.balance, refreshed_at = EXCLUDED.refreshed_at;

    -- PO line: accumulate received quantity; cost only overridden when given
    UPDATE public.inventory_purchase_order_items
       SET quantity_received = v_po_item_received + v_qty,
           unit_cost = COALESCE(v_receipt_unit_cost, v_po_item_cost)
     WHERE id = v_po_item_id;
  END LOOP;

  -- Status: received only when every line is fully received
  SELECT COALESCE(bool_and(quantity_received >= quantity_ordered), FALSE)
    INTO v_all_received
    FROM public.inventory_purchase_order_items
   WHERE po_id = p_po_id;

  v_status := CASE WHEN v_all_received THEN 'received' ELSE 'partial' END;

  IF v_status = 'received' THEN
    UPDATE public.inventory_purchase_orders
       SET status = v_status, received_at = NOW(), updated_at = NOW()
     WHERE id = p_po_id;
  ELSE
    UPDATE public.inventory_purchase_orders
       SET status = v_status, updated_at = NOW()
     WHERE id = p_po_id;
  END IF;

  RETURN jsonb_build_object(
    'receipt_id', v_receipt_id,
    'transaction_ids', to_jsonb(v_txn_ids),
    'status', v_status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.receive_purchase_order(UUID, TEXT, TEXT, UUID, UUID, JSONB, UUID, TEXT)
  FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.receive_purchase_order(UUID, TEXT, TEXT, UUID, UUID, JSONB, UUID, TEXT)
      TO service_role;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';