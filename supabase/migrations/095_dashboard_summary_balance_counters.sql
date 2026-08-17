-- 095_dashboard_summary_balance_counters.sql
-- O6 fix: make the dashboard summary product counters agree with the
-- Products views (/admin/operations/products, Food Products, Beverage
-- Products). The views compute "Below Par"/"Out of Stock" from live balances
-- (balance <= 0 -> out of stock; 0 < balance <= reorder_threshold -> low),
-- reading the balance cache via inventory_get_balance (O5, migration 094).
-- The combined_dashboard RPC (migration 072) hardcoded outOfStockCount = 0
-- and counted lowStockCount as "products with a reorder_threshold set"
-- (no balance comparison), so the dashboard always showed Out of Stock 0
-- while the views showed real counts.
--
-- Replay (migration history immutable - 072 NOT edited, same pattern as
-- 090/091): only the two summary counters change. Everything else is
-- byte-for-byte identical to 072, including the bug-for-bug parity notes
-- (today buckets all-location, alerts ledger-based, 'Unknown' fallback,
-- overdueCount = capped array length). Summary counters now read the same
-- balance cache the views read, scoped to p_location like the products API
-- (location_id=main).

create or replace function public.combined_dashboard(
  p_location uuid,
  p_days integer default 30,
  p_inventory_type text default null
) returns jsonb
language sql stable security definer set search_path = pg_catalog, public as $$
with
  prods as (
    select id, name, reorder_threshold
    from public.inventory_products
    where is_active
      and (p_inventory_type is null or inventory_type = p_inventory_type)
  ),
  cache_bal as (
    select product_id, balance
    from public.inventory_product_balances
    where location_id = p_location
  ),
  day_start as (
    select date_trunc('day', now()) as ts
  ),
  today_all as (
    select transaction_type, quantity
    from public.inventory_transactions, day_start
    where created_at >= day_start.ts
      and created_at < day_start.ts + interval '1 day'
      and (p_inventory_type is null or exists (
        select 1 from public.inventory_products pp
        where pp.id = inventory_transactions.product_id and pp.inventory_type = p_inventory_type))
  ),
  today_loc as (
    select transaction_type, quantity
    from public.inventory_transactions, day_start
    where location_id = p_location
      and created_at >= day_start.ts
      and created_at < day_start.ts + interval '1 day'
      and (p_inventory_type is null or exists (
        select 1 from public.inventory_products pp
        where pp.id = inventory_transactions.product_id and pp.inventory_type = p_inventory_type))
  ),
  balances as (
    select product_id, sum(quantity) as balance
    from public.inventory_transactions
    where location_id = p_location
    group by product_id
  ),
  sales30 as (
    select product_id, sum(abs(quantity)) as sold
    from public.inventory_transactions
    where location_id = p_location
      and transaction_type::text = 'sale'
      and created_at >= now() - make_interval(days => p_days)
      and (p_inventory_type is null or exists (
        select 1 from public.inventory_products pp
        where pp.id = inventory_transactions.product_id and pp.inventory_type = p_inventory_type))
    group by product_id
  ),
  value90 as (
    select product_id, sum(quantity) as qty, min(last_cost) as last_cost
    from (
      select product_id, quantity,
             first_value(unit_cost) over (
               partition by product_id
               order by (unit_cost is not null) desc, created_at desc
             ) as last_cost
      from public.inventory_transactions
      where location_id = p_location
        and created_at >= now() - interval '90 days'
    ) v
    group by product_id
  ),
  alerts as (
    select coalesce(jsonb_agg(x order by prio, nm), '[]'::jsonb) as arr from (
      select jsonb_build_object(
        'productId', p.id,
        'productName', p.name,
        'type', case
          when coalesce(b.balance, 0) < 0 then 'negative_balance'
          when p.reorder_threshold is not null and coalesce(b.balance, 0) <= p.reorder_threshold
               then case when coalesce(b.balance, 0) = 0 then 'out_of_stock' else 'low_stock' end
        end,
        'currentBalance', coalesce(b.balance, 0),
        'threshold', p.reorder_threshold
      ) as x,
      case
        when coalesce(b.balance, 0) < 0 then 0
        when p.reorder_threshold is not null and coalesce(b.balance, 0) <= p.reorder_threshold then 1
        else 2
      end as prio,
      p.name as nm
      from prods p
      left join balances b on b.product_id = p.id
      where coalesce(b.balance, 0) < 0
         or (p.reorder_threshold is not null and coalesce(b.balance, 0) <= p.reorder_threshold)
    ) x
  ),
  recent as (
    select coalesce(jsonb_agg(x order by c desc), '[]'::jsonb) as arr from (
      select jsonb_build_object(
        'id', t.id,
        'productName', coalesce(p.name, 'Unknown'),
        'transactionType', t.transaction_type,
        'quantity', t.quantity,
        'createdAt', t.created_at
      ) as x,
      t.created_at as c
      from public.inventory_transactions t
      left join public.inventory_products p on p.id = t.product_id
      where t.location_id = p_location
        and (p_inventory_type is null or exists (
          select 1 from public.inventory_products pp
          where pp.id = t.product_id and pp.inventory_type = p_inventory_type))
      order by t.created_at desc
      limit 10
    ) x
  ),
  movers as (
    select
      coalesce((select jsonb_agg(x order by k desc) from (
        select jsonb_build_object(
          'productId', s.product_id,
          'productName', coalesce(p.name, 'Unknown'),
          'totalSold', s.sold
        ) as x,
        s.sold as k
        from sales30 s
        left join public.inventory_products p on p.id = s.product_id
        order by s.sold desc
        limit 5
      ) x), '[]'::jsonb) as fast,
      coalesce((select jsonb_agg(x order by k, nm) from (
        select jsonb_build_object(
          'productId', p.id,
          'productName', p.name,
          'totalSold', coalesce(s.sold, 0)
        ) as x,
        coalesce(s.sold, 0) as k,
        p.name as nm
        from prods p
        left join sales30 s on s.product_id = p.id
        order by coalesce(s.sold, 0), p.name
        limit 5
      ) x), '[]'::jsonb) as slow
  ),
  today as (
    select coalesce(jsonb_agg(x order by k desc), '[]'::jsonb) as arr from (
      select jsonb_build_object(
        'type', transaction_type,
        'count', cnt,
        'totalQuantity', qty
      ) as x,
      cnt as k
      from (
        select transaction_type, count(*) as cnt, sum(quantity) as qty
        from today_loc
        group by transaction_type
      ) g
    ) x
  ),
  pos_open as (
    select count(*) as open_count
    from public.inventory_purchase_orders
    where status in ('ordered', 'partial')
  ),
  pos_overdue as (
    select coalesce(jsonb_agg(x order by e), '[]'::jsonb) as arr from (
      select jsonb_build_object(
        'id', po.id,
        'supplierName', coalesce(s.name, 'Unknown'),
        'expectedAt', po.expected_at
      ) as x,
      po.expected_at as e
      from (
        select id, supplier_id, expected_at
        from public.inventory_purchase_orders
        where status in ('ordered', 'partial')
          and expected_at < to_char(now(), 'YYYY-MM-DD')::date
        order by expected_at
        limit 5
      ) po
      left join public.inventory_suppliers s on s.id = po.supplier_id
    ) x
  ),
  pos_recent as (
    select coalesce(jsonb_agg(x order by c desc), '[]'::jsonb) as arr from (
      select jsonb_build_object(
        'id', po.id,
        'status', po.status,
        'supplierName', coalesce(s.name, 'Unknown'),
        'createdAt', po.created_at
      ) as x,
      po.created_at as c
      from (
        select id, status, supplier_id, created_at
        from public.inventory_purchase_orders
        where status in ('ordered', 'partial', 'received')
        order by created_at desc
        limit 5
      ) po
      left join public.inventory_suppliers s on s.id = po.supplier_id
    ) x
  )
