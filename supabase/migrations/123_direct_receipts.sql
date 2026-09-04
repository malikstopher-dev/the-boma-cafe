-- 123_direct_receipts.sql
-- Gate B P0: atomic multi-line direct receipts with one shared header.
-- create_inventory_transaction remains the sole movement writer; this RPC
-- composes it inside one PostgreSQL transaction per receipt document.

-- 1) Receipt header table ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_direct_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.inventory_locations(id),
  supplier_id UUID REFERENCES public.inventory_suppliers(id),
  delivery_reference TEXT,
  receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  total_value NUMERIC(14,2),
  idempotency_key UUID NOT NULL UNIQUE,
  admin_actor_id UUID REFERENCES public.admin_accounts(id) ON DELETE SET NULL,
  admin_actor_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_direct_receipts_location
  ON public.inventory_direct_receipts(location_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_receipts_supplier
  ON public.inventory_direct_receipts(supplier_id) WHERE supplier_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_direct_receipts_actor
  ON public.inventory_direct_receipts(admin_actor_id, created_at DESC)
  WHERE admin_actor_id IS NOT NULL;

-- 2) Link transactions to their receipt -------------------------------------
-- reference_type CHECK on inventory_transactions allows 'manual'; we add a
-- dedicated nullable FK so the linkage is structural, not stringly typed.
ALTER TABLE public.inventory_transactions
  ADD COLUMN IF NOT EXISTS direct_receipt_id UUID
  REFERENCES public.inventory_direct_receipts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_direct_receipt
  ON public.inventory_transactions(direct_receipt_id)
  WHERE direct_receipt_id IS NOT NULL;

-- 3) allowlist entry_source for the header-backed receipt path --------------
ALTER TABLE public.inventory_transactions
  DROP CONSTRAINT IF EXISTS inventory_transactions_entry_source_check;
ALTER TABLE public.inventory_transactions
  ADD CONSTRAINT inventory_transactions_entry_source_check
  CHECK (entry_source IS NULL OR entry_source IN ('direct_receipt', 'direct_receipt_v2'));

