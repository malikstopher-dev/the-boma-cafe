# Inventory UX Defect Reconciliation

Checkpoint: 2026-09-03

## Add Stock

The reported balance failure was not reproducible on the current deployment.
With a temporary full-manager account, selecting `fish` (SKU `0043`) and
`Kitchen` sent:

`GET /api/inventory/products/b99efd73-43da-4d0f-a6f2-c51f9bbc84d2?location_id=9a4323af-0118-4264-b9bd-474451719344`

The response was HTTP 200 and included `current_balance: -3`. The direct RPC
and ledger query returned the same value. The live database is therefore not
missing this balance.

The UI had a confirmed fail-open path: `productDetail?.current_balance` was
coerced to zero when the detail request failed or omitted the balance. The
preview could therefore show a projected balance from an unavailable current
balance. The client now rejects a missing/non-finite balance and displays
`Balance unavailable`; it cannot proceed to review from that state.

## Stock Sheet

The reported HTTP failure was not reproducible on the current deployment. A
tagged browser run against the current daily session sent:

- `DELETE /api/inventory/daily-stock/{sessionId}/items/{productId}` -> HTTP 200
- `POST /api/inventory/daily-stock/{sessionId}` with `{ productId, counted: 1 }` -> HTTP 200

The UI nevertheless contained a confirmed fail-open presentation path:

- Counted was written to local row state before the request completed.
- A missing `sessionId` silently returned without saving.
- A failed save called the success-style `flash()` helper and did not restore
  the prior Counted value, leaving Counted/Variance visible after failure.
- The delete-before-upsert call was not awaited, creating a possible race.

The client now requires a session, relies on the daily upsert without the
unnecessary delete, restores the previous Counted value on failure, and shows
failures through the red error path.

## Verification

The optimized local production build passed. Bounded browser checks against
that build passed for the injected balance failure, injected Counted-save
failure, real Counted save, and reload persistence. Evidence:

- `defect-add-stock-fail-closed.png`
- `defect-stock-save-failure.png`
- `defect-stock-save-success.png`

The full inventory/V2 test run passed with 615 tests. Inventory strict
TypeScript, root TypeScript, and `git diff --check` passed. Temporary admin,
session, daily-session, sheet, and count-item records were removed.

## Boundary

The exact historical server failure remains unconfirmed because the current
deployment returns successful responses for both workflows. No production
business rows were changed during this checkpoint; temporary admin/session and
daily-session probe residue was removed. Multi-item receiving and nested
product creation remain paused until a fresh owner reproduction or captured
failed request is available and the corrected client is manually verified on
the deployed build.
