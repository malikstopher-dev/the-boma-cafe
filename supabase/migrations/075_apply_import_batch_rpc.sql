-- 075_apply_import_batch_rpc.sql
-- F4 (P0/P1 remediation): make import apply idempotent and atomic.
--
-- ImportExecutor.execute() applies decisions as a loop of PostgREST calls
-- (create product, create ledger transaction, ...) with NO transaction and
-- the batch status updated only at the very end. A failure mid-loop leaves
-- rows posted with the batch still 'previewed' (live evidence: batch
-- 16327393 posted VODKA/GIN purchases while history showed 'previewed');
-- retrying then double-posts.
--
-- This RPC replays the executor's exact semantics inside ONE transaction:
--   - batch row locked FOR UPDATE; status 'applied' -> idempotent no-op
--     (returns the existing movements); 'rolled_back' -> rejected; other
--     statuses (incl. missing row in direct mode, inserted via meta) apply
--   - per decision: create_product (with sku/barcode/inventory_type/
--     reorder metadata + base UOM link), then a ledger transaction with
--     ledger-normalized sign, cost-centre resolution, product/location
--     validation, decrease-type balance check, audit row, balance-cache
--     upsert — any RAISE rolls back the WHOLE batch
-- Route keeps the legacy engine path as a fallback until this is applied.
--
-- SECURITY DEFINER + search_path hardening, service-role only (pattern:
-- migrations 060/072/074). Returns jsonb ImportApplyResult.

