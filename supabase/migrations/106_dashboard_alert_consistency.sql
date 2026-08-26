-- Keep Dashboard, Owner Dashboard, Products counters, and Forecast on the
-- same location balance source for zero/low-stock attention.
-- Existing aggregate functions remain immutable; wrappers provide the fixed
-- alert projection without duplicating their large aggregation bodies.

CREATE OR REPLACE FUNCTION public.inventory_stock_alerts(
  p_location UUID,
  p_inventory_type TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
WITH ordered AS (
  SELECT
    jsonb_build_object(
      'productId', p.id,
      'productName', p.name,
      'type', CASE
        WHEN COALESCE(b.balance, 0) < 0 THEN 'negative_balance'
        WHEN COALESCE(b.balance, 0) = 0 THEN 'out_of_stock'
        ELSE 'low_stock'
      END,
      'currentBalance', COALESCE(b.balance, 0),
      'threshold', p.reorder_threshold
    ) AS payload,
    CASE
      WHEN COALESCE(b.balance, 0) < 0 THEN 0
      WHEN COALESCE(b.balance, 0) = 0 THEN 1
      ELSE 2
    END AS priority,
    p.name
  FROM public.inventory_products AS p
  LEFT JOIN public.inventory_product_balances AS b
    ON b.product_id = p.id
   AND b.location_id = p_location
  WHERE p.is_active = true
    AND (p_inventory_type IS NULL OR p.inventory_type = p_inventory_type)
    AND (
      COALESCE(b.balance, 0) <= 0
      OR (p.reorder_threshold IS NOT NULL AND COALESCE(b.balance, 0) <= p.reorder_threshold)
    )
), limited AS (
  SELECT payload, priority, name
  FROM ordered
  ORDER BY priority, name
  LIMIT COALESCE(p_limit, 2147483647)
)
SELECT COALESCE(jsonb_agg(payload ORDER BY priority, name), '[]'::JSONB)
FROM limited;
$$;

REVOKE ALL ON FUNCTION public.inventory_stock_alerts(UUID, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.inventory_stock_alerts(UUID, TEXT, INTEGER) TO service_role;

CREATE OR REPLACE FUNCTION public.combined_dashboard_consistent(
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
SELECT jsonb_set(
  public.combined_dashboard(p_location, p_days, p_inventory_type),
  '{alerts}',
  public.inventory_stock_alerts(p_location, p_inventory_type, NULL),
  true
);
$$;

REVOKE ALL ON FUNCTION public.combined_dashboard_consistent(UUID, INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.combined_dashboard_consistent(UUID, INTEGER, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.owner_dashboard_consistent(
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
  SELECT public.owner_dashboard(p_start, p_end, p_previous_start, p_previous_end) AS payload
), target AS (
  SELECT COALESCE(
    NULLIF((SELECT payload ->> 'location' FROM base), '')::UUID,
    (SELECT id FROM public.inventory_locations WHERE is_active = true ORDER BY created_at LIMIT 1)
  ) AS location_id
), stock_alerts AS (
  SELECT
    jsonb_build_object(
      'severity', CASE
        WHEN alert ->> 'type' IN ('negative_balance', 'out_of_stock') THEN 'high'
        ELSE 'medium'
      END,
      'message', (alert ->> 'productName') || ' - ' ||
        CASE WHEN alert ->> 'type' = 'out_of_stock' THEN 'out of stock' ELSE 'low stock' END ||
        ' (' || (alert ->> 'currentBalance') || ' on hand)',
      'href', '/inv/products'
    ) AS payload,
    ordinality AS priority
  FROM jsonb_array_elements(
    public.inventory_stock_alerts((SELECT location_id FROM target), NULL, 4)
  ) WITH ORDINALITY AS alerts(alert, ordinality)
), retained_alerts AS (
  SELECT item AS payload, 1000 + ordinality AS priority
  FROM base,
       jsonb_array_elements(COALESCE(base.payload -> 'alerts', '[]'::JSONB))
       WITH ORDINALITY AS existing(item, ordinality)
  WHERE COALESCE(item ->> 'href', '') <> '/inv/products'
), merged_alerts AS (
  SELECT payload, priority FROM stock_alerts
  UNION ALL
  SELECT payload, priority FROM retained_alerts
)
SELECT jsonb_set(
  base.payload,
  '{alerts}',
  COALESCE(
    (SELECT jsonb_agg(payload ORDER BY priority) FROM merged_alerts),
    '[]'::JSONB
  ),
  true
)
FROM base;
$$;

REVOKE ALL ON FUNCTION public.owner_dashboard_consistent(TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.owner_dashboard_consistent(TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;

NOTIFY pgrst, 'reload schema';
