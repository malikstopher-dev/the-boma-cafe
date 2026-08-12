-- 070_stock_sheet_aggregates.sql
-- Stock-sheet egress fix (R1): replace the engine's up-to-10k-row ledger
-- downloads with server-side aggregation.
--
-- PostgREST aggregates are disabled on this project ("Use of aggregate
-- functions is not allowed"), so aggregation lives in these two stable RPCs.
-- Sign-split sums preserve the engine's exact per-row bucketing semantics:
--   received = positive rows of purchase/return (+ production +)
--   used     = negative rows of sale/comp/staff (+ production -)
--   waste    = negative rows of waste types
--   adjust   = net (positive + negative) of everything else
--
-- security definer + search_path so service-role callers work regardless of
-- RLS; parameters mirror the old query shapes (p_location NULL = all).

create or replace function public.stock_sheet_opening(
  p_start timestamptz,
  p_location uuid
) returns table (
  product_id uuid,
  opening numeric
) language sql stable security definer set search_path = pg_catalog, public as $$
  select t.product_id, sum(t.quantity) as opening
  from public.inventory_transactions t
  where t.created_at < p_start
    and (p_location is null or t.location_id = p_location)
  group by t.product_id
$$;

create or replace function public.stock_sheet_movements(
  p_start timestamptz,
  p_end timestamptz,
  p_location uuid
) returns table (
  product_id uuid,
  transaction_type text,
  positive_qty numeric,
  negative_qty numeric
) language sql stable security definer set search_path = pg_catalog, public as $$
  select
    t.product_id,
    t.transaction_type::text,
    sum(t.quantity) filter (where t.quantity > 0) as positive_qty,
    sum(t.quantity) filter (where t.quantity < 0) as negative_qty
  from public.inventory_transactions t
  where t.created_at >= p_start
    and t.created_at < p_end
    and (p_location is null or t.location_id = p_location)
  group by t.product_id, t.transaction_type
$$;

revoke all on function public.stock_sheet_opening(timestamptz, uuid) from public, anon;
revoke all on function public.stock_sheet_movements(timestamptz, timestamptz, uuid) from public, anon;
grant execute on function public.stock_sheet_opening(timestamptz, uuid) to service_role;
grant execute on function public.stock_sheet_movements(timestamptz, timestamptz, uuid) to service_role;