CREATE OR REPLACE FUNCTION public.apply_import_batch(
  p_import_id    UUID,
  p_decisions    JSONB,
  p_performed_by UUID DEFAULT NULL,
  p_import_type  TEXT DEFAULT NULL,
  p_filename     TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_status        TEXT;
  v_row_count     INTEGER;
  v_applied_at    TIMESTAMPTZ;
  v_txn_ids       UUID[] := '{}'::UUID[];
  v_product_ids   UUID[] := '{}'::UUID[];
  v_default_loc   UUID;
  v_el            JSONB;
  v_product_id    UUID;
  v_loc_id        UUID;
  v_type          TEXT;
  v_qty           NUMERIC;
  v_actual        NUMERIC;
  v_cc            UUID;
  v_txn_id        UUID;
  v_balance       NUMERIC;
  v_applied_count INTEGER := 0;
  v_notes         TEXT;
BEGIN
  IF p_decisions IS NULL OR jsonb_typeof(p_decisions) <> 'array' THEN
    RAISE EXCEPTION 'decisions array is required';
  END IF;

  -- Lock the batch row; serializes concurrent applies of the same batch
  SELECT status, row_count, applied_at
    INTO v_status, v_row_count, v_applied_at
    FROM public.inventory_imports
   WHERE id = p_import_id
   FOR UPDATE;

  IF v_status IS NULL THEN
    -- Direct mode: no preview row exists yet. Only insertable when the
    -- NOT NULL columns are provided by the caller (engine passes them via
    -- meta for direct applies).
    IF p_import_type IS NULL OR p_filename IS NULL THEN
      RAISE EXCEPTION 'Import batch not found: %', p_import_id;
    END IF;
    INSERT INTO public.inventory_imports
      (id, import_type, filename, storage_path, status, idempotency_key)
    VALUES
      (p_import_id, p_import_type, p_filename, p_import_id::text, 'pending',
       'batch:' || p_import_id::text)
    ON CONFLICT (id) DO NOTHING;
    v_status := 'pending';
    v_row_count := NULL;
    v_applied_at := NULL;
  END IF;

  IF v_status = 'applied' THEN
    -- Idempotent no-op: the batch is already applied. Return its movements.
    SELECT COALESCE(array_agg(id ORDER BY created_at), '{}'::UUID[])
      INTO v_txn_ids
      FROM public.inventory_transactions
     WHERE import_batch_id = p_import_id;

    RETURN jsonb_build_object(
      'import_batch_id', p_import_id,
      'transaction_ids', to_jsonb(v_txn_ids),
      'product_ids', '[]'::jsonb,
      'row_count', COALESCE(v_row_count, 0),
      'applied_at', COALESCE(v_applied_at, NOW()),
      'already_applied', true
    );
  END IF;

  IF v_status = 'rolled_back' THEN
    RAISE EXCEPTION 'Import batch % is rolled back and cannot be re-applied', p_import_id;
  END IF;

  -- Default location resolution (engine: resolveLocationId() fallback,
  -- first active location, resolved once)
  SELECT id INTO v_default_loc
    FROM public.inventory_locations
   WHERE is_active
   ORDER BY created_at
   LIMIT 1;

  FOR v_el IN SELECT * FROM jsonb_array_elements(p_decisions) LOOP
    IF COALESCE(v_el->>'action', '') = 'skip' THEN
      CONTINUE;
    END IF;

    v_product_id := NULLIF(v_el->>'productId', '')::UUID;

    -- create_product: carry the parsed-row metadata the engine previously
    -- dropped (sku/barcode/inventory_type/reorder) + base UOM link
    IF COALESCE(v_el->>'action', '') = 'create_product' AND v_el->>'newProductName' IS NOT NULL THEN
      INSERT INTO public.inventory_products
        (name, category_id, sku, barcode, inventory_type, reorder_threshold, reorder_quantity)
      VALUES
        (v_el->>'newProductName',
         NULLIF(v_el->>'newProductCategoryId', '')::UUID,
         NULLIF(v_el->>'newProductSku', ''),
         NULLIF(v_el->>'newProductBarcode', ''),
         COALESCE(NULLIF(v_el->>'newProductInventoryType', ''), 'GENERAL'),
         NULLIF(v_el->>'newProductReorderPoint', '')::NUMERIC,
         NULLIF(v_el->>'newProductParLevel', '')::NUMERIC)
      RETURNING id INTO v_product_id;

      IF NOT (v_product_id = ANY (v_product_ids)) THEN
        v_product_ids := array_append(v_product_ids, v_product_id);
      END IF;

      IF v_el->>'newProductUomId' IS NOT NULL THEN
        INSERT INTO public.inventory_product_uoms
          (product_id, uom_id, is_base, is_display, conversion_factor)
        VALUES
          (v_product_id, (v_el->>'newProductUomId')::UUID, true, false, 1);
      END IF;
    END IF;

    -- Ledger movement (engine: only when product + quantity present)
    IF v_product_id IS NOT NULL AND v_el->>'quantity' IS NOT NULL THEN
      v_loc_id := NULLIF(v_el->>'locationId', '')::UUID;
      IF v_loc_id IS NULL THEN
        v_loc_id := v_default_loc;
      END IF;
      IF v_loc_id IS NOT NULL THEN
        v_type := COALESCE(NULLIF(v_el->>'transactionType', ''), 'purchase');
        v_qty := (v_el->>'quantity')::NUMERIC;

        -- Product / location validation (ledger parity)
        IF NOT EXISTS (SELECT 1 FROM public.inventory_products WHERE id = v_product_id) THEN
          RAISE EXCEPTION 'Product not found: %', v_product_id;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM public.inventory_locations WHERE id = v_loc_id AND is_active) THEN
          RAISE EXCEPTION 'Location not found: %', v_loc_id;
        END IF;

        -- Decrease-type balance check (ledger parity: only for quantity >= 0)
        IF v_type IN ('sale','sale_bottle','spillage','comp','staff','waste','breakage','expiry_loss','transfer_out','theft','donation','gas_usage')
           AND v_qty >= 0 THEN
          SELECT COALESCE(SUM(quantity), 0) INTO v_balance
            FROM public.inventory_transactions
           WHERE product_id = v_product_id AND location_id = v_loc_id;
          IF v_balance < v_qty THEN
            RAISE EXCEPTION 'Insufficient stock for product % at location %: requested %, available %',
              v_product_id, v_loc_id, v_qty, v_balance;
          END IF;
        END IF;

        -- Sign normalization (ledger parity): decrease types are always
        -- negative; bidirectional types honor the caller's sign
        v_actual := CASE
          WHEN v_type IN ('sale','sale_bottle','spillage','comp','staff','waste','breakage','expiry_loss','transfer_out','theft','donation','gas_usage')
            THEN -ABS(v_qty)
          WHEN v_qty < 0 THEN v_qty
          ELSE ABS(v_qty)
        END;

        -- Cost centre: explicit (validated) wins, else the location's
        v_cc := NULLIF(v_el->>'costCentreId', '')::UUID;
        IF v_cc IS NOT NULL THEN
          IF NOT EXISTS (SELECT 1 FROM public.cost_centres WHERE id = v_cc AND is_active) THEN
            RAISE EXCEPTION 'Cost centre % does not exist or is not active', v_cc;
          END IF;
        ELSE
          SELECT cost_centre_id INTO v_cc FROM public.inventory_locations WHERE id = v_loc_id;
          IF v_cc IS NULL THEN
            RAISE EXCEPTION 'No cost centre could be determined for location %. Assign a cost centre to this location before recording stock movements.', v_loc_id;
          END IF;
        END IF;

        v_notes := 'Import: ' || COALESCE(v_el->>'sourceRow', 'unknown row');

        INSERT INTO public.inventory_transactions
          (product_id, location_id, transaction_type, quantity, unit_cost,
           cost_centre_id, reason_type, reason_notes, manager_note, note_author,
           reference_type, reference_id, performed_by, notes, import_batch_id)
        VALUES
          (v_product_id, v_loc_id, v_type, v_actual, NULLIF(v_el->>'unitCost', '')::NUMERIC,
           v_cc, NULLIF(v_el->>'reasonType', ''), NULLIF(v_el->>'reasonNotes', ''), NULL, NULL,
           'import_batch', p_import_id, p_performed_by, v_notes, p_import_id)
        RETURNING id INTO v_txn_id;

        v_txn_ids := array_append(v_txn_ids, v_txn_id);
        v_applied_count := v_applied_count + 1;

        IF NOT (v_product_id = ANY (v_product_ids)) THEN
          v_product_ids := array_append(v_product_ids, v_product_id);
        END IF;

        INSERT INTO public.inventory_audit_log (table_name, record_id, action, changes, performed_by)
        VALUES ('inventory_transactions', v_txn_id, 'created',
          jsonb_build_object(
            'product_id', v_product_id,
            'location_id', v_loc_id,
            'transaction_type', v_type,
            'quantity', v_actual,
            'cost_centre_id', v_cc,
            'reason_type', NULLIF(v_el->>'reasonType', ''),
            'reference_type', 'import_batch',
            'reference_id', p_import_id
          ),
          p_performed_by);

        -- Balance cache upsert (ledger stays authoritative; cache is derived)
        SELECT COALESCE(SUM(quantity), 0) INTO v_balance
          FROM public.inventory_transactions
         WHERE product_id = v_product_id AND location_id = v_loc_id;

        INSERT INTO public.inventory_product_balances (product_id, location_id, balance, refreshed_at)
        VALUES (v_product_id, v_loc_id, v_balance, NOW())
        ON CONFLICT (product_id, location_id) DO UPDATE
          SET balance = EXCLUDED.balance, refreshed_at = EXCLUDED.refreshed_at;
      END IF;
    END IF;
  END LOOP;

  -- Mark applied — only now, inside the same transaction as every movement
  UPDATE public.inventory_imports
     SET status = 'applied',
         applied_at = NOW(),
         applied_by = p_performed_by,
         row_count = v_applied_count,
         matched_count = array_length(v_product_ids, 1)
   WHERE id = p_import_id;

  RETURN jsonb_build_object(
    'import_batch_id', p_import_id,
    'transaction_ids', to_jsonb(v_txn_ids),
    'product_ids', to_jsonb(v_product_ids),
    'row_count', v_applied_count,
    'applied_at', NOW(),
    'already_applied', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_import_batch(UUID, JSONB, UUID, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.apply_import_batch(UUID, JSONB, UUID, TEXT, TEXT)
      TO service_role;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
