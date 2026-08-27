-- Batch 4 / M-06: canonical movement metrics for SQL-backed dashboards.

CREATE OR REPLACE FUNCTION public.inventory_movement_class(p_transaction_type TEXT, p_quantity NUMERIC)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN lower(COALESCE(p_transaction_type, '')) IN ('purchase', 'return', 'transfer_in') AND COALESCE(p_quantity, 0) > 0 THEN 'inbound'
    WHEN lower(COALESCE(p_transaction_type, '')) IN ('sale', 'sale_bottle') AND COALESCE(p_quantity, 0) < 0 THEN 'sold'
    WHEN lower(COALESCE(p_transaction_type, '')) IN ('comp', 'staff', 'gas_usage', 'production') AND COALESCE(p_quantity, 0) < 0 THEN 'internal_consumption'
    WHEN lower(COALESCE(p_transaction_type, '')) IN ('waste', 'breakage', 'spillage', 'expiry_loss', 'theft', 'stolen', 'donation') AND COALESCE(p_quantity, 0) < 0 THEN 'waste_loss'
    WHEN lower(COALESCE(p_transaction_type, '')) = 'adjustment' THEN 'adjustment'
    WHEN lower(COALESCE(p_transaction_type, '')) = 'physical_count' THEN 'physical_count'
    ELSE 'unclassified'
  END;
$$;