-- 4) Atomic multi-line receipt RPC ------------------------------------------
-- Reuses create_inventory_transaction(JSONB) for every line inside one
-- transaction; any line failure rolls back header + every line + cache.
CREATE OR REPLACE FUNCTION public.post_direct_receipt(p_input JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_idem UUID := NULLIF(p_input->>'idempotency_key', '')::UUID;
  v_location_id UUID := NULLIF(p_input->>'location_id', '')::UUID;
  v_supplier_id UUID := NULLIF(p_input->>'supplier_id', '')::UUID;
  v_reference TEXT := NULLIF(p_input->>'delivery_reference', '');
  v_receipt_date DATE := NULLIF(p_input->>'receipt_date', '')::DATE;
  v_notes TEXT := NULLIF(p_input->>'notes', '');
  v_admin_actor_id UUID := NULLIF(p_input->>'admin_actor_id', '')::UUID;
  v_admin_actor_name TEXT;
  v_lines JSONB := p_input->'lines';
  v_line JSONB;
  v_i INT;
  v_line_count INT;
  v_total NUMERIC(14,2) := 0;
  v_line_value NUMERIC;
  v_receipt_id UUID;
  v_created JSONB := '[]'::JSONB;
  v_tx JSONB;
  v_existing_id UUID;
BEGIN
  IF v_idem IS NULL THEN
    RAISE EXCEPTION 'idempotency_key is required' USING ERRCODE = 'P0001';
  END IF;

  -- Idempotent exact-retry convergence ---------------------------------------
  SELECT id INTO v_existing_id
    FROM public.inventory_direct_receipts
   WHERE idempotency_key = v_idem;
  IF FOUND THEN
    SELECT COALESCE(
      jsonb_build_object(
        'receipt', to_jsonb(r),
        'transactions', (
          SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.created_at), '[]'::JSONB)
            FROM public.inventory_transactions t
           WHERE t.direct_receipt_id = r.id
        )
      ), '[]'::JSONB)
      INTO v_created
      FROM public.inventory_direct_receipts r
     WHERE r.id = v_existing_id;
    RETURN jsonb_build_object('outcome', 'already_posted', 'receipt_id', v_existing_id, 'result', v_created);
  END IF;

  -- Validate actor -----------------------------------------------------------
  IF v_admin_actor_id IS NOT NULL THEN
    SELECT display_name INTO v_admin_actor_name
      FROM public.admin_accounts
     WHERE id = v_admin_actor_id AND is_active = TRUE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Admin actor not found or inactive: %', v_admin_actor_id USING ERRCODE = 'P0001';
    END IF;
  ELSE
    RAISE EXCEPTION 'Admin actor is required for a direct receipt' USING ERRCODE = 'P0001';
  END IF;

  -- Validate location (active) ------------------------------------------------
  IF NOT EXISTS (
    SELECT 1 FROM public.inventory_locations
     WHERE id = v_location_id AND is_active = TRUE AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Location not found or inactive: %', v_location_id USING ERRCODE = 'P0001';
  END IF;

  -- Validate supplier when supplied -------------------------------------------
  IF v_supplier_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.inventory_suppliers
     WHERE id = v_supplier_id AND is_active = TRUE AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Supplier not found or inactive: %', v_supplier_id USING ERRCODE = 'P0001';
  END IF;

  -- Validate lines ------------------------------------------------------------
  IF v_lines IS NULL OR jsonb_typeof(v_lines) <> 'array' THEN
    RAISE EXCEPTION 'lines must be a JSON array' USING ERRCODE = 'P0001';
  END IF;
  v_line_count := jsonb_array_length(v_lines);
  IF v_line_count IS NULL OR v_line_count = 0 THEN
    RAISE EXCEPTION 'At least one receipt line is required' USING ERRCODE = 'P0001';
  END IF;
  IF v_line_count > 200 THEN
    RAISE EXCEPTION 'A receipt cannot exceed 200 lines' USING ERRCODE = 'P0001';
  END IF;

  -- Create the header (inside the same tx as the lines) ------------------------
  INSERT INTO public.inventory_direct_receipts (
    location_id, supplier_id, delivery_reference, receipt_date, notes,
    idempotency_key, admin_actor_id, admin_actor_name
  ) VALUES (
    v_location_id, v_supplier_id, v_reference, COALESCE(v_receipt_date, CURRENT_DATE), v_notes,
    v_idem, v_admin_actor_id, v_admin_actor_name
  )
  RETURNING id INTO v_receipt_id;

  -- Post each line through the sole movement writer ----------------------------
  FOR v_i IN 1 .. v_line_count LOOP
    v_line := v_lines->(v_i - 1);

    v_tx := public.create_inventory_transaction(jsonb_build_object(
      'product_id', v_line->>'product_id',
      'location_id', v_location_id,
      'transaction_type', 'purchase',
      'reason_type', 'DELIVERY',
      'quantity', v_line->>'quantity',
      'uom_id', v_line->>'uom_id',
      'source_unit_cost', v_line->'unit_cost',
      'reason_notes', v_receipt_id::TEXT,
      'notes', v_notes,
      'entry_source', 'direct_receipt_v2',
      'require_active_product', TRUE,
      'admin_actor_id', v_admin_actor_id::TEXT,
      'admin_actor_name', v_admin_actor_name
    ));

    -- Structurally link the movement to this receipt
    UPDATE public.inventory_transactions
       SET direct_receipt_id = v_receipt_id
     WHERE id = (v_tx->>'id')::UUID;

    v_line_value := NULLIF(v_line->>'line_value', '')::NUMERIC;
    IF v_line_value IS NOT NULL THEN
      v_total := v_total + v_line_value;
    END IF;

    v_created := v_created || v_tx;
  END LOOP;

  UPDATE public.inventory_direct_receipts
     SET total_value = v_total
   WHERE id = v_receipt_id;

  RETURN jsonb_build_object(
    'outcome', 'posted',
    'receipt_id', v_receipt_id,
    'transactions', v_created
  );
END;
$$;

REVOKE ALL ON FUNCTION public.post_direct_receipt(JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.post_direct_receipt(JSONB)
  TO service_role;

-- 5) Atomic quick product creation (product + base UOM link + audit) ----------
CREATE OR REPLACE FUNCTION public.quick_create_product(p_input JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_name TEXT := NULLIF(p_input->>'name', '');
  v_sku TEXT := NULLIF(p_input->>'sku', '');
  v_barcode TEXT := NULLIF(p_input->>'barcode', '');
  v_category_id UUID := NULLIF(p_input->>'category_id', '')::UUID;
  v_inventory_type TEXT := COALESCE(NULLIF(p_input->>'inventory_type', ''), 'GENERAL');
  v_supplier_id UUID := NULLIF(p_input->>'supplier_id', '')::UUID;
  v_unit_cost NUMERIC(10,2) := NULLIF(p_input->>'unit_cost', '')::NUMERIC;
  v_reorder_threshold NUMERIC(15,4) := NULLIF(p_input->>'reorder_threshold', '')::NUMERIC;
  v_base_uom_id UUID := NULLIF(p_input->>'base_uom_id', '')::UUID;
  v_admin_actor_id UUID := NULLIF(p_input->>'admin_actor_id', '')::UUID;
  v_admin_actor_name TEXT;
  v_product public.inventory_products%ROWTYPE;
  v_allowed_types TEXT[] := ARRAY['FOOD','BEVERAGE','CLEANING','PACKAGING','GENERAL','GAS'];
BEGIN
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'Product name is required' USING ERRCODE = 'P0001';
  END IF;
  IF v_base_uom_id IS NULL THEN
    RAISE EXCEPTION 'A base UOM is required to create an item' USING ERRCODE = 'P0001';
  END IF;
  IF v_inventory_type != ALL(v_allowed_types) IS FALSE THEN
    RAISE EXCEPTION 'Invalid inventory_type: %', v_inventory_type USING ERRCODE = 'P0001';
  END IF;

  IF v_admin_actor_id IS NOT NULL THEN
    SELECT display_name INTO v_admin_actor_name
      FROM public.admin_accounts
     WHERE id = v_admin_actor_id AND is_active = TRUE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Admin actor not found or inactive: %', v_admin_actor_id USING ERRCODE = 'P0001';
    END IF;
  ELSE
    RAISE EXCEPTION 'Admin actor is required to create an item' USING ERRCODE = 'P0001';
  END IF;

  IF v_base_uom_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.inventory_uoms WHERE id = v_base_uom_id
  ) THEN
    RAISE EXCEPTION 'Base UOM not found: %', v_base_uom_id USING ERRCODE = 'P0001';
  END IF;

  IF v_category_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.inventory_categories WHERE id = v_category_id
  ) THEN
    RAISE EXCEPTION 'Category not found: %', v_category_id USING ERRCODE = 'P0001';
  END IF;

  IF v_supplier_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.inventory_suppliers
     WHERE id = v_supplier_id AND is_active = TRUE AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Supplier not found or inactive: %', v_supplier_id USING ERRCODE = 'P0001';
  END IF;

  IF v_sku IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.inventory_products WHERE sku = v_sku
  ) THEN
    RAISE EXCEPTION 'A product with this SKU already exists' USING ERRCODE = 'P0001';
  END IF;

  IF v_barcode IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.inventory_products WHERE barcode = v_barcode
  ) THEN
    RAISE EXCEPTION 'A product with this barcode already exists' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.inventory_products (
    name, sku, barcode, category_id, inventory_type,
    preferred_supplier_id, unit_cost, reorder_threshold, is_active
  ) VALUES (
    v_name, v_sku, v_barcode, v_category_id, v_inventory_type,
    v_supplier_id, v_unit_cost, v_reorder_threshold, TRUE
  )
  RETURNING * INTO v_product;

  -- Exactly one base UOM link (factor 1). one_base_uom CHECK is satisfied.
  INSERT INTO public.inventory_product_uoms (
    product_id, uom_id, is_base, is_display, conversion_factor
  ) VALUES (
    v_product.id, v_base_uom_id, TRUE, FALSE, 1
  );

  INSERT INTO public.inventory_audit_log (
    table_name, record_id, action, changes, admin_actor_id, admin_actor_name
  ) VALUES (
    'inventory_products',
    v_product.id,
    'created',
    jsonb_build_object(
      'name', v_name,
      'sku', v_sku,
      'barcode', v_barcode,
      'inventory_type', v_inventory_type,
      'base_uom_id', v_base_uom_id,
      'entry_source', 'quick_create'
    ),
    v_admin_actor_id,
    v_admin_actor_name
  );

  RETURN jsonb_build_object('product', to_jsonb(v_product));
END;
$$;

REVOKE ALL ON FUNCTION public.quick_create_product(JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.quick_create_product(JSONB)
  TO service_role;

NOTIFY pgrst, 'reload schema';
