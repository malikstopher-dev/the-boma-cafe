-- Migration 110: atomic, signed, idempotent production completion.
-- Every remaining consumed/produced run item, its ledger movement, audit row,
-- cache refresh, item link, and final run status commit in one transaction.

CREATE OR REPLACE FUNCTION public.complete_production_run(
  p_run_id UUID,
  p_quantity_completed NUMERIC DEFAULT NULL,
  p_completed_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_run RECORD;
  v_item RECORD;
  v_required RECORD;
  v_completed_qty NUMERIC;
  v_scale NUMERIC;
  v_movement_qty NUMERIC;
  v_balance NUMERIC;
  v_cost NUMERIC;
  v_cost_centre_id UUID;
  v_transaction_id UUID;
  v_transaction_ids UUID[] := '{}'::UUID[];
  v_created INT := 0;
  v_item_count INT;
BEGIN
  SELECT run.*, recipe.name AS recipe_name
    INTO v_run
  FROM public.inventory_production_runs run
  JOIN public.inventory_recipes recipe ON recipe.id = run.recipe_id
  WHERE run.id = p_run_id
  FOR UPDATE OF run;

  IF v_run.id IS NULL THEN
    RAISE EXCEPTION 'Production run not found: %', p_run_id;
  END IF;

  IF v_run.status = 'cancelled' THEN
    RAISE EXCEPTION 'Production run is cancelled';
  END IF;

  IF v_run.status = 'completed' THEN
    IF EXISTS (
      SELECT 1
      FROM public.inventory_production_run_items
      WHERE production_run_id = p_run_id
        AND transaction_id IS NULL
    ) THEN
      RAISE EXCEPTION 'Production run is completed but has unlinked movement items';
    END IF;

    SELECT COALESCE(array_agg(transaction_id ORDER BY sort_order, id), '{}'::UUID[])
      INTO v_transaction_ids
    FROM public.inventory_production_run_items
    WHERE production_run_id = p_run_id;

    RETURN jsonb_build_object(
      'production_run_id', p_run_id,
      'status', 'completed',
      'quantity_completed', v_run.quantity_completed,
      'created', 0,
      'transaction_ids', to_jsonb(v_transaction_ids),
      'already_completed', TRUE
    );
  END IF;

  IF v_run.status NOT IN ('planned', 'in_progress') THEN
    RAISE EXCEPTION 'Production run cannot be completed from status %', v_run.status;
  END IF;

  v_completed_qty := COALESCE(p_quantity_completed, v_run.quantity_planned);
  IF v_completed_qty IS NULL OR v_completed_qty <= 0 THEN
    RAISE EXCEPTION 'Completed quantity must be greater than zero';
  END IF;
  IF v_run.quantity_planned IS NULL OR v_run.quantity_planned <= 0 THEN
    RAISE EXCEPTION 'Planned quantity must be greater than zero';
  END IF;
  v_scale := v_completed_qty / v_run.quantity_planned;

  IF NOT EXISTS (
    SELECT 1 FROM public.inventory_locations
    WHERE id = v_run.location_id AND is_active = TRUE AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Location not found: %', v_run.location_id;
  END IF;

  SELECT COALESCE(v_run.cost_centre_id, location.cost_centre_id)
    INTO v_cost_centre_id
  FROM public.inventory_locations location
  WHERE location.id = v_run.location_id;

  IF v_cost_centre_id IS NULL THEN
    RAISE EXCEPTION 'No cost centre could be determined for location %. Assign a cost centre to this location before recording stock movements.', v_run.location_id;
  END IF;

  SELECT COUNT(*) INTO v_item_count
  FROM public.inventory_production_run_items
  WHERE production_run_id = p_run_id;

  IF v_item_count = 0 THEN
    RAISE EXCEPTION 'Production run has no movement items';
  END IF;

  -- Lock every item before validating balances. Existing transaction links
  -- from a pre-migration partial run are preserved and skipped on repair.
  PERFORM 1
  FROM public.inventory_production_run_items
  WHERE production_run_id = p_run_id
  FOR UPDATE;

  -- Validate the TOTAL remaining consumption per product before the first
  -- insert. Negative production is an explicit decrease and may never drive
  -- authoritative ledger stock below zero.
  FOR v_required IN
    SELECT item.product_id,
           ROUND(SUM(item.quantity * v_scale * (1 + COALESCE(item.wastage_pct, 0) / 100)), 4) AS quantity
    FROM public.inventory_production_run_items item
    WHERE item.production_run_id = p_run_id
      AND item.direction = 'consumed'
      AND item.transaction_id IS NULL
    GROUP BY item.product_id
  LOOP
    SELECT COALESCE(SUM(transaction.quantity), 0)
      INTO v_balance
    FROM public.inventory_transactions transaction
    WHERE transaction.product_id = v_required.product_id
      AND transaction.location_id = v_run.location_id;

    IF v_balance < v_required.quantity THEN
      RAISE EXCEPTION 'Insufficient stock for product % at location %: requested %, available %',
        v_required.product_id, v_run.location_id, v_required.quantity, v_balance;
    END IF;
  END LOOP;

  FOR v_item IN
    SELECT item.*, product.name AS product_name
    FROM public.inventory_production_run_items item
    JOIN public.inventory_products product ON product.id = item.product_id
    WHERE item.production_run_id = p_run_id
      AND item.transaction_id IS NULL
    ORDER BY item.sort_order, item.id
    FOR UPDATE OF item
  LOOP
    v_movement_qty := ROUND(v_item.quantity * v_scale, 4);
    IF v_item.direction = 'consumed' THEN
      v_movement_qty := -ROUND(
        v_item.quantity * v_scale * (1 + COALESCE(v_item.wastage_pct, 0) / 100),
        4
      );
    END IF;

    IF v_movement_qty = 0 THEN
      RAISE EXCEPTION 'Production run item % has a zero movement quantity', v_item.id;
    END IF;

    SELECT transaction.unit_cost
      INTO v_cost
    FROM public.inventory_transactions transaction
    WHERE transaction.product_id = v_item.product_id
      AND transaction.unit_cost IS NOT NULL
    ORDER BY transaction.created_at DESC, transaction.id DESC
    LIMIT 1;

    INSERT INTO public.inventory_transactions (
      product_id,
      location_id,
      transaction_type,
      quantity,
      unit_cost,
      cost_centre_id,
      reason_type,
      reason_notes,
      reference_type,
      reference_id,
      performed_by,
      notes
    ) VALUES (
      v_item.product_id,
      v_run.location_id,
      'production',
      v_movement_qty,
      v_cost,
      v_cost_centre_id,
      'PRODUCTION',
      'Production: ' || v_run.recipe_name,
      'production_run',
      p_run_id,
      p_completed_by,
      CASE
        WHEN v_item.direction = 'consumed'
          THEN 'Production consumed: ' || v_item.product_name
        ELSE 'Production produced: ' || v_item.product_name
      END
    ) RETURNING id INTO v_transaction_id;

    v_transaction_ids := array_append(v_transaction_ids, v_transaction_id);
    v_created := v_created + 1;

    INSERT INTO public.inventory_audit_log (
      table_name,
      record_id,
      action,
      changes,
      performed_by
    ) VALUES (
      'inventory_transactions',
      v_transaction_id,
      'created',
      jsonb_build_object(
        'product_id', v_item.product_id,
        'location_id', v_run.location_id,
        'transaction_type', 'production',
        'quantity', v_movement_qty,
        'cost_centre_id', v_cost_centre_id,
        'reason_type', 'PRODUCTION',
        'reference_type', 'production_run',
        'reference_id', p_run_id
      ),
      p_completed_by
    );

    UPDATE public.inventory_production_run_items
    SET transaction_id = v_transaction_id
    WHERE id = v_item.id;

    SELECT COALESCE(SUM(transaction.quantity), 0)
      INTO v_balance
    FROM public.inventory_transactions transaction
    WHERE transaction.product_id = v_item.product_id
      AND transaction.location_id = v_run.location_id;

    INSERT INTO public.inventory_product_balances (
      product_id,
      location_id,
      balance,
      refreshed_at
    ) VALUES (
      v_item.product_id,
      v_run.location_id,
      v_balance,
      NOW()
    )
    ON CONFLICT (product_id, location_id) DO UPDATE
      SET balance = EXCLUDED.balance,
          refreshed_at = EXCLUDED.refreshed_at;
  END LOOP;

  -- Include links retained from a pre-migration partial completion.
  SELECT COALESCE(array_agg(transaction_id ORDER BY sort_order, id), '{}'::UUID[])
    INTO v_transaction_ids
  FROM public.inventory_production_run_items
  WHERE production_run_id = p_run_id;

  UPDATE public.inventory_production_runs
  SET status = 'completed',
      quantity_completed = v_completed_qty,
      completed_by = p_completed_by,
      completed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_run_id;

  INSERT INTO public.inventory_audit_log (
    table_name,
    record_id,
    action,
    changes,
    performed_by
  ) VALUES (
    'inventory_production_runs',
    p_run_id,
    'updated',
    jsonb_build_object(
      'status', 'completed',
      'quantity_completed', v_completed_qty,
      'transaction_ids', to_jsonb(v_transaction_ids)
    ),
    p_completed_by
  );

  RETURN jsonb_build_object(
    'production_run_id', p_run_id,
    'status', 'completed',
    'quantity_completed', v_completed_qty,
    'created', v_created,
    'transaction_ids', to_jsonb(v_transaction_ids),
    'already_completed', FALSE
  );
END;
$$;

REVOKE ALL ON FUNCTION public.complete_production_run(UUID, NUMERIC, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_production_run(UUID, NUMERIC, UUID)
  TO service_role;

NOTIFY pgrst, 'reload schema';