REVOKE ALL ON FUNCTION public.inventory_movement_class(TEXT, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.inventory_movement_class(TEXT, NUMERIC) TO service_role;

CREATE OR REPLACE FUNCTION public.owner_dashboard_canonical(
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
WITH base AS (
  SELECT public.owner_dashboard_consistent(p_start, p_end, p_previous_start, p_previous_end) AS payload
), current_rows AS (
  SELECT
    t.location_id,
    t.created_at,
    CASE
      WHEN p.inventory_type = 'FOOD' THEN 'food'
      WHEN p.inventory_type = 'BEVERAGE' THEN 'beverage'
      WHEN p.inventory_type = 'GAS' THEN 'gas'
      ELSE 'general'
    END AS group_key,
    public.inventory_movement_class(t.transaction_type, t.quantity) AS movement_class,
    ABS(t.quantity) * COALESCE(t.unit_cost, 0) AS value
  FROM public.inventory_transactions AS t
  LEFT JOIN public.inventory_products AS p ON p.id = t.product_id
  WHERE t.created_at >= p_start AND t.created_at < p_end
), previous_rows AS (
  SELECT
    public.inventory_movement_class(t.transaction_type, t.quantity) AS movement_class,
    ABS(t.quantity) * COALESCE(t.unit_cost, 0) AS value
  FROM public.inventory_transactions AS t
  WHERE t.created_at >= p_previous_start AND t.created_at < p_previous_end
), current_totals AS (
  SELECT
    COALESCE(SUM(value) FILTER (WHERE movement_class = 'inbound'), 0) AS purchased,
    COALESCE(SUM(value) FILTER (WHERE movement_class IN ('sold', 'internal_consumption')), 0) AS used,
    COALESCE(SUM(value) FILTER (WHERE movement_class = 'waste_loss'), 0) AS wastage,
    COALESCE(SUM(value) FILTER (WHERE movement_class = 'adjustment'), 0) AS adjustments
  FROM current_rows
), previous_totals AS (
  SELECT
    COALESCE(SUM(value) FILTER (WHERE movement_class = 'inbound'), 0) AS purchased,
    COALESCE(SUM(value) FILTER (WHERE movement_class IN ('sold', 'internal_consumption')), 0) AS used,
    COALESCE(SUM(value) FILTER (WHERE movement_class = 'waste_loss'), 0) AS wastage,
    COALESCE(SUM(value) FILTER (WHERE movement_class = 'adjustment'), 0) AS adjustments
  FROM previous_rows
), group_totals AS (
  SELECT
    group_key,
    COALESCE(SUM(value) FILTER (WHERE movement_class = 'inbound'), 0) AS purchased,
    COALESCE(SUM(value) FILTER (WHERE movement_class IN ('sold', 'internal_consumption')), 0) AS used,
    COALESCE(SUM(value) FILTER (WHERE movement_class = 'waste_loss'), 0) AS wastage
  FROM current_rows
  GROUP BY group_key
), location_totals AS (
  SELECT
    location_id,
    COALESCE(SUM(value) FILTER (WHERE movement_class = 'inbound'), 0)
      - COALESCE(SUM(value) FILTER (WHERE movement_class IN ('sold', 'internal_consumption', 'waste_loss')), 0) AS movement
  FROM current_rows
  GROUP BY location_id
), daily_totals AS (
  SELECT
    to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date,
    ROUND(COALESCE(SUM(value) FILTER (WHERE movement_class = 'inbound'), 0)::NUMERIC, 2) AS purchased,
    ROUND(COALESCE(SUM(value) FILTER (WHERE movement_class IN ('sold', 'internal_consumption')), 0)::NUMERIC, 2) AS used
  FROM current_rows
  GROUP BY 1
), canonical_locations AS (
  SELECT COALESCE(jsonb_agg(
    item || jsonb_build_object('movement', COALESCE(lt.movement, 0))
    ORDER BY item ->> 'name'
  ), '[]'::JSONB) AS payload
  FROM base,
       jsonb_array_elements(COALESCE(base.payload -> 'locations', '[]'::JSONB)) AS item
  LEFT JOIN location_totals AS lt ON lt.location_id = NULLIF(item ->> 'locationId', '')::UUID
), canonical_boards AS (
  SELECT COALESCE(jsonb_agg(
    item || jsonb_build_object(
      'purchased', COALESCE(gt.purchased, 0),
      'used', COALESCE(gt.used, 0),
      'wastage', COALESCE(gt.wastage, 0)
    )
  ), '[]'::JSONB) AS payload
  FROM base,
       jsonb_array_elements(COALESCE(base.payload -> 'boards', '[]'::JSONB)) AS item
  LEFT JOIN group_totals AS gt ON gt.group_key = item ->> 'key'
)
SELECT base.payload || jsonb_build_object(
  'kpi', (base.payload -> 'kpi') || jsonb_build_object(
    'purchased', current_totals.purchased,
    'used', current_totals.used,
    'wastage', current_totals.wastage,
    'adjustments', current_totals.adjustments,
    'purchasedPrev', previous_totals.purchased,
    'usedPrev', previous_totals.used,
    'wastagePrev', previous_totals.wastage,
    'adjustmentsPrev', previous_totals.adjustments
  ),
  'locations', canonical_locations.payload,
  'boards', canonical_boards.payload,
  'movement', COALESCE((
    SELECT jsonb_agg(jsonb_build_object('date', date, 'purchased', purchased, 'used', used) ORDER BY date)
    FROM daily_totals
  ), '[]'::JSONB)
)
FROM base, current_totals, previous_totals, canonical_locations, canonical_boards;
$$;

REVOKE ALL ON FUNCTION public.owner_dashboard_canonical(TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.owner_dashboard_canonical(TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;

CREATE OR REPLACE FUNCTION public.combined_dashboard_canonical(
  p_location UUID,
  p_days INTEGER DEFAULT 30,
  p_inventory_type TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
WITH base AS (
  SELECT public.combined_dashboard_consistent(p_location, p_days, p_inventory_type) AS payload
), today_rows AS (
  SELECT public.inventory_movement_class(t.transaction_type, t.quantity) AS movement_class, ABS(t.quantity) AS quantity
  FROM public.inventory_transactions AS t
  JOIN public.inventory_products AS p ON p.id = t.product_id
  WHERE t.created_at >= date_trunc('day', now())
    AND t.created_at < date_trunc('day', now()) + interval '1 day'
    AND (p_inventory_type IS NULL OR p.inventory_type = p_inventory_type)
), sold AS (
  SELECT t.product_id, SUM(ABS(t.quantity)) AS total_sold
  FROM public.inventory_transactions AS t
  JOIN public.inventory_products AS p ON p.id = t.product_id
  WHERE t.location_id = p_location
    AND t.created_at >= now() - make_interval(days => GREATEST(p_days, 1))
    AND public.inventory_movement_class(t.transaction_type, t.quantity) = 'sold'
    AND (p_inventory_type IS NULL OR p.inventory_type = p_inventory_type)
  GROUP BY t.product_id
), products AS (
  SELECT p.id, p.name, COALESCE(s.total_sold, 0) AS total_sold
  FROM public.inventory_products AS p
  LEFT JOIN sold AS s ON s.product_id = p.id
  WHERE p.is_active = true AND (p_inventory_type IS NULL OR p.inventory_type = p_inventory_type)
), fast AS (
  SELECT COALESCE(jsonb_agg(jsonb_build_object('productId', id, 'productName', name, 'totalSold', total_sold) ORDER BY total_sold DESC, name), '[]'::JSONB) AS payload
  FROM (SELECT * FROM products WHERE total_sold > 0 ORDER BY total_sold DESC, name LIMIT 5) AS ranked
), slow AS (
  SELECT COALESCE(jsonb_agg(jsonb_build_object('productId', id, 'productName', name, 'totalSold', total_sold) ORDER BY total_sold, name), '[]'::JSONB) AS payload
  FROM (SELECT * FROM products ORDER BY total_sold, name LIMIT 5) AS ranked
), today AS (
  SELECT
    COALESCE(SUM(quantity) FILTER (WHERE movement_class = 'inbound'), 0) AS received,
    COALESCE(SUM(quantity) FILTER (WHERE movement_class = 'sold'), 0) AS sold,
    COALESCE(SUM(quantity) FILTER (WHERE movement_class = 'waste_loss'), 0) AS loss
  FROM today_rows
)
SELECT base.payload || jsonb_build_object(
  'summary', (base.payload -> 'summary') || jsonb_build_object(
    'todayPurchases', today.received,
    'todaySales', today.sold,
    'todayLoss', today.loss
  ),
  'fastMovers', fast.payload,
  'slowMovers', slow.payload
)
FROM base, today, fast, slow;
$$;

REVOKE ALL ON FUNCTION public.combined_dashboard_canonical(UUID, INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.combined_dashboard_canonical(UUID, INTEGER, TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';
