-- 068_sheet_cells.sql
-- Excel-style Stock Sheet persistence.
-- inventory_sheets  = one spreadsheet per (tab_type, location, week, year)
-- sheet_cells       = atomic per-cell values (draft rows, notes, user formulas)
-- reindex_sheet_cells() = shift row indexes after an Excel-style insert/delete
--                         (row_idx is positional, so inserting a row at the top
--                          moves every row below it down by one).

create table if not exists public.inventory_sheets (
  id uuid primary key default gen_random_uuid(),
  tab_type text not null,                          -- 'bar' | 'kitchen'
  location_id uuid references public.inventory_locations(id) on delete cascade,
  week int not null,
  year int not null,
  name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (tab_type, location_id, week, year)
);

create table if not exists public.sheet_cells (
  id uuid primary key default gen_random_uuid(),
  sheet_id uuid not null references public.inventory_sheets(id) on delete cascade,
  row_idx int not null,                            -- 0-based position in the grid
  col_key text not null,                           -- sku | productName | price | notes | ...
  raw_value text not null default '',
  data_type text not null default 'string',        -- string | number | formula
  updated_at timestamptz default now(),
  unique (sheet_id, row_idx, col_key)
);

create index if not exists sheet_cells_sheet_idx on public.sheet_cells (sheet_id, row_idx);

-- Row indexes are positional: when a row is inserted or deleted above a cell,
-- every cell at or below that index must shift.
create or replace function public.reindex_sheet_cells(p_sheet uuid, p_from int, p_shift int)
returns void
language sql
security definer
set search_path = public
as $$
  update public.sheet_cells
     set row_idx = row_idx + p_shift
   where sheet_id = p_sheet
     and row_idx >= p_from;
$$;

alter table public.inventory_sheets enable row level security;
alter table public.sheet_cells enable row level security;

-- Service-role (getInventoryClient) bypasses RLS; no policies are granted to
-- anon/authenticated, matching the rest of the inventory engine.