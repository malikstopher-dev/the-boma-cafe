-- U1-B controlled menu-image cutover.
-- The migration creates service-role-only atomic apply/rollback functions.
-- It does not modify menu_items until apply_u1b_menu_image_cutover() is called.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.apply_u1b_menu_image_cutover()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $$
DECLARE
  v_row RECORD;
  v_expected_hash TEXT;
  v_expected_path TEXT;
  v_count INTEGER := 0;
  v_already_applied INTEGER := 0;
BEGIN
  FOR v_row IN
    SELECT mi.id, mi.image
    FROM public.menu_items AS mi
    WHERE mi.id IN (
      '286f0b05-bc0c-4678-b1f0-34147616efd6'::UUID,
      '9b0a6a5f-b932-4361-9ba0-20b9121c2e5c'::UUID,
      '9de22ca0-d610-4524-be41-a7d52f0efa31'::UUID,
      'a99a981d-9d12-4db8-9ba0-9b3ca43a4fdb'::UUID,
      'b9596e30-6865-40e1-b759-ddaf16c23843'::UUID,
      'ba8efd95-8536-4b78-9aed-21d8f5d847f3'::UUID
    )
    ORDER BY mi.id
    FOR UPDATE
  LOOP
    v_count := v_count + 1;
    SELECT expected_hash, expected_path
    INTO v_expected_hash, v_expected_path
    FROM (VALUES
      ('286f0b05-bc0c-4678-b1f0-34147616efd6'::UUID, '42c79adbb5a55873174a4d359247ffbe8673e6aab0a5eccb5522971522a7005a', '/menu/migrated/boma-breakfast-286f0b05.webp'),
      ('9b0a6a5f-b932-4361-9ba0-20b9121c2e5c'::UUID, '71bed702c001feae2c135479a1f41abf8ec3eb0bcb76453e5b53663bd25e1d8d', '/menu/migrated/braai-platter-for-2-9b0a6a5f.webp'),
      ('9de22ca0-d610-4524-be41-a7d52f0efa31'::UUID, 'a5df598a766448b4028752df872f4432f72f7d7b068ff46d57c1da5ec414e09f', '/menu/migrated/1-4-chicken-pap-and-gravy-9de22ca0.webp'),
      ('a99a981d-9d12-4db8-9ba0-9b3ca43a4fdb'::UUID, 'cb813dd98016a537cebb44b4c20d8e28937454f37d716f9178d4cf7d558ed9f8', '/menu/migrated/200g-ribs-and-steak-a99a981d.webp'),
      ('b9596e30-6865-40e1-b759-ddaf16c23843'::UUID, '9d1d301ba5cab542f4f8977a0721cf5076cbff20d5df8f3f418dfe57552716a1', '/menu/migrated/full-chicken-chips-and-4-rotis-b9596e30.webp'),
      ('ba8efd95-8536-4b78-9aed-21d8f5d847f3'::UUID, 'c7e0b47e8808ac83576f7e24ff2f2301e41241499cc6072d513b0788ae1ba0eb', '/menu/migrated/boma-pastry-platter-ba8efd95.webp')
    ) AS approved(id, expected_hash, expected_path)
    WHERE approved.id = v_row.id;

    IF v_row.image = v_expected_path THEN
      v_already_applied := v_already_applied + 1;
    ELSIF v_row.image IS NULL
      OR encode(extensions.digest(convert_to(v_row.image, 'UTF8'), 'sha256'), 'hex') <> v_expected_hash THEN
      RAISE EXCEPTION 'U1-B source hash mismatch for menu item %', v_row.id;
    END IF;
  END LOOP;

  IF v_count <> 6 THEN
    RAISE EXCEPTION 'U1-B expected 6 menu rows, found %', v_count;
  END IF;
  IF v_already_applied NOT IN (0, 6) THEN
    RAISE EXCEPTION 'U1-B mixed source/cutover state (% of 6 already applied)', v_already_applied;
  END IF;
  IF v_already_applied = 6 THEN
    RETURN jsonb_build_object('outcome', 'already_applied', 'updated', 0);
  END IF;

  UPDATE public.menu_items AS mi
  SET image = approved.final_path,
      updated_at = NOW()
  FROM (VALUES
    ('286f0b05-bc0c-4678-b1f0-34147616efd6'::UUID, '/menu/migrated/boma-breakfast-286f0b05.webp'),
    ('9b0a6a5f-b932-4361-9ba0-20b9121c2e5c'::UUID, '/menu/migrated/braai-platter-for-2-9b0a6a5f.webp'),
    ('9de22ca0-d610-4524-be41-a7d52f0efa31'::UUID, '/menu/migrated/1-4-chicken-pap-and-gravy-9de22ca0.webp'),
    ('a99a981d-9d12-4db8-9ba0-9b3ca43a4fdb'::UUID, '/menu/migrated/200g-ribs-and-steak-a99a981d.webp'),
    ('b9596e30-6865-40e1-b759-ddaf16c23843'::UUID, '/menu/migrated/full-chicken-chips-and-4-rotis-b9596e30.webp'),
    ('ba8efd95-8536-4b78-9aed-21d8f5d847f3'::UUID, '/menu/migrated/boma-pastry-platter-ba8efd95.webp')
  ) AS approved(id, final_path)
  WHERE mi.id = approved.id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 6 THEN
    RAISE EXCEPTION 'U1-B expected to update 6 rows, updated %', v_count;
  END IF;

  RETURN jsonb_build_object('outcome', 'applied', 'updated', v_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.rollback_u1b_menu_image_cutover(p_rows JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $$
DECLARE
  v_row RECORD;
  v_count INTEGER := 0;
BEGIN
  IF jsonb_typeof(p_rows) <> 'array' OR jsonb_array_length(p_rows) <> 6 THEN
    RAISE EXCEPTION 'U1-B rollback requires exactly 6 rows';
  END IF;

  IF (
    SELECT COUNT(DISTINCT payload.id)
    FROM jsonb_to_recordset(p_rows) AS payload(id UUID, image TEXT)
    JOIN (VALUES
      ('286f0b05-bc0c-4678-b1f0-34147616efd6'::UUID, '42c79adbb5a55873174a4d359247ffbe8673e6aab0a5eccb5522971522a7005a'),
      ('9b0a6a5f-b932-4361-9ba0-20b9121c2e5c'::UUID, '71bed702c001feae2c135479a1f41abf8ec3eb0bcb76453e5b53663bd25e1d8d'),
      ('9de22ca0-d610-4524-be41-a7d52f0efa31'::UUID, 'a5df598a766448b4028752df872f4432f72f7d7b068ff46d57c1da5ec414e09f'),
      ('a99a981d-9d12-4db8-9ba0-9b3ca43a4fdb'::UUID, 'cb813dd98016a537cebb44b4c20d8e28937454f37d716f9178d4cf7d558ed9f8'),
      ('b9596e30-6865-40e1-b759-ddaf16c23843'::UUID, '9d1d301ba5cab542f4f8977a0721cf5076cbff20d5df8f3f418dfe57552716a1'),
      ('ba8efd95-8536-4b78-9aed-21d8f5d847f3'::UUID, 'c7e0b47e8808ac83576f7e24ff2f2301e41241499cc6072d513b0788ae1ba0eb')
    ) AS approved(id, expected_hash) ON approved.id = payload.id
    WHERE payload.image IS NOT NULL
      AND encode(extensions.digest(convert_to(payload.image, 'UTF8'), 'sha256'), 'hex') = approved.expected_hash
  ) <> 6 THEN
    RAISE EXCEPTION 'U1-B rollback rows or hashes do not match the approved manifest';
  END IF;

  FOR v_row IN
    SELECT mi.id, mi.image, approved.expected_path
    FROM public.menu_items AS mi
    JOIN (VALUES
      ('286f0b05-bc0c-4678-b1f0-34147616efd6'::UUID, '/menu/migrated/boma-breakfast-286f0b05.webp'),
      ('9b0a6a5f-b932-4361-9ba0-20b9121c2e5c'::UUID, '/menu/migrated/braai-platter-for-2-9b0a6a5f.webp'),
      ('9de22ca0-d610-4524-be41-a7d52f0efa31'::UUID, '/menu/migrated/1-4-chicken-pap-and-gravy-9de22ca0.webp'),
      ('a99a981d-9d12-4db8-9ba0-9b3ca43a4fdb'::UUID, '/menu/migrated/200g-ribs-and-steak-a99a981d.webp'),
      ('b9596e30-6865-40e1-b759-ddaf16c23843'::UUID, '/menu/migrated/full-chicken-chips-and-4-rotis-b9596e30.webp'),
      ('ba8efd95-8536-4b78-9aed-21d8f5d847f3'::UUID, '/menu/migrated/boma-pastry-platter-ba8efd95.webp')
    ) AS approved(id, expected_path) ON approved.id = mi.id
    ORDER BY mi.id
    FOR UPDATE OF mi
  LOOP
    v_count := v_count + 1;
    IF v_row.image <> v_row.expected_path THEN
      RAISE EXCEPTION 'U1-B rollback current path mismatch for menu item %', v_row.id;
    END IF;
  END LOOP;
  IF v_count <> 6 THEN
    RAISE EXCEPTION 'U1-B rollback expected 6 menu rows, found %', v_count;
  END IF;

  UPDATE public.menu_items AS mi
  SET image = payload.image,
      updated_at = NOW()
  FROM jsonb_to_recordset(p_rows) AS payload(id UUID, image TEXT)
  WHERE mi.id = payload.id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 6 THEN
    RAISE EXCEPTION 'U1-B rollback expected to restore 6 rows, restored %', v_count;
  END IF;

  RETURN jsonb_build_object('outcome', 'rolled_back', 'updated', v_count);
END;
$$;

REVOKE ALL ON FUNCTION public.apply_u1b_menu_image_cutover() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rollback_u1b_menu_image_cutover(JSONB) FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.apply_u1b_menu_image_cutover() TO service_role;
    GRANT EXECUTE ON FUNCTION public.rollback_u1b_menu_image_cutover(JSONB) TO service_role;
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';
