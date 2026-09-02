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
- Focused INV-4B tests: 75/75.
- Existing Inventory V2 tests: 50/50.
- Full inventory suite: 562/562.
- Inventory strict TypeScript and root TypeScript: passed.
- Optimized Next production build: passed; 187 pages generated.
- Linked migration dry run: only `122_guided_stock_receipts.sql` pending.
- Linked schema lint: only the two documented pre-existing unused-variable warnings.
