-- 091_order_attribution_columns.sql
-- F3: inventory attribution. Every SALE ledger row created by an order
-- deduction must permanently and directly identify its source:
--   order_id, order_line_id (order_items.id), recipe_id (NULL for direct
--   product lines) alongside the existing product_id / reference columns.
--
-- Additive only: reference_type/reference_id semantics are untouched
-- (F2 idempotency + retry safety key off those), and no existing column
-- or constraint is modified. Historical pos_order rows are backfilled
-- where unambiguous.

ALTER TABLE inventory_transactions
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id),
  ADD COLUMN IF NOT EXISTS order_line_id UUID REFERENCES order_items(id),
  ADD COLUMN IF NOT EXISTS recipe_id UUID REFERENCES inventory_recipes(id);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_order
  ON inventory_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_order_line
  ON inventory_transactions(order_line_id);

-- Backfill: recipe/direct rows created before this migration. Ingredient
-- rows reference the order line (order_items.id) -> order + recipe known.
UPDATE inventory_transactions t
   SET order_id = oi.order_id,
       order_line_id = oi.id,
       recipe_id = oi.recipe_id
  FROM order_items oi
 WHERE t.reference_type = 'pos_order'
   AND t.reference_id = oi.id
   AND t.order_id IS NULL;

-- Direct rows reference the order itself -> order known, line unknown
-- (multi-line orders make it ambiguous); line stays NULL for history.
UPDATE inventory_transactions t
   SET order_id = o.id
  FROM orders o
 WHERE t.reference_type = 'pos_order'
   AND t.reference_id = o.id
   AND t.order_id IS NULL;

