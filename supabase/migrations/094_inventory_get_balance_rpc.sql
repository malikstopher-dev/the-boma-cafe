-- 094_inventory_get_balance_rpc.sql
-- O5: create the engine's designated primary balance reader.
--
-- ledger.ts:getCurrentBalance() has always called this RPC FIRST and fallen
-- back to summing inventory_transactions when it is absent. The function was
-- never created (missing from every migration), so every display path using
-- getCurrentBalance (product list, product detail) has silently used raw
-- ledger sums, while every other display surface (forecast, reorder, gas,
-- notifications, owner-dashboard boards, stock value) reads the
-- engine-maintained balance cache inventory_product_balances directly.
--
-- The two sources agree in the healthy steady state (every createTransaction
-- and every movement RPC upserts the cache in lockstep with the ledger), so
-- the inconsistency was latent until the 2026-08-15 ledger wipe (O1-D) left
-- the cache as the only surviving truth: the Food Products view then showed
-- 0 / out-of-stock for products every other Food surface showed in stock.
--
-- Design decision (O5): this RPC reads the balance cache - the platform-wide
-- display convention. The ledger remains the write-truth; createTransaction
-- validation (the F2/E1-4 insufficient-stock rule) is intentionally kept
-- ledger-sum based in the engine (ledger.ts ledgerSum), so this RPC only
-- affects DISPLAY reads and can never relax the deduction rule.
--
-- Security: same contract as every movement RPC - service-role only.

create or replace function public.inventory_get_balance(
  p_product_id uuid,
  p_location_id uuid
) returns numeric
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select coalesce(
    (select b.balance
       from public.inventory_product_balances b
      where b.product_id = p_product_id
        and b.location_id = p_location_id),
    0
  )::numeric
$$;

revoke all on function public.inventory_get_balance(uuid, uuid) from public, anon, authenticated;
grant execute on function public.inventory_get_balance(uuid, uuid) to service_role;

NOTIFY pgrst, 'reload schema';
