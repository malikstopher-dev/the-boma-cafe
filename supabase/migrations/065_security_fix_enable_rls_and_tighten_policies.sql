-- ============================================================
-- Migration 065: SECURITY FIX — Enable RLS on all unprotected
-- tables and tighten over-permissive policies.
-- (Renamed from 061 to resolve a version collision with
-- 061_bar_items_alcohol_dinein_only.sql on the schema_migrations
-- PK; policies were already present on the production DB from a
-- manual application, so all CREATE POLICY statements below use
-- IF NOT EXISTS.)
--
-- Trigger: Supabase security advisor email (03 Aug 2026) flagged
-- `rls_disabled_in_public`. Live verification confirmed anon key
-- could read orders (42 rows), background_jobs (14),
-- inventory_transactions (13), inventory_products (3),
-- staff_profiles (1), drink_packages (5).
--
-- Root causes:
--   A) Migrations 038-059 create 39 tables but NEVER enable RLS.
--   B) staff_profiles SELECT/INSERT/UPDATE policies (029) lack a
--      TO clause -> default to PUBLIC (anon can read/write staff).
--   C) orders SELECT opened to public/anon USING(true) (033)
--      for Realtime -> leaks all order rows + customer PII.
--
-- Strategy:
--   - Enable RLS on every table missing it. The application NEVER
--     touches these tables from the browser; all access is via API
--     routes using getAdminClient() (service_role), which has
--     BYPASSRLS. Enabling RLS therefore breaks nothing.
--   - Restrict staff_profiles policies to authenticated. No
--     browser code reads staff_profiles (verified) -> safe.
--   - Keep orders anon SELECT (Realtime for kitchen/bar/waiter
--     boards) but DROP the redundant public duplicate from 033
--     and DROP the permissive orders_public_insert (003) — all
--     inserts go through /api/supabase/orders (service_role).
--   - Revoke base grants (anon, authenticated) on the 39 newly
--     RLS-protected tables so PostgREST hides them from the REST
--     surface entirely (defense-in-depth + smaller attack surface).
--     service_role keeps grants and bypasses RLS.
-- ============================================================

-- ============================================================
-- SECTION 1 — Enable RLS on the 39 tables missing it
-- (migrations 038-059). No policies needed: service_role bypasses
-- RLS; anon/authenticated get nothing by default once RLS is on.
-- ============================================================

DO $$
DECLARE
    t TEXT;
    missing TEXT[] := ARRAY[
        'background_jobs',
        'quote_versions',
        'order_items',
        'drink_package_products',
        'cost_centres',
        'bar_item_inventory_links',
        'bar_product_config',
        'inventory_audit_log',
        'inventory_categories',
        'inventory_checklist_instances',
        'inventory_checklist_items',
        'inventory_checklist_templates',
        'inventory_container_types',
        'inventory_daily_snapshots',
        'inventory_dashboard_cache',
        'inventory_import_mappings',
        'inventory_imports',
        'inventory_locations',
        'inventory_po_receipt_items',
        'inventory_po_receipts',
        'inventory_price_history',
        'inventory_product_balances',
        'inventory_product_uoms',
        'inventory_production_run_items',
        'inventory_production_runs',
        'inventory_products',
        'inventory_purchase_order_items',
        'inventory_purchase_orders',
        'inventory_recipe_ingredients',
        'inventory_recipe_outputs',
        'inventory_recipes',
        'inventory_reorder_rules',
        'inventory_reservations',
        'inventory_stock_count_items',
        'inventory_stock_counts',
        'inventory_suppliers',
        'inventory_transactions',
        'inventory_uom_conversions_global',
        'inventory_uoms'
    ];
BEGIN
    FOREACH t IN ARRAY missing LOOP
        EXECUTE format('ALTER TABLE IF EXISTS public.%I ENABLE ROW LEVEL SECURITY', t);
    END LOOP;
END $$;

-- ============================================================
-- SECTION 2 — staff_profiles policy tightening (migration 029).
-- The 3 policies have no TO clause -> default PUBLIC (anon can
-- SELECT/INSERT/UPDATE staff). Replace with authenticated-only.
-- No browser code reads/writes staff_profiles (verified audit),
-- so this breaks nothing.
-- ============================================================

ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_profiles_select"       ON public.staff_profiles;
DROP POLICY IF EXISTS "staff_profiles_insert"       ON public.staff_profiles;
DROP POLICY IF EXISTS "staff_profiles_update"       ON public.staff_profiles;
DROP POLICY IF EXISTS "staff_profiles_delete"       ON public.staff_profiles;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'staff_profiles'
      AND policyname = 'staff_profiles_authenticated_select'
  ) THEN
    EXECUTE 'CREATE POLICY "staff_profiles_authenticated_select"
      ON public.staff_profiles
      FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'staff_profiles'
      AND policyname = 'staff_profiles_authenticated_insert'
  ) THEN
    EXECUTE 'CREATE POLICY "staff_profiles_authenticated_insert"
      ON public.staff_profiles
      FOR INSERT TO authenticated WITH CHECK (true)';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'staff_profiles'
      AND policyname = 'staff_profiles_authenticated_update'
  ) THEN
    EXECUTE 'CREATE POLICY "staff_profiles_authenticated_update"
      ON public.staff_profiles
      FOR UPDATE TO authenticated USING (true) WITH CHECK (true)';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'staff_profiles'
      AND policyname = 'staff_profiles_authenticated_delete'
  ) THEN
    EXECUTE 'CREATE POLICY "staff_profiles_authenticated_delete"
      ON public.staff_profiles
      FOR DELETE TO authenticated USING (true)';
  END IF;
END $$;

-- ============================================================
-- SECTION 3 — orders: keep Realtime working, drop the public
-- duplicate and the permissive anon INSERT path.
--
-- The anon SELECT USING(true) (033) lets anyone read ALL orders
-- incl. customer PII. Realtime needs anon SELECT to publish rows
-- to the kitchen/bar/waiter displays, which have no identity. We
-- cannot scope anon rows without breaking Realtime. Resolution:
--   - Keep anon SELECT only (Realtime survives).
--   - DROP the TO public duplicate policy from 033.
--   - DROP orders_public_insert (003) — all inserts go through
--     /api/supabase/orders (service_role).
--   - Ensure no anon UPDATE/DELETE (already absent post-003).
--
-- Residual risk: anon can still SELECT orders. Mitigation deferred
-- to a future milestone (move customer PII columns out of the
-- Realtime-published rowset, or migrate KDS to authenticated
-- sessions). This migration does NOT change that residual — it
-- only removes the duplicate public policy and the unused anon
-- INSERT path. The advisor email's primary flag (RLS-disabled
-- tables) is fully resolved in Section 1.
-- ============================================================

DROP POLICY IF EXISTS "Allow public select orders"   ON public.orders;
DROP POLICY IF EXISTS "Allow anon insert orders"     ON public.orders;
DROP POLICY IF EXISTS "Allow anon update orders"     ON public.orders;
DROP POLICY IF EXISTS "Allow anon delete orders"     ON public.orders;
DROP POLICY IF EXISTS "orders_public_insert"         ON public.orders;

-- ============================================================
-- SECTION 4 — Revoke default grants from anon/authenticated on
-- the 39 newly-RLS-enabled tables. With RLS on AND no matching
-- policy the rows are already invisible, but revoking base grants
-- ALSO hides the table from the PostgREST REST surface (PostgREST
-- exposes a table to a role only if the role has ANY table
-- privilege) — better UX and smaller attack surface. service_role
-- keeps its grants (bypasses RLS).
-- ============================================================

DO $$
DECLARE
    t TEXT;
    missing TEXT[] := ARRAY[
        'background_jobs','quote_versions','order_items','drink_package_products',
        'cost_centres','bar_item_inventory_links','bar_product_config',
        'inventory_audit_log','inventory_categories','inventory_checklist_instances',
        'inventory_checklist_items','inventory_checklist_templates',
        'inventory_container_types','inventory_daily_snapshots','inventory_dashboard_cache',
        'inventory_import_mappings','inventory_imports','inventory_locations',
        'inventory_po_receipt_items','inventory_po_receipts','inventory_price_history',
        'inventory_product_balances','inventory_product_uoms','inventory_production_run_items',
        'inventory_production_runs','inventory_products','inventory_purchase_order_items',
        'inventory_purchase_orders','inventory_recipe_ingredients','inventory_recipe_outputs',
        'inventory_recipes','inventory_reorder_rules','inventory_reservations',
        'inventory_stock_count_items','inventory_stock_counts','inventory_suppliers',
        'inventory_transactions','inventory_uom_conversions_global','inventory_uoms'
    ];
BEGIN
    FOREACH t IN ARRAY missing LOOP
        EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    END LOOP;
END $$;

-- ============================================================
-- SECTION 5 — Hide staff_profiles from anon REST surface but
-- keep authenticated SELECT (so Supabase-Auth sessions, if used
-- later, still work). service_role unaffected.
-- ============================================================

REVOKE ALL ON public.staff_profiles FROM anon;
GRANT SELECT ON public.staff_profiles TO authenticated;

-- ============================================================
-- SECTION 6 — SECURITY DEFINER functions audit:
--   enqueue_background_job() (migration 060) is the only
--   SECURITY DEFINER function in the project. It is hardened:
--     search_path = pg_catalog, public
--     fully-qualified public.background_jobs.* references
--     p_job_type allow-list (pdf_generation only)
--     p_max_retries clamped 1..10
--     REVOKE ALL FROM PUBLIC/anon/authenticated
--     GRANT EXECUTE TO service_role only
--   No change needed.
-- ============================================================

-- ============================================================
-- SECTION 7 — Realtime publication: members are orders,
-- order_events, bookings, quotes, payments, notification_queue,
-- staff_messages, waiters. Realtime respects RLS — newly RLS'd
-- tables are NOT auto-published. None of the 39 newly-RLS-enabled
-- tables are in the publication (good — no change needed).
-- Existing members (orders, staff_messages, waiters, etc.) keep
-- their anon SELECT policies so Realtime continues to work.
-- ============================================================

-- End of migration 061
