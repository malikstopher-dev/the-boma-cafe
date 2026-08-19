-- Supplier data integrity: controlled duplicate consolidation with rollback metadata.
-- This migration installs the RPCs; the approved merge is invoked separately.

CREATE TABLE IF NOT EXISTS public.inventory_supplier_merge_log (
  merge_id UUID NOT NULL,
  source_supplier_id UUID NOT NULL REFERENCES public.inventory_suppliers(id),
  survivor_supplier_id UUID NOT NULL REFERENCES public.inventory_suppliers(id),
  source_snapshot JSONB NOT NULL,
  moved_reference_ids JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'merged' CHECK (status IN ('merged', 'rolled_back')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rolled_back_at TIMESTAMPTZ,
  PRIMARY KEY (merge_id, source_supplier_id),
  CHECK (source_supplier_id <> survivor_supplier_id)
);

CREATE INDEX IF NOT EXISTS idx_supplier_merge_source
  ON public.inventory_supplier_merge_log(source_supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_merge_survivor
  ON public.inventory_supplier_merge_log(survivor_supplier_id);

ALTER TABLE public.inventory_supplier_merge_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.inventory_supplier_merge_log FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.inventory_supplier_merge_log TO service_role;

CREATE OR REPLACE FUNCTION public.consolidate_approved_supplier_duplicates(
  p_performed_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_merge_id UUID := gen_random_uuid();
  v_source UUID;
  v_survivor UUID;
  v_expected_name TEXT;
  v_source_snapshot JSONB;
  v_moved_reference_ids JSONB;
  v_counts JSONB;
  v_rows INTEGER;
  v_done INTEGER := 0;
BEGIN
  FOR v_source, v_survivor, v_expected_name IN
    SELECT * FROM (VALUES
      ('9dce40cb-25bb-431a-ace6-39e216038126'::UUID, '36458972-6f8c-4ee6-a9ea-7c6decd84398'::UUID, 'National Beverage Co'::TEXT),
      ('b12147df-9131-42df-a33f-42030b032818'::UUID, '36458972-6f8c-4ee6-a9ea-7c6decd84398'::UUID, 'National Beverage Co'::TEXT),
      ('c8608b08-a19c-4056-a985-f31d23f71563'::UUID, '36458972-6f8c-4ee6-a9ea-7c6decd84398'::UUID, 'National Beverage Co'::TEXT),
      ('1cf8a18e-3361-42ce-a313-fee3a3f63149'::UUID, '36458972-6f8c-4ee6-a9ea-7c6decd84398'::UUID, 'National Beverage Co'::TEXT),
      ('7ac81aa2-bd3c-40d7-a9ee-579c8e91cb11'::UUID, '36458972-6f8c-4ee6-a9ea-7c6decd84398'::UUID, 'National Beverage Co'::TEXT),
      ('dec3d28b-617f-422e-857c-c8c943503e3f'::UUID, '36458972-6f8c-4ee6-a9ea-7c6decd84398'::UUID, 'National Beverage Co'::TEXT),
      ('a8f68f46-b816-4261-b8da-44c626cc4d59'::UUID, 'b8f0e88c-e841-4dd5-8db1-abebc2f10bd5'::UUID, 'Premium Wines & Spirits'::TEXT)
    ) AS approved(source_id, survivor_id, expected_name)
  LOOP
    PERFORM 1
      FROM public.inventory_suppliers
      WHERE id IN (v_source, v_survivor)
      FOR UPDATE;

    IF (SELECT count(*) FROM public.inventory_suppliers WHERE id IN (v_source, v_survivor)) <> 2 THEN
      RAISE EXCEPTION 'Supplier merge precondition failed: expected both supplier IDs % and %', v_source, v_survivor;
    END IF;

    IF (SELECT name FROM public.inventory_suppliers WHERE id = v_source) IS DISTINCT FROM v_expected_name
       OR (SELECT name FROM public.inventory_suppliers WHERE id = v_survivor) IS DISTINCT FROM v_expected_name THEN
      RAISE EXCEPTION 'Supplier merge precondition failed: unexpected supplier name for % or %', v_source, v_survivor;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.inventory_import_mappings source_mapping
      JOIN public.inventory_import_mappings survivor_mapping
        ON survivor_mapping.supplier_product_name = source_mapping.supplier_product_name
       AND survivor_mapping.supplier_id = v_survivor
      WHERE source_mapping.supplier_id = v_source
    ) THEN
      RAISE EXCEPTION 'Supplier merge aborted: import mapping collision for source %', v_source;
    END IF;

    SELECT to_jsonb(s)
      INTO v_source_snapshot
      FROM public.inventory_suppliers s
      WHERE s.id = v_source;

    SELECT jsonb_build_object(
      'products', COALESCE((SELECT jsonb_agg(id) FROM public.inventory_products WHERE preferred_supplier_id = v_source), '[]'::JSONB),
      'imports', COALESCE((SELECT jsonb_agg(id) FROM public.inventory_imports WHERE supplier_id = v_source), '[]'::JSONB),
      'import_mappings', COALESCE((SELECT jsonb_agg(id) FROM public.inventory_import_mappings WHERE supplier_id = v_source), '[]'::JSONB),
      'purchase_orders', COALESCE((SELECT jsonb_agg(id) FROM public.inventory_purchase_orders WHERE supplier_id = v_source), '[]'::JSONB),
      'supplier_invoices', COALESCE((SELECT jsonb_agg(id) FROM public.inventory_supplier_invoices WHERE supplier_id = v_source), '[]'::JSONB),
      'reorder_rules', COALESCE((SELECT jsonb_agg(id) FROM public.inventory_reorder_rules WHERE preferred_supplier_id = v_source), '[]'::JSONB),
      'price_history', COALESCE((SELECT jsonb_agg(id) FROM public.inventory_price_history WHERE supplier_id = v_source), '[]'::JSONB)
    ) INTO v_moved_reference_ids;

    INSERT INTO public.inventory_supplier_merge_log (
      merge_id, source_supplier_id, survivor_supplier_id, source_snapshot, moved_reference_ids
    ) VALUES (
      v_merge_id, v_source, v_survivor, v_source_snapshot, v_moved_reference_ids
    );

    UPDATE public.inventory_products
       SET preferred_supplier_id = v_survivor
     WHERE preferred_supplier_id = v_source;
    UPDATE public.inventory_imports SET supplier_id = v_survivor WHERE supplier_id = v_source;
    UPDATE public.inventory_import_mappings SET supplier_id = v_survivor WHERE supplier_id = v_source;
    UPDATE public.inventory_purchase_orders SET supplier_id = v_survivor WHERE supplier_id = v_source;
    UPDATE public.inventory_supplier_invoices SET supplier_id = v_survivor WHERE supplier_id = v_source;
    UPDATE public.inventory_reorder_rules SET preferred_supplier_id = v_survivor WHERE preferred_supplier_id = v_source;
    UPDATE public.inventory_price_history SET supplier_id = v_survivor WHERE supplier_id = v_source;

    UPDATE public.inventory_suppliers
       SET is_active = false, deleted_at = COALESCE(deleted_at, now())
     WHERE id = v_source;

    INSERT INTO public.admin_audit_log (
      admin_id, action, target_type, target_id, after_values
    ) VALUES (
      p_performed_by, 'supplier.merge', 'inventory_suppliers', v_survivor,
      jsonb_build_object('merge_id', v_merge_id, 'source_supplier_id', v_source, 'reference_ids', v_moved_reference_ids)
    );

    v_done := v_done + 1;
  END LOOP;

  SELECT jsonb_object_agg(table_name, row_count)
    INTO v_counts
    FROM (
      SELECT 'products' AS table_name, count(*) AS row_count FROM public.inventory_products WHERE preferred_supplier_id = '36458972-6f8c-4ee6-a9ea-7c6decd84398' OR preferred_supplier_id = 'b8f0e88c-e841-4dd5-8db1-abebc2f10bd5'
      UNION ALL SELECT 'purchase_orders', count(*) FROM public.inventory_purchase_orders WHERE supplier_id IN ('36458972-6f8c-4ee6-a9ea-7c6decd84398', 'b8f0e88c-e841-4dd5-8db1-abebc2f10bd5')
      UNION ALL SELECT 'invoices', count(*) FROM public.inventory_supplier_invoices WHERE supplier_id IN ('36458972-6f8c-4ee6-a9ea-7c6decd84398', 'b8f0e88c-e841-4dd5-8db1-abebc2f10bd5')
    ) counts;

  RETURN jsonb_build_object('merge_id', v_merge_id, 'sources_archived', v_done, 'survivors', jsonb_build_array('36458972-6f8c-4ee6-a9ea-7c6decd84398', 'b8f0e88c-e841-4dd5-8db1-abebc2f10bd5'), 'reference_counts', v_counts);
END;
$$;

REVOKE ALL ON FUNCTION public.consolidate_approved_supplier_duplicates(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consolidate_approved_supplier_duplicates(UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.rollback_supplier_merge(
  p_merge_id UUID,
  p_performed_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_log RECORD;
  v_snapshot JSONB;
  v_refs JSONB;
  v_count INTEGER := 0;
BEGIN
  FOR v_log IN
    SELECT * FROM public.inventory_supplier_merge_log
    WHERE merge_id = p_merge_id AND status = 'merged'
    ORDER BY source_supplier_id
    FOR UPDATE
  LOOP
    v_snapshot := v_log.source_snapshot;
    v_refs := v_log.moved_reference_ids;

    UPDATE public.inventory_products SET preferred_supplier_id = v_log.source_supplier_id
      WHERE id IN (SELECT value::UUID FROM jsonb_array_elements_text(v_refs->'products'));
    UPDATE public.inventory_imports SET supplier_id = v_log.source_supplier_id
      WHERE id IN (SELECT value::UUID FROM jsonb_array_elements_text(v_refs->'imports'));
    UPDATE public.inventory_import_mappings SET supplier_id = v_log.source_supplier_id
      WHERE id IN (SELECT value::UUID FROM jsonb_array_elements_text(v_refs->'import_mappings'));
    UPDATE public.inventory_purchase_orders SET supplier_id = v_log.source_supplier_id
      WHERE id IN (SELECT value::UUID FROM jsonb_array_elements_text(v_refs->'purchase_orders'));
    UPDATE public.inventory_supplier_invoices SET supplier_id = v_log.source_supplier_id
      WHERE id IN (SELECT value::UUID FROM jsonb_array_elements_text(v_refs->'supplier_invoices'));
    UPDATE public.inventory_reorder_rules SET preferred_supplier_id = v_log.source_supplier_id
      WHERE id IN (SELECT value::UUID FROM jsonb_array_elements_text(v_refs->'reorder_rules'));
    UPDATE public.inventory_price_history SET supplier_id = v_log.source_supplier_id
      WHERE id IN (SELECT value::UUID FROM jsonb_array_elements_text(v_refs->'price_history'));

    UPDATE public.inventory_suppliers
       SET is_active = COALESCE((v_snapshot->>'is_active')::BOOLEAN, false),
           deleted_at = NULLIF(v_snapshot->>'deleted_at', '')::TIMESTAMPTZ
     WHERE id = v_log.source_supplier_id;

    UPDATE public.inventory_supplier_merge_log
       SET status = 'rolled_back', rolled_back_at = now()
     WHERE merge_id = v_log.merge_id AND source_supplier_id = v_log.source_supplier_id;
    v_count := v_count + 1;
  END LOOP;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'Supplier merge not found or already rolled back: %', p_merge_id;
  END IF;

  INSERT INTO public.admin_audit_log (
    admin_id, action, target_type, target_id, after_values
  ) VALUES (
    p_performed_by, 'supplier.merge.rollback', 'inventory_supplier_merge', p_merge_id::TEXT,
    jsonb_build_object('merge_id', p_merge_id, 'sources_restored', v_count)
  );

  RETURN jsonb_build_object('merge_id', p_merge_id, 'sources_restored', v_count, 'status', 'rolled_back');
END;
$$;

REVOKE ALL ON FUNCTION public.rollback_supplier_merge(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rollback_supplier_merge(UUID, UUID) TO service_role;
