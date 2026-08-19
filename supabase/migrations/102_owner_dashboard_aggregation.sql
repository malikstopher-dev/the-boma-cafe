-- U1 owner-dashboard aggregation.
-- Replaces the N+1 TypeScript request graph with one service-role-only read RPC.
-- The caller supplies the already-resolved UTC ranges so current period semantics stay unchanged.

CREATE OR REPLACE FUNCTION public.owner_dashboard(
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ,
  p_previous_start TIMESTAMPTZ,
  p_previous_end TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
WITH
  active_locations AS (
    SELECT id, name, created_at
    FROM public.inventory_locations
    WHERE is_active = true
  ),
  locations AS (
    SELECT id, name
    FROM active_locations
    ORDER BY name
  ),
  default_location AS (
    SELECT id
    FROM active_locations
    ORDER BY created_at
    LIMIT 1
  ),
  current_txns AS (
    SELECT
      t.location_id,
      t.product_id,
      t.quantity,
      t.unit_cost,
      t.transaction_type,
      t.created_at,
      p.inventory_type
    FROM public.inventory_transactions AS t
    LEFT JOIN public.inventory_products AS p ON p.id = t.product_id
    WHERE t.created_at >= p_start AND t.created_at < p_end
  ),
  previous_txns AS (
    SELECT
      t.quantity,
      t.unit_cost,
      t.transaction_type
    FROM public.inventory_transactions AS t
    WHERE t.created_at >= p_previous_start AND t.created_at < p_previous_end
  ),
  current_totals AS (
    SELECT
      COALESCE(SUM(ABS(quantity) * COALESCE(unit_cost, 0)) FILTER (WHERE transaction_type IN ('purchase', 'return') AND quantity > 0), 0) AS purchased,
      COALESCE(SUM(ABS(quantity) * COALESCE(unit_cost, 0)) FILTER (WHERE transaction_type IN ('sale', 'sale_bottle', 'comp', 'staff', 'production', 'waste', 'expiry_loss', 'spillage', 'theft', 'donation', 'stolen', 'gas_usage', 'breakage') AND quantity < 0), 0) AS used,
      COALESCE(SUM(ABS(quantity) * COALESCE(unit_cost, 0)) FILTER (WHERE transaction_type IN ('waste', 'expiry_loss', 'spillage', 'theft', 'donation', 'breakage') AND quantity < 0), 0) AS wastage,
      COALESCE(SUM(ABS(quantity) * COALESCE(unit_cost, 0)) FILTER (WHERE transaction_type = 'adjustment'), 0) AS adjustments
    FROM current_txns
  ),
  previous_totals AS (
    SELECT
      COALESCE(SUM(ABS(quantity) * COALESCE(unit_cost, 0)) FILTER (WHERE transaction_type IN ('purchase', 'return') AND quantity > 0), 0) AS purchased,
      COALESCE(SUM(ABS(quantity) * COALESCE(unit_cost, 0)) FILTER (WHERE transaction_type IN ('sale', 'sale_bottle', 'comp', 'staff', 'production', 'waste', 'expiry_loss', 'spillage', 'theft', 'donation', 'stolen', 'gas_usage', 'breakage') AND quantity < 0), 0) AS used,
      COALESCE(SUM(ABS(quantity) * COALESCE(unit_cost, 0)) FILTER (WHERE transaction_type IN ('waste', 'expiry_loss', 'spillage', 'theft', 'donation', 'breakage') AND quantity < 0), 0) AS wastage,
      COALESCE(SUM(ABS(quantity) * COALESCE(unit_cost, 0)) FILTER (WHERE transaction_type = 'adjustment'), 0) AS adjustments
    FROM previous_txns
  ),
  location_latest_cost AS (
    SELECT DISTINCT ON (location_id, product_id)
      location_id,
      product_id,
      unit_cost
    FROM public.inventory_transactions
    WHERE unit_cost IS NOT NULL
    ORDER BY location_id, product_id, created_at DESC
  ),
  location_values AS (
    SELECT
      l.id AS location_id,
      l.name,
      COUNT(b.product_id) FILTER (WHERE b.balance > 0)::INT AS items,
      COALESCE(SUM(b.balance * COALESCE(c.unit_cost, 0)) FILTER (WHERE b.balance > 0), 0) AS value
    FROM locations AS l
    LEFT JOIN public.inventory_product_balances AS b ON b.location_id = l.id
    LEFT JOIN location_latest_cost AS c ON c.location_id = b.location_id AND c.product_id = b.product_id
    GROUP BY l.id, l.name
  ),
  location_movement AS (
    SELECT
      location_id,
      COALESCE(SUM(ABS(quantity) * COALESCE(unit_cost, 0)) FILTER (WHERE transaction_type IN ('purchase', 'return') AND quantity > 0), 0)
        - COALESCE(SUM(ABS(quantity) * COALESCE(unit_cost, 0)) FILTER (WHERE transaction_type IN ('sale', 'sale_bottle', 'comp', 'staff', 'production', 'waste', 'expiry_loss', 'spillage', 'theft', 'donation', 'stolen', 'gas_usage', 'breakage') AND quantity < 0), 0) AS movement
    FROM current_txns
    GROUP BY location_id
  ),
  location_rows AS (
    SELECT
      lv.location_id,
      lv.name,
      lv.items,
      lv.value,
      CASE WHEN SUM(lv.value) OVER () > 0 THEN ROUND((lv.value / SUM(lv.value) OVER () * 100)::NUMERIC, 1) ELSE 0 END AS pct,
      COALESCE(lm.movement, 0) AS movement
    FROM location_values AS lv
    LEFT JOIN location_movement AS lm ON lm.location_id = lv.location_id
  ),
  active_suppliers AS (
    SELECT id, name
    FROM public.inventory_suppliers
    WHERE is_active = true
  ),
  calendar_ranges AS (
    SELECT
      date_trunc('week', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' AS week_start,
      (date_trunc('week', NOW() AT TIME ZONE 'UTC') + INTERVAL '7 days') AT TIME ZONE 'UTC' AS week_end,
      date_trunc('month', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' AS month_start,
      (date_trunc('month', NOW() AT TIME ZONE 'UTC') + INTERVAL '1 month') AT TIME ZONE 'UTC' AS month_end
  ),
  invoice_totals AS (
    SELECT
      s.id AS supplier_id,
      COALESCE(SUM(i.total_amount) FILTER (WHERE i.invoice_date >= cr.week_start::DATE AND i.invoice_date < cr.week_end::DATE), 0) AS week,
      COALESCE(SUM(i.total_amount) FILTER (WHERE i.invoice_date >= cr.month_start::DATE AND i.invoice_date < cr.month_end::DATE), 0) AS month
    FROM active_suppliers AS s
    CROSS JOIN calendar_ranges AS cr
    LEFT JOIN public.inventory_supplier_invoices AS i ON i.supplier_id = s.id
    GROUP BY s.id
  ),
  open_invoice_payments AS (
    SELECT
      i.supplier_id,
      i.id,
      i.total_amount,
      COALESCE(SUM(p.amount), 0) AS paid
    FROM public.inventory_supplier_invoices AS i
    LEFT JOIN public.inventory_supplier_payments AS p ON p.invoice_id = i.id
    WHERE i.status IN ('pending', 'partial', 'overdue')
    GROUP BY i.supplier_id, i.id, i.total_amount
  ),
  supplier_rows AS (
    SELECT
      s.id AS supplier_id,
      s.name AS supplier_name,
      it.week,
      it.month,
      COALESCE(SUM(GREATEST(oip.total_amount - oip.paid, 0)), 0) AS outstanding
    FROM active_suppliers AS s
    JOIN invoice_totals AS it ON it.supplier_id = s.id
    LEFT JOIN open_invoice_payments AS oip ON oip.supplier_id = s.id
    GROUP BY s.id, s.name, it.week, it.month
  ),
  period_payments AS (
    SELECT amount, paid_at, invoice_id
    FROM public.inventory_supplier_payments
    WHERE paid_at >= p_start AND paid_at < p_end
  ),
  previous_payment_total AS (
    SELECT COALESCE(SUM(amount), 0) AS amount
    FROM public.inventory_supplier_payments
    WHERE paid_at >= p_previous_start AND paid_at < p_previous_end
  ),
  latest_global_cost AS (
    SELECT DISTINCT ON (product_id) product_id, unit_cost
    FROM public.inventory_transactions
    WHERE unit_cost IS NOT NULL
    ORDER BY product_id, created_at DESC
  ),
  group_values AS (
    SELECT
      CASE
        WHEN p.inventory_type = 'FOOD' THEN 'food'
        WHEN p.inventory_type = 'BEVERAGE' THEN 'beverage'
        WHEN p.inventory_type = 'GAS' THEN 'gas'
        ELSE 'general'
      END AS group_key,
      COUNT(b.product_id) FILTER (WHERE b.balance > 0)::INT AS items,
      COALESCE(SUM(b.balance * COALESCE(c.unit_cost, 0)) FILTER (WHERE b.balance > 0), 0) AS value
    FROM public.inventory_products AS p
    LEFT JOIN public.inventory_product_balances AS b ON b.product_id = p.id
    LEFT JOIN latest_global_cost AS c ON c.product_id = p.id
    WHERE p.is_active = true
    GROUP BY 1
  ),
  group_movement AS (
    SELECT
      CASE
        WHEN inventory_type = 'FOOD' THEN 'food'
        WHEN inventory_type = 'BEVERAGE' THEN 'beverage'
        WHEN inventory_type = 'GAS' THEN 'gas'
        ELSE 'general'
      END AS group_key,
      COALESCE(SUM(ABS(quantity) * COALESCE(unit_cost, 0)) FILTER (WHERE transaction_type IN ('purchase', 'return') AND quantity > 0), 0) AS purchased,
      COALESCE(SUM(ABS(quantity) * COALESCE(unit_cost, 0)) FILTER (WHERE transaction_type IN ('sale', 'sale_bottle', 'comp', 'staff', 'production', 'waste', 'expiry_loss', 'spillage', 'theft', 'donation', 'stolen', 'gas_usage', 'breakage') AND quantity < 0), 0) AS used,
      COALESCE(SUM(ABS(quantity) * COALESCE(unit_cost, 0)) FILTER (WHERE transaction_type IN ('waste', 'expiry_loss', 'spillage', 'theft', 'donation', 'breakage') AND quantity < 0), 0) AS wastage
    FROM current_txns
    GROUP BY 1
  ),
  gas_cylinders AS (
    SELECT COALESCE(SUM(b.balance), 0) AS cylinders
    FROM public.inventory_product_balances AS b
    JOIN public.inventory_products AS p ON p.id = b.product_id
    WHERE p.is_active = true AND p.inventory_type = 'GAS'
  ),
  default_balances AS (
    SELECT t.product_id, COALESCE(SUM(t.quantity), 0) AS balance
    FROM public.inventory_transactions AS t
    JOIN default_location AS dl ON dl.id = t.location_id
    GROUP BY t.product_id
  ),
  stock_alerts AS (
    SELECT
      CASE WHEN COALESCE(b.balance, 0) < 0 THEN 0 WHEN COALESCE(b.balance, 0) = 0 THEN 1 ELSE 2 END AS priority,
      jsonb_build_object(
        'severity', CASE WHEN COALESCE(b.balance, 0) < 0 OR COALESCE(b.balance, 0) = 0 THEN 'high' ELSE 'medium' END,
        'message', p.name || ' — ' || CASE WHEN COALESCE(b.balance, 0) = 0 THEN 'out of stock' ELSE 'low stock' END || ' (' || COALESCE(b.balance, 0)::TEXT || ' on hand)',
        'href', '/inv/products'
      ) AS payload
    FROM public.inventory_products AS p
    LEFT JOIN default_balances AS b ON b.product_id = p.id
    WHERE p.is_active = true
      AND (COALESCE(b.balance, 0) < 0 OR (p.reorder_threshold IS NOT NULL AND COALESCE(b.balance, 0) <= p.reorder_threshold))
    ORDER BY priority
    LIMIT 4
  ),
  alert_rows AS (
    SELECT 1 AS sort_key, payload FROM stock_alerts
    UNION ALL
    SELECT 2, jsonb_build_object('severity', 'medium', 'message', COUNT(*)::TEXT || CASE WHEN COUNT(*) = 1 THEN ' delivery awaiting verification' ELSE ' deliveries awaiting verification' END, 'href', '/inv/purchases')
    FROM public.inventory_po_receipts WHERE verification_status = 'pending' HAVING COUNT(*) > 0
    UNION ALL
    SELECT 3, jsonb_build_object('severity', 'low', 'message', COUNT(*)::TEXT || CASE WHEN COUNT(*) = 1 THEN ' supplier invoice open' ELSE ' supplier invoices open' END, 'href', '/inv/suppliers')
    FROM public.inventory_supplier_invoices WHERE status IN ('pending', 'partial', 'overdue') HAVING COUNT(*) > 0
    UNION ALL
    SELECT 4, jsonb_build_object('severity', 'medium', 'message', 'A stock count is awaiting approval', 'href', '/inv/stock-counts')
    FROM public.inventory_stock_counts WHERE status = 'submitted' HAVING COUNT(*) > 0
  ),
  activity_rows AS (
    SELECT
      t.created_at AS at,
      jsonb_build_object(
        'kind', COALESCE(t.transaction_type, 'movement'),
        'description', COALESCE(p.name, 'Item') || ' (' || CASE WHEN t.quantity > 0 THEN '+' ELSE '' END || t.quantity::TEXT || ')',
        'person', ''
      ) AS payload
    FROM public.inventory_transactions AS t
    LEFT JOIN public.inventory_products AS p ON p.id = t.product_id
    ORDER BY t.created_at DESC
    LIMIT 8
  ),
  payment_activity AS (
    SELECT
      p.paid_at AS at,
      jsonb_build_object('kind', 'payment', 'description', 'Supplier payment R' || COALESCE(p.amount, 0)::TEXT, 'person', '') AS payload
    FROM public.inventory_supplier_payments AS p
    ORDER BY p.paid_at DESC
    LIMIT 3
  ),
  movement_rows AS (
    SELECT
      TO_CHAR(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date,
      ROUND(COALESCE(SUM(ABS(quantity) * COALESCE(unit_cost, 0)) FILTER (WHERE transaction_type IN ('purchase', 'return') AND quantity > 0), 0)::NUMERIC, 2) AS purchased,
      ROUND(COALESCE(SUM(ABS(quantity) * COALESCE(unit_cost, 0)) FILTER (WHERE transaction_type IN ('sale', 'sale_bottle', 'comp', 'staff', 'production', 'waste', 'expiry_loss', 'spillage', 'theft', 'donation', 'stolen', 'gas_usage', 'breakage') AND quantity < 0), 0)::NUMERIC, 2) AS used
    FROM current_txns
    GROUP BY 1
  ),
  stock_value_previous AS (
    SELECT stock_value
    FROM public.inventory_daily_snapshots
    WHERE date IN ((p_previous_start AT TIME ZONE 'UTC')::DATE, ((p_previous_start - INTERVAL '1 day') AT TIME ZONE 'UTC')::DATE)
    ORDER BY date DESC
    LIMIT 1
  ),
  management_activity AS (
    SELECT id, admin_name, admin_role, action, target_type, created_at
    FROM public.admin_audit_log
    ORDER BY created_at DESC
    LIMIT 10
  )
SELECT jsonb_build_object(
  'location', (SELECT id FROM default_location),
  'locationName', COALESCE((SELECT l.name FROM locations AS l JOIN default_location AS dl ON dl.id = l.id), 'All locations'),
  'kpi', jsonb_build_object(
    'purchased', (SELECT purchased FROM current_totals),
    'used', (SELECT used FROM current_totals),
    'wastage', (SELECT wastage FROM current_totals),
    'adjustments', (SELECT adjustments FROM current_totals),
    'stockValue', COALESCE((SELECT SUM(value) FROM location_values), 0),
    'supplierPayments', COALESCE((SELECT SUM(amount) FROM period_payments), 0),
    'supplierOutstanding', COALESCE((SELECT SUM(outstanding) FROM supplier_rows), 0),
    'purchasedPrev', (SELECT purchased FROM previous_totals),
    'usedPrev', (SELECT used FROM previous_totals),
    'wastagePrev', (SELECT wastage FROM previous_totals),
    'adjustmentsPrev', (SELECT adjustments FROM previous_totals),
    'stockValuePrev', (SELECT stock_value FROM stock_value_previous)
  ),
  'locations', COALESCE((SELECT jsonb_agg(jsonb_build_object('locationId', location_id, 'name', name, 'items', items, 'value', value, 'pct', pct, 'movement', movement) ORDER BY name) FROM location_rows), '[]'::JSONB),
  'suppliers', COALESCE((SELECT jsonb_agg(jsonb_build_object('supplierId', supplier_id, 'supplierName', supplier_name, 'week', week, 'month', month, 'outstanding', outstanding) ORDER BY supplier_name) FROM supplier_rows), '[]'::JSONB),
  'supplierTotal', (SELECT COUNT(*)::INT FROM supplier_rows),
  'recentPayments', COALESCE((SELECT jsonb_agg(jsonb_build_object('supplierId', i.supplier_id, 'supplierName', COALESCE(s.name, 'Unknown supplier'), 'amount', pp.amount, 'at', pp.paid_at) ORDER BY pp.paid_at DESC) FROM (SELECT * FROM period_payments ORDER BY paid_at DESC LIMIT 25) AS pp LEFT JOIN public.inventory_supplier_invoices AS i ON i.id = pp.invoice_id LEFT JOIN public.inventory_suppliers AS s ON s.id = i.supplier_id), '[]'::JSONB),
  'boards', jsonb_build_array(
    jsonb_build_object('key', 'food', 'label', 'Kitchen Stock', 'href', '/admin/operations/food/products', 'items', COALESCE((SELECT items FROM group_values WHERE group_key = 'food'), 0), 'value', COALESCE((SELECT value FROM group_values WHERE group_key = 'food'), 0), 'purchased', COALESCE((SELECT purchased FROM group_movement WHERE group_key = 'food'), 0), 'used', COALESCE((SELECT used FROM group_movement WHERE group_key = 'food'), 0), 'wastage', COALESCE((SELECT wastage FROM group_movement WHERE group_key = 'food'), 0), 'cylinders', NULL),
    jsonb_build_object('key', 'beverage', 'label', 'Bar Stock', 'href', '/admin/operations/beverage/products', 'items', COALESCE((SELECT items FROM group_values WHERE group_key = 'beverage'), 0), 'value', COALESCE((SELECT value FROM group_values WHERE group_key = 'beverage'), 0), 'purchased', COALESCE((SELECT purchased FROM group_movement WHERE group_key = 'beverage'), 0), 'used', COALESCE((SELECT used FROM group_movement WHERE group_key = 'beverage'), 0), 'wastage', COALESCE((SELECT wastage FROM group_movement WHERE group_key = 'beverage'), 0), 'cylinders', NULL),
    jsonb_build_object('key', 'general', 'label', 'General Stock', 'href', '/admin/operations/products', 'items', COALESCE((SELECT items FROM group_values WHERE group_key = 'general'), 0), 'value', COALESCE((SELECT value FROM group_values WHERE group_key = 'general'), 0), 'purchased', COALESCE((SELECT purchased FROM group_movement WHERE group_key = 'general'), 0), 'used', COALESCE((SELECT used FROM group_movement WHERE group_key = 'general'), 0), 'wastage', COALESCE((SELECT wastage FROM group_movement WHERE group_key = 'general'), 0), 'cylinders', NULL),
    jsonb_build_object('key', 'gas', 'label', 'Gas Tracker', 'href', '/admin/operations/gas', 'items', COALESCE((SELECT items FROM group_values WHERE group_key = 'gas'), 0), 'value', COALESCE((SELECT value FROM group_values WHERE group_key = 'gas'), 0), 'purchased', COALESCE((SELECT purchased FROM group_movement WHERE group_key = 'gas'), 0), 'used', COALESCE((SELECT used FROM group_movement WHERE group_key = 'gas'), 0), 'wastage', COALESCE((SELECT wastage FROM group_movement WHERE group_key = 'gas'), 0), 'cylinders', (SELECT cylinders FROM gas_cylinders))
  ),
  'alerts', COALESCE((SELECT jsonb_agg(payload ORDER BY sort_key) FROM alert_rows), '[]'::JSONB),
  'activity', COALESCE((SELECT jsonb_agg(payload || jsonb_build_object('at', at) ORDER BY at DESC) FROM (SELECT * FROM activity_rows UNION ALL SELECT * FROM payment_activity ORDER BY at DESC LIMIT 10) AS activity), '[]'::JSONB),
  'movement', COALESCE((SELECT jsonb_agg(jsonb_build_object('date', date, 'purchased', purchased, 'used', used) ORDER BY date) FROM movement_rows), '[]'::JSONB),
  'supplierPaymentsEnabled', true,
  'managementActivity', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', id, 'admin_name', admin_name, 'admin_role', admin_role, 'action', action, 'target_type', target_type, 'created_at', created_at) ORDER BY created_at DESC) FROM management_activity), '[]'::JSONB)
);
$$;

REVOKE ALL ON FUNCTION public.owner_dashboard(TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.owner_dashboard(TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';
