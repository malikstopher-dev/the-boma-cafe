-- 088_auto_invoice_on_receive.sql
-- P1d: receiving a PO automatically creates the supplier invoice so
-- Payables immediately reflects what is owed.
--
-- Part 1 (additive DDL):
--   - UNIQUE partial index on inventory_supplier_invoices.receipt_id
--     (one receipt -> one invoice; retries can never create duplicates;
--     historical invoices without a receipt stay untouched).
--   - The receipt_id column itself already exists (migration 064).
--
-- Part 2: replays receive_purchase_order (087's 8-arg signature) to create
-- the invoice inside the same transaction, AFTER the items loop, using ONLY
-- received quantities:
--   total = SUM(quantity_received x COALESCE(receipt unit_cost, PO item unit_cost, 0))
-- Invoice: same supplier as the PO, invoice_number from the receive call,
-- status 'pending', linked to the receipt. Any failure rolls back the whole
-- receive. P1a identity / P1b over-receive / P1c shortage reasons unchanged.

CREATE UNIQUE INDEX IF NOT EXISTS idx_supplier_invoices_receipt_unique
  ON public.inventory_supplier_invoices (receipt_id)
  WHERE receipt_id IS NOT NULL;

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
  v_supplier_id        UUID;
  v_receipt_id         UUID;
  v_invoice_id         UUID;
  v_invoice_total      NUMERIC := 0;
  v_txn_ids            UUID[] := '{}'::UUID[];
  v_status             TEXT;
  v_cc                 UUID;
  v_qty                NUMERIC;
  v_el                 JSONB;
  v_shortage_reason    TEXT;
  v_shortage_notes     TEXT;
  v_po_item_id         UUID;
  v_po_item_loc        UUID;
  v_po_item_received   NUMERIC;
  v_po_item_ordered    NUMERIC;
  v_po_item_cost       NUMERIC;
  v_receipt_unit_cost  NUMERIC;
  v_txn_id             UUID;
  v_balance            NUMERIC;
  v_notes              TEXT;
  v_all_received       BOOLEAN;
BEGIN
  -- Lock + validate the PO (row lock serializes concurrent receives)
  SELECT status, supplier_id INTO v_po_status, v_supplier_id
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

    v_shortage_reason := NULLIF(v_el->>'shortage_reason', '');
    v_shortage_notes := NULLIF(v_el->>'shortage_notes', '');

    -- The line must belong to the PO (engine key: po_item_id :: product_id)
    SELECT poi.id, poi.location_id, poi.quantity_received, poi.quantity_ordered, poi.unit_cost
      INTO v_po_item_id, v_po_item_loc, v_po_item_received, v_po_item_ordered, v_po_item_cost
      FROM public.inventory_purchase_order_items poi
     WHERE poi.id = (v_el->>'po_item_id')::UUID
       AND poi.product_id = (v_el->>'product_id')::UUID
       AND poi.po_id = p_po_id;

    IF v_po_item_id IS NULL THEN
      RAISE EXCEPTION 'Item (po_item_id=%, product_id=%) does not belong to PO %',
        v_el->>'po_item_id', v_el->>'product_id', p_po_id;
    END IF;

    -- P1b: never receive more than the outstanding quantity
    IF v_qty > (v_po_item_ordered - v_po_item_received) THEN
      RAISE EXCEPTION 'Cannot receive more than the outstanding quantity. Outstanding: %, requested: %',
        (v_po_item_ordered - v_po_item_received), v_qty;
    END IF;

    -- P1c: structured shortage reason (required for short deliveries)
    IF v_shortage_reason IS NOT NULL AND v_shortage_reason NOT IN
       ('SUPPLIER_SHORTAGE', 'BACKORDER', 'DAMAGED', 'RETURNED', 'OTHER') THEN
      RAISE EXCEPTION 'Invalid shortage reason: %. Must be one of SUPPLIER_SHORTAGE, BACKORDER, DAMAGED, RETURNED, OTHER', v_shortage_reason;
    END IF;
    IF v_qty < (v_po_item_ordered - v_po_item_received) AND v_shortage_reason IS NULL THEN
      RAISE EXCEPTION 'A shortage reason is required when receiving less than the outstanding quantity';
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

    -- Receipt line (shortage reason persists per line)
    v_receipt_unit_cost := NULLIF(v_el->>'unit_cost', '')::NUMERIC;
    INSERT INTO public.inventory_po_receipt_items
      (receipt_id, po_item_id, product_id, quantity_received, unit_cost, shortage_reason, shortage_notes)
    VALUES
      (v_receipt_id, v_po_item_id, (v_el->>'product_id')::UUID, v_qty, v_receipt_unit_cost, v_shortage_reason, v_shortage_notes);

    -- P1d: invoice total uses RECEIVED quantities only
    v_invoice_total := v_invoice_total + (v_qty * COALESCE(v_receipt_unit_cost, v_po_item_cost, 0));

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

  -- P1d: auto-create the supplier invoice inside the same transaction.
  -- One receipt -> one invoice (enforced by the unique index on receipt_id).
  INSERT INTO public.inventory_supplier_invoices
    (supplier_id, receipt_id, invoice_number, invoice_date, total_amount, status, notes, created_by)
  VALUES
    (v_supplier_id, v_receipt_id, p_invoice_number, CURRENT_DATE, v_invoice_total, 'pending',
     'Auto-created from PO receipt', p_received_by)
  RETURNING id INTO v_invoice_id;

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
    'invoice_id', v_invoice_id,
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