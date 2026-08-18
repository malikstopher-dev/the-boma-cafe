-- 099_product_imports.sql
-- E1A: Smart Product Import - records every batch product import so it can be
-- undone ("Undo Last Import" until the next import). Products-only: NO ledger
-- movements are ever created by an import (creates/updates happen through the
-- same validation + audit paths as the products API).
--
-- Undo semantics:
--   - created_ids: products created by the import. Undo hard-deletes them when
--     they have no transactions (same rule as DELETE /products/[id]); otherwise
--     archives them (is_active=false + deleted_at) so history stays intact.
--   - updated_snapshots: [{ product_id, before: {...} }] captured before each
--     update. Undo restores those fields verbatim.
--   - status 'rolled_back' marks an undone import; only the latest 'applied'
--     import can be undone (one undo slot).

create table if not exists public.inventory_product_imports (
  id                    uuid primary key default gen_random_uuid(),
  filename              text not null,
  sheet_name            text,
  inventory_type        text not null default 'GENERAL'
                        check (inventory_type in ('FOOD','BEVERAGE','CLEANING','PACKAGING','GENERAL')),
  status                text not null default 'applied'
                        check (status in ('applied','rolled_back')),
  created_by_admin_id   uuid references admin_accounts(id) on delete set null,
  created_ids           uuid[] not null default '{}',
  updated_ids           uuid[] not null default '{}',
  updated_snapshots     jsonb not null default '[]'::jsonb,
  created_at            timestamptz not null default now()
);

create index if not exists idx_product_imports_status_created
  on public.inventory_product_imports (status, created_at desc);

alter table public.inventory_product_imports enable row level security;

-- E1A products imports are created by the service-role engine (the same client
-- every inventory route uses). Block direct public/anon/authenticated access.
revoke all on public.inventory_product_imports from public, anon, authenticated;
