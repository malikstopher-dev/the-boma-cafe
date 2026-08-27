-- 112_atomic_inventory_transaction.sql
-- H-08: one authoritative transaction for ledger + audit + balance cache.

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
  v_tx public.inventory_transactions%ROWTYPE;
BEGIN
  IF v_product_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.inventory_products WHERE id = v_product_id
  ) THEN
    RAISE EXCEPTION 'Product not found: %', v_product_id USING ERRCODE = 'P0001';
  END IF;

  SELECT cost_centre_id
    INTO v_location_cost_centre
  FROM public.inventory_locations
  WHERE id = v_location_id AND is_active = TRUE;

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

  IF p_input->'unit_cost' IS NOT NULL AND p_input->'unit_cost' <> 'null'::JSONB THEN
    v_unit_cost := (p_input->>'unit_cost')::NUMERIC;
  ELSE
    SELECT unit_cost
      INTO v_unit_cost
    FROM public.inventory_transactions
    WHERE product_id = v_product_id AND unit_cost IS NOT NULL
    ORDER BY created_at DESC, id DESC
    LIMIT 1;
  END IF;

  INSERT INTO public.inventory_transactions (
    product_id, location_id, transaction_type, quantity, unit_cost,
    cost_centre_id, reason_type, reason_notes, manager_note, note_author,
    reference_type, reference_id, performed_by, notes, import_batch_id,
    reservation_id, order_id, order_line_id, recipe_id
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
    NULLIF(p_input->>'recipe_id', '')::UUID
  )
  RETURNING * INTO v_tx;

  INSERT INTO public.inventory_audit_log (
    table_name, record_id, action, changes, performed_by
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
      'recipe_id', NULLIF(p_input->>'recipe_id', '')::UUID
    ),
    NULLIF(p_input->>'performed_by', '')::UUID
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
