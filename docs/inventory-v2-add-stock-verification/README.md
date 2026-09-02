# INV-4B Add Stock Verification

## Cutover

- Default `/inv/stock`: the single `+ ADD STOCK` action opens the guided direct-receipt workspace.
- Controlled rollback `/inv/stock?add-stock=legacy`: the same action invokes the prior blank spreadsheet row workflow.
- Normal mode does not show the legacy `+ Click to Add Item` footer action.

## Mutation Contract

- API: `POST /api/inventory/transactions`
- Permission: `inventory.approve`
- Canonical type: `purchase`
- Atomic writer: `create_inventory_transaction(JSONB)`
- Realtime invalidation: `stock.moved`
- Management actor: validated `boma_admin_session`, stored as `admin_actor_id` and `admin_actor_name`; request body/header actor values are ignored.

## Local Verification Safety

An authenticated read verified the live 416-item reference response and the selected item's linked Bottle UOM. The bounded browser run then used a page-local deterministic product/location fixture and intercepted both transaction attempts before the network. It created no product, movement, inventory audit row, or balance change. The temporary full-manager account and session were deleted after the run and verified absent.

## Evidence

- `browser-results.json`: 17/17 browser checks passed; two transaction attempts intercepted; zero product-creation requests.
- `01`-`10` PNGs: desktop loading/details/review/success/error, tablet loading/layout, mobile layout/empty state, and legacy rollback.
- `11-production-mobile.png`: deployed mobile modal after the final heading-contrast and site-chrome stacking correction.
- Focused INV-4B tests: 75/75.
- Existing Inventory V2 tests: 50/50.
- Full inventory suite: 562/562.
- Inventory strict TypeScript and root TypeScript: passed.
- Optimized Next production build: passed; 187 pages generated.
- Pre-cutover linked migration dry run: only `122_guided_stock_receipts.sql` pending.
- Linked schema lint: only the two documented pre-existing unused-variable warnings.

## Production Cutover

- Migration 122 applied; local and remote histories match through 122.
- Runtime commit: `90d3d0f`.
- Vercel deployment: `dpl_5baYi3WckaQc73RLGacT31n1ccC7`, Ready and aliased to `https://the-boma-cafe.vercel.app`.
- Live guided receipt: source quantity `2` at conversion `12` committed as canonical quantity `24`; source cost `120` committed as base cost `10`.
- Forged body/header actor and cost-centre values were ignored. Ledger and inventory audit stored `INV4B Live Probe`; the location cost centre remained authoritative.
- Balance cache was `24` and exactly one `stock.moved` signal was emitted.
- Deployed mobile checks: modal z-index `20000`, title/section color `rgb(248, 250, 252)`, no horizontal overflow, one Add Stock action, no normal-mode legacy footer.
- The disposable transaction, balance, audit, realtime signal, product/UOM link, account, and session were removed. Tagged residue was zero.