-- ── deduct_order_items: same signature (p_order_id, p_location_id) as 090;
--    adds order_id/order_line_id/recipe_id to every SALE row + audit entry.
--    Deduction logic, validation wording, balance checks and idempotency
--    are byte-for-byte unchanged.
CREATE OR REPLACE FUNCTION public.deduct_order_items(
  p_order_id    UUID,
  p_location_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_status      TEXT;
  v_unmatched   INTEGER;
  v_line        RECORD;
  v_yield       NUMERIC;
  v_scale       NUMERIC;
  v_ing         RECORD;
  v_needed      NUMERIC;
  v_balance     NUMERIC;
  v_cost        NUMERIC;
  v_cc          UUID;
  v_txn_id      UUID;
  v_txn_ids     UUID[] := '{}'::UUID[];
  v_deducted    INTEGER := 0;
  v_skipped     INTEGER := 0;
  v_notes       TEXT;
BEGIN
  -- Location validation (ledger parity: LocationNotFoundError wording)
  IF NOT EXISTS (SELECT 1 FROM public.inventory_locations WHERE id = p_location_id AND is_active) THEN
    RAISE EXCEPTION 'Location not found: %', p_location_id;
  END IF;

  -- Lock the order; deduction only ever runs for completed orders
  SELECT status INTO v_status
    FROM public.orders
   WHERE id = p_order_id
   FOR UPDATE;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  IF v_status <> 'completed' THEN
    RAISE EXCEPTION 'Only completed orders can be deducted (status: %)', v_status;
  END IF;

  -- Unmatched lines can never be deducted; reported as skipped
  SELECT COUNT(*) INTO v_unmatched
    FROM public.order_items
   WHERE order_id = p_order_id
     AND product_id IS NULL;

  -- Idempotent no-op: every matched line already carries transaction_id or
  -- deducted_at (an earlier completed or partial engine run)
  IF NOT EXISTS (
    SELECT 1 FROM public.order_items
     WHERE order_id = p_order_id
       AND product_id IS NOT NULL
       AND transaction_id IS NULL
       AND deducted_at IS NULL
  ) THEN
    RETURN jsonb_build_object(
      'order_id', p_order_id,
      'deducted', 0,
      'skipped', v_unmatched,
      'transaction_ids', '[]'::jsonb,
      'already_deducted', true
    );
  END IF;

  FOR v_line IN
    SELECT id, product_id, base_quantity, item_name, quantity, recipe_id
      FROM public.order_items
     WHERE order_id = p_order_id
       AND product_id IS NOT NULL
       AND transaction_id IS NULL
       AND deducted_at IS NULL
     FOR UPDATE
  LOOP
    IF v_line.recipe_id IS NOT NULL THEN
      -- Recipe line: one ledger row per ingredient, scaled by servings
      SELECT COALESCE(yield_quantity, 1) INTO v_yield
        FROM public.inventory_recipes
       WHERE id = v_line.recipe_id;

      IF v_yield IS NULL THEN
        RAISE EXCEPTION 'Recipe % for order line % not found', v_line.recipe_id, v_line.id;
      END IF;

      v_scale := v_line.quantity / CASE WHEN v_yield > 0 THEN v_yield ELSE 1 END;

      FOR v_ing IN
        SELECT i.product_id, i.quantity,
               COALESCE(i.wastage_pct, 0) AS wastage_pct,
               p.name AS product_name
          FROM public.inventory_recipe_ingredients i
          JOIN public.inventory_products p ON p.id = i.product_id
         WHERE i.recipe_id = v_line.recipe_id
      LOOP
        -- Retry safety: skip ingredients a previous non-atomic engine run
        -- already deducted for this line
        IF EXISTS (
          SELECT 1 FROM public.inventory_transactions
           WHERE reference_type = 'pos_order'
             AND reference_id = v_line.id
             AND product_id = v_ing.product_id
        ) THEN
          CONTINUE;
        END IF;

        v_needed := ROUND(v_ing.quantity * v_scale * (1 + v_ing.wastage_pct / 100), 4);

        -- Balance check (ledger parity: InsufficientStockError wording)
        SELECT COALESCE(SUM(quantity), 0) INTO v_balance
          FROM public.inventory_transactions
         WHERE product_id = v_ing.product_id AND location_id = p_location_id;
        IF v_balance < v_needed THEN
          RAISE EXCEPTION 'Insufficient stock for product % at location %: requested %, available %',
            v_ing.product_id, p_location_id, v_needed, v_balance;
        END IF;

        -- Cost: latest non-NULL unit cost (migration 083 policy)
        SELECT unit_cost INTO v_cost
          FROM public.inventory_transactions
         WHERE product_id = v_ing.product_id AND unit_cost IS NOT NULL
         ORDER BY created_at DESC, id DESC
         LIMIT 1;

        -- Cost centre: the location's configured centre (NOT NULL since 066)
        SELECT cost_centre_id INTO v_cc FROM public.inventory_locations WHERE id = p_location_id;
        IF v_cc IS NULL THEN
          RAISE EXCEPTION 'No cost centre could be determined for location %. Assign a cost centre to this location before recording stock movements.', p_location_id;
        END IF;

        v_notes := 'Auto-deducted recipe ingredient: ' || v_ing.product_name || ' for ' || v_line.item_name || ' (x' || v_line.quantity || ')';

        INSERT INTO public.inventory_transactions
          (product_id, location_id, transaction_type, quantity, unit_cost,
           cost_centre_id, reason_type, reason_notes, manager_note, note_author,
           reference_type, reference_id, performed_by, notes,
           order_id, order_line_id, recipe_id)
        VALUES
          (v_ing.product_id, p_location_id, 'sale', -v_needed, v_cost,
           v_cc, 'SALE', NULL, NULL, NULL,
           'pos_order', v_line.id, NULL, v_notes,
           p_order_id, v_line.id, v_line.recipe_id)
        RETURNING id INTO v_txn_id;

        v_txn_ids := array_append(v_txn_ids, v_txn_id);

        INSERT INTO public.inventory_audit_log (table_name, record_id, action, changes, performed_by)
        VALUES ('inventory_transactions', v_txn_id, 'created',
          jsonb_build_object(
            'product_id', v_ing.product_id,
            'location_id', p_location_id,
            'transaction_type', 'sale',
            'quantity', -v_needed,
            'cost_centre_id', v_cc,
            'reason_type', 'SALE',
            'reference_type', 'pos_order',
            'reference_id', v_line.id,
            'order_id', p_order_id,
            'order_line_id', v_line.id,
            'recipe_id', v_line.recipe_id
          ), NULL);

        SELECT COALESCE(SUM(quantity), 0) INTO v_balance
          FROM public.inventory_transactions
         WHERE product_id = v_ing.product_id AND location_id = p_location_id;

        INSERT INTO public.inventory_product_balances (product_id, location_id, balance, refreshed_at)
        VALUES (v_ing.product_id, p_location_id, v_balance, NOW())
        ON CONFLICT (product_id, location_id) DO UPDATE
          SET balance = EXCLUDED.balance, refreshed_at = EXCLUDED.refreshed_at;
      END LOOP;

      UPDATE public.order_items SET deducted_at = NOW() WHERE id = v_line.id;
      v_deducted := v_deducted + 1;
    ELSE
      -- Direct line (existing behaviour): product-level SALE
      IF v_line.base_quantity IS NULL OR v_line.base_quantity <= 0 THEN
        v_skipped := v_skipped + 1;
        CONTINUE;
      END IF;

      v_needed := v_line.base_quantity;

      SELECT COALESCE(SUM(quantity), 0) INTO v_balance
        FROM public.inventory_transactions
       WHERE product_id = v_line.product_id AND location_id = p_location_id;
      IF v_balance < v_needed THEN
        RAISE EXCEPTION 'Insufficient stock for product % at location %: requested %, available %',
          v_line.product_id, p_location_id, v_needed, v_balance;
      END IF;

      SELECT unit_cost INTO v_cost
        FROM public.inventory_transactions
       WHERE product_id = v_line.product_id AND unit_cost IS NOT NULL
       ORDER BY created_at DESC, id DESC
       LIMIT 1;

      SELECT cost_centre_id INTO v_cc FROM public.inventory_locations WHERE id = p_location_id;
      IF v_cc IS NULL THEN
        RAISE EXCEPTION 'No cost centre could be determined for location %. Assign a cost centre to this location before recording stock movements.', p_location_id;
      END IF;

      v_notes := 'Auto-deducted order item: ' || v_line.item_name || ' (x' || v_line.quantity || ')';

      INSERT INTO public.inventory_transactions
        (product_id, location_id, transaction_type, quantity, unit_cost,
         cost_centre_id, reason_type, reason_notes, manager_note, note_author,
         reference_type, reference_id, performed_by, notes,
         order_id, order_line_id, recipe_id)
      VALUES
        (v_line.product_id, p_location_id, 'sale', -v_needed, v_cost,
         v_cc, 'SALE', NULL, NULL, NULL,
         'pos_order', p_order_id, NULL, v_notes,
         p_order_id, v_line.id, NULL)
      RETURNING id INTO v_txn_id;

      v_txn_ids := array_append(v_txn_ids, v_txn_id);

      INSERT INTO public.inventory_audit_log (table_name, record_id, action, changes, performed_by)
      VALUES ('inventory_transactions', v_txn_id, 'created',
        jsonb_build_object(
          'product_id', v_line.product_id,
          'location_id', p_location_id,
          'transaction_type', 'sale',
          'quantity', -v_needed,
          'cost_centre_id', v_cc,
          'reason_type', 'SALE',
          'reference_type', 'pos_order',
          'reference_id', p_order_id,
          'order_id', p_order_id,
          'order_line_id', v_line.id,
          'recipe_id', NULL
        ), NULL);

      SELECT COALESCE(SUM(quantity), 0) INTO v_balance
        FROM public.inventory_transactions
       WHERE product_id = v_line.product_id AND location_id = p_location_id;

      INSERT INTO public.inventory_product_balances (product_id, location_id, balance, refreshed_at)
      VALUES (v_line.product_id, p_location_id, v_balance, NOW())
      ON CONFLICT (product_id, location_id) DO UPDATE
        SET balance = EXCLUDED.balance, refreshed_at = EXCLUDED.refreshed_at;

      UPDATE public.order_items
         SET transaction_id = v_txn_id, deducted_at = NOW()
       WHERE id = v_line.id;
      v_deducted := v_deducted + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'order_id', p_order_id,
    'deducted', v_deducted,
    'skipped', v_skipped + v_unmatched,
    'transaction_ids', to_jsonb(v_txn_ids),
    'already_deducted', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.deduct_order_items(UUID, UUID)
  FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.deduct_order_items(UUID, UUID)
      TO service_role;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';