select jsonb_build_object(
  'summary', jsonb_build_object(
    'inventoryValue', coalesce((select sum(qty * last_cost) from value90 where qty > 0 and last_cost is not null), 0),
    'totalProducts', (select count(*)::int from prods),
    'lowStockCount', (select count(*)::int from prods p
        left join cache_bal b on b.product_id = p.id
        where coalesce(b.balance, 0) > 0
          and p.reorder_threshold is not null
          and coalesce(b.balance, 0) <= p.reorder_threshold),
    'outOfStockCount', (select count(*)::int from prods p
        left join cache_bal b on b.product_id = p.id
        where coalesce(b.balance, 0) <= 0),
    'todayPurchases', coalesce((select sum(quantity) from today_all where quantity > 0 and transaction_type::text = 'purchase'), 0),
    'todaySales', coalesce((select sum(-quantity) from today_all where quantity < 0 and transaction_type::text = 'sale'), 0),
    'todayLoss', coalesce((select sum(-quantity) from today_all where quantity < 0 and transaction_type::text in ('breakage', 'spillage', 'waste', 'theft')), 0),
    'todayTransactions', (select count(*)::int from today_all),
    'variance', 0
  ),
  'alerts', (select arr from alerts),
  'recent', (select arr from recent),
  'fastMovers', (select fast from movers),
  'slowMovers', (select slow from movers),
  'inventoryValue', coalesce((select sum(qty * last_cost) from value90 where qty > 0 and last_cost is not null), 0),
  'todayTransactions', (select arr from today),
  'purchaseOrders', jsonb_build_object(
    'openCount', (select open_count from pos_open),
    'overdueCount', (select jsonb_array_length(arr) from pos_overdue),
    'overdue', (select arr from pos_overdue),
    'recent', (select arr from pos_recent)
  )
)
$$;

revoke all on function public.combined_dashboard(uuid, integer, text) from public, anon;
grant execute on function public.combined_dashboard(uuid, integer, text) to service_role;

notify pgrst, 'reload schema';
