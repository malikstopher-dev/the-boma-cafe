-- 124_direct_receipt_type_fix.sql
-- Replay fix: 123's quick_create_product inventory_type validation used
-- inverted logic (v != ALL(list) IS FALSE raises for VALID types).
-- CREATE OR REPLACE with the identical signature replaces the body.

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
  IF NOT (v_inventory_type = ANY(v_allowed_types)) THEN
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

  IF NOT EXISTS (
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
