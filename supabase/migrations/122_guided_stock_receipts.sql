-- 122_guided_stock_receipts.sql
-- INV-4B: preserve guided receipt inputs and server-derived management actor
-- while retaining create_inventory_transaction as the sole atomic writer.

ALTER TABLE public.inventory_transactions
  ADD COLUMN IF NOT EXISTS entry_source TEXT,
  ADD COLUMN IF NOT EXISTS source_quantity NUMERIC(15,4),
  ADD COLUMN IF NOT EXISTS source_uom_id UUID REFERENCES public.inventory_uoms(id),
  ADD COLUMN IF NOT EXISTS source_conversion_factor NUMERIC(20,6),
  ADD COLUMN IF NOT EXISTS source_unit_cost NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS admin_actor_id UUID REFERENCES public.admin_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS admin_actor_name TEXT;

ALTER TABLE public.inventory_transactions
  DROP CONSTRAINT IF EXISTS inventory_transactions_entry_source_check;
ALTER TABLE public.inventory_transactions
  ADD CONSTRAINT inventory_transactions_entry_source_check
  CHECK (entry_source IS NULL OR entry_source = 'direct_receipt');

ALTER TABLE public.inventory_audit_log
  ADD COLUMN IF NOT EXISTS admin_actor_id UUID REFERENCES public.admin_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS admin_actor_name TEXT;

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_admin_actor
  ON public.inventory_transactions(admin_actor_id, created_at DESC)
  WHERE admin_actor_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.create_inventory_transaction(p_input JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_product_id UUID := NULLIF(p_input->>'product_id', '')::UUID;
  v_location_id UUID := NULLIF(p_input->>'location_id', '')::UUID;
  v_type TEXT := p_input->>'transaction_type';
  v_input_quantity NUMERIC := (p_input->>'quantity')::NUMERIC;
  v_actual_quantity NUMERIC;
  v_requested_decrease NUMERIC;
  v_balance NUMERIC;
  v_location_cost_centre UUID;
  v_cost_centre_id UUID;
  v_explicit_cost_centre UUID := NULLIF(p_input->>'cost_centre_id', '')::UUID;
  v_unit_cost NUMERIC;
  v_entry_source TEXT := NULLIF(p_input->>'entry_source', '');
  v_source_quantity NUMERIC;
  v_source_uom_id UUID := NULLIF(p_input->>'source_uom_id', '')::UUID;
  v_source_conversion_factor NUMERIC;
  v_source_unit_cost NUMERIC;
  v_require_active_product BOOLEAN := COALESCE((p_input->>'require_active_product')::BOOLEAN, FALSE);
  v_product_is_active BOOLEAN;
  v_admin_actor_id UUID := NULLIF(p_input->>'admin_actor_id', '')::UUID;
  v_admin_actor_name TEXT;
  v_tx public.inventory_transactions%ROWTYPE;
BEGIN
  SELECT is_active AND deleted_at IS NULL
    INTO v_product_is_active
  FROM public.inventory_products
  WHERE id = v_product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found: %', v_product_id USING ERRCODE = 'P0001';
  END IF;

  IF v_require_active_product AND NOT v_product_is_active THEN
    RAISE EXCEPTION 'Product is not active: %', v_product_id USING ERRCODE = 'P0001';
  END IF;

  SELECT cost_centre_id
    INTO v_location_cost_centre
  FROM public.inventory_locations
  WHERE id = v_location_id AND is_active = TRUE AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Location not found: %', v_location_id USING ERRCODE = 'P0001';
  END IF;

  IF v_explicit_cost_centre IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.cost_centres
      WHERE id = v_explicit_cost_centre AND is_active = TRUE
    ) THEN
      RAISE EXCEPTION 'Cost centre % does not exist or is not active', v_explicit_cost_centre
        USING ERRCODE = 'P0001';
    END IF;
    v_cost_centre_id := v_explicit_cost_centre;
  ELSE
    v_cost_centre_id := v_location_cost_centre;
  END IF;

  IF v_cost_centre_id IS NULL THEN
    RAISE EXCEPTION 'No cost centre could be determined for location %. Assign a cost centre to this location before recording stock movements.', v_location_id
      USING ERRCODE = 'P0001';
  END IF;

  IF v_admin_actor_id IS NOT NULL THEN
    SELECT display_name
      INTO v_admin_actor_name
    FROM public.admin_accounts
    WHERE id = v_admin_actor_id AND is_active = TRUE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Admin actor not found or inactive: %', v_admin_actor_id USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF v_entry_source = 'direct_receipt' THEN
    IF v_type <> 'purchase' THEN
      RAISE EXCEPTION 'Direct receipt requires transaction_type purchase' USING ERRCODE = 'P0001';
    END IF;
    IF v_admin_actor_id IS NULL THEN
      RAISE EXCEPTION 'Admin actor is required for a direct receipt' USING ERRCODE = 'P0001';
    END IF;
    IF v_input_quantity <= 0 THEN
      RAISE EXCEPTION 'Quantity must be greater than zero for a direct receipt' USING ERRCODE = 'P0001';
    END IF;

    v_source_quantity := v_input_quantity;
    IF v_source_uom_id IS NOT NULL THEN
      SELECT conversion_factor
        INTO v_source_conversion_factor
      FROM public.inventory_product_uoms
      WHERE product_id = v_product_id
        AND uom_id = v_source_uom_id
        AND conversion_factor > 0;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'UOM % is not linked to product %', v_source_uom_id, v_product_id
          USING ERRCODE = 'P0001';
      END IF;
    ELSE
      -- Legacy Stock Sheet rollback enters canonical base quantities.
      v_source_conversion_factor := 1;
    END IF;

    v_input_quantity := v_source_quantity * v_source_conversion_factor;
    IF p_input->'source_unit_cost' IS NOT NULL AND p_input->'source_unit_cost' <> 'null'::JSONB THEN
      v_source_unit_cost := (p_input->>'source_unit_cost')::NUMERIC;
      IF v_source_unit_cost < 0 THEN
        RAISE EXCEPTION 'Unit cost must be non-negative for a direct receipt' USING ERRCODE = 'P0001';
      END IF;
      v_unit_cost := v_source_unit_cost / v_source_conversion_factor;
    END IF;
  END IF;

  -- Serialize movements per product/location so concurrent decreases cannot
  -- both validate against the same pre-write ledger balance.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(v_product_id::TEXT || ':' || v_location_id::TEXT, 0)
  );

  IF v_type IN (
    'sale', 'sale_bottle', 'spillage', 'comp', 'staff', 'waste',
    'breakage', 'expiry_loss', 'transfer_out', 'theft', 'donation', 'gas_usage'
  ) THEN
    v_requested_decrease := ABS(v_input_quantity);
    v_actual_quantity := -ABS(v_input_quantity);
  ELSIF v_type = 'production' AND v_input_quantity < 0 THEN
    v_requested_decrease := ABS(v_input_quantity);
    v_actual_quantity := v_input_quantity;
  ELSE
    v_requested_decrease := NULL;
    v_actual_quantity := CASE
      WHEN v_input_quantity < 0 THEN v_input_quantity
      ELSE ABS(v_input_quantity)
    END;
  END IF;

  SELECT COALESCE(SUM(quantity), 0)
    INTO v_balance
  FROM public.inventory_transactions
  WHERE product_id = v_product_id AND location_id = v_location_id;

  IF v_requested_decrease IS NOT NULL AND v_balance < v_requested_decrease THEN
    RAISE EXCEPTION 'Insufficient stock for product % at location %: requested %, available %',
      v_product_id, v_location_id, v_requested_decrease, v_balance
      USING ERRCODE = 'P0001';
  END IF;

  IF v_unit_cost IS NULL THEN
    IF v_entry_source IS NULL
      AND p_input->'unit_cost' IS NOT NULL
      AND p_input->'unit_cost' <> 'null'::JSONB
    THEN
      v_unit_cost := (p_input->>'unit_cost')::NUMERIC;
    ELSE
      SELECT unit_cost
        INTO v_unit_cost
      FROM public.inventory_transactions
      WHERE product_id = v_product_id AND unit_cost IS NOT NULL
      ORDER BY created_at DESC, id DESC
      LIMIT 1;
    END IF;
  END IF;

  INSERT INTO public.inventory_transactions (
    product_id, location_id, transaction_type, quantity, unit_cost,
    cost_centre_id, reason_type, reason_notes, manager_note, note_author,
    reference_type, reference_id, performed_by, notes, import_batch_id,
    reservation_id, order_id, order_line_id, recipe_id,
    entry_source, source_quantity, source_uom_id, source_conversion_factor,
    source_unit_cost, admin_actor_id, admin_actor_name
  ) VALUES (
    v_product_id,
    v_location_id,
    v_type,
    v_actual_quantity,
    v_unit_cost,
    v_cost_centre_id,
    NULLIF(p_input->>'reason_type', ''),
    NULLIF(p_input->>'reason_notes', ''),
    NULLIF(p_input->>'manager_note', ''),
    NULLIF(p_input->>'note_author', ''),
    NULLIF(p_input->>'reference_type', ''),
    NULLIF(p_input->>'reference_id', '')::UUID,
    NULLIF(p_input->>'performed_by', '')::UUID,
    NULLIF(p_input->>'notes', ''),
    NULLIF(p_input->>'import_batch_id', '')::UUID,
    NULLIF(p_input->>'reservation_id', '')::UUID,
    NULLIF(p_input->>'order_id', '')::UUID,
    NULLIF(p_input->>'order_line_id', '')::UUID,
    NULLIF(p_input->>'recipe_id', '')::UUID,
    v_entry_source,
    v_source_quantity,
    v_source_uom_id,
    v_source_conversion_factor,
    v_source_unit_cost,
    v_admin_actor_id,
    v_admin_actor_name
  )
  RETURNING * INTO v_tx;

  INSERT INTO public.inventory_audit_log (
    table_name, record_id, action, changes, performed_by,
    admin_actor_id, admin_actor_name
  ) VALUES (
    'inventory_transactions',
    v_tx.id,
    'created',
    jsonb_build_object(
      'product_id', v_product_id,
      'location_id', v_location_id,
      'transaction_type', v_type,
      'quantity', v_actual_quantity,
      'cost_centre_id', v_cost_centre_id,
      'reason_type', NULLIF(p_input->>'reason_type', ''),
      'reference_type', NULLIF(p_input->>'reference_type', ''),
      'reference_id', NULLIF(p_input->>'reference_id', '')::UUID,
      'order_id', NULLIF(p_input->>'order_id', '')::UUID,
      'order_line_id', NULLIF(p_input->>'order_line_id', '')::UUID,
      'recipe_id', NULLIF(p_input->>'recipe_id', '')::UUID,
      'entry_source', v_entry_source,
      'source_quantity', v_source_quantity,
      'source_uom_id', v_source_uom_id,
      'source_conversion_factor', v_source_conversion_factor,
      'source_unit_cost', v_source_unit_cost
    ),
    NULLIF(p_input->>'performed_by', '')::UUID,
    v_admin_actor_id,
    v_admin_actor_name
  );

  SELECT COALESCE(SUM(quantity), 0)
    INTO v_balance
  FROM public.inventory_transactions
  WHERE product_id = v_product_id AND location_id = v_location_id;

  INSERT INTO public.inventory_product_balances (
    product_id, location_id, balance, refreshed_at
  ) VALUES (
    v_product_id, v_location_id, v_balance, NOW()
  )
  ON CONFLICT (product_id, location_id)
  DO UPDATE SET balance = EXCLUDED.balance, refreshed_at = EXCLUDED.refreshed_at;

  RETURN to_jsonb(v_tx);
END;
$$;

REVOKE ALL ON FUNCTION public.create_inventory_transaction(JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_inventory_transaction(JSONB)
  TO service_role;

NOTIFY pgrst, 'reload schema';
