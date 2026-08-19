# Menu Image Migration

This directory prepares the six production `menu_items.image` PNG data URIs for migration to normal static WebP files. The preparation and verification commands are read-only against Supabase. They do not upload objects or update rows.

## Prepare

```powershell
node --env-file=.env.local scripts/menu-image-migration/prepare.mjs
```

The command:

1. Reads only `id,name,image` rows whose image starts with `data:`.
2. Requires exactly six rows.
3. Verifies or writes exact PNG rollback copies under `originals/`.
4. Creates WebP files under `public/menu/migrated/` with quality 82 and a maximum width of 1600 pixels.
5. Rewrites `manifest.json` in deterministic ID order with source and output hashes.

`originals/` is excluded from Vercel uploads by `.vercelignore`. The optimized WebP files are application assets and use immutable cache headers.

## Proposed Production Sequence

Do not run this sequence without separate approval.

1. Re-run `prepare.mjs` against production and require a clean manifest/hash match.
2. Save a fresh external export of the six `id,name,image` rows as the rollback artifact.
3. Deploy the guarded public-menu code and six WebP files first. The manifest ID mapping preserves the existing images while the database still contains data URIs.
4. Verify `/api/menu/public`, `/api/menu/public/homepage`, and `/api/menu/public/waiter` contain no `data:` strings and all six WebP paths return HTTP 200.
5. In one database transaction, update each manifest `menuItemId` from its data URI to `proposedImage.finalPath`. Abort if any current data-URI SHA-256 differs from the manifest.
6. Verify the six rows contain the expected short paths and remeasure all three routes.

The application query excludes data URIs even before the database update. The production update removes the remaining database bloat and ensures admin menu reads no longer transfer the six inline PNGs.

## Controlled Cutover Tool

Use the service-role-only cutover functions from migration 101 through the guarded script:

```powershell
node --env-file=.env.local scripts/menu-image-migration/cutover.mjs preflight --export "C:\absolute\external\rollback-export.json"
node --env-file=.env.local scripts/menu-image-migration/cutover.mjs apply
node --env-file=.env.local scripts/menu-image-migration/cutover.mjs verify
```

`preflight` requires all six production data-URI hashes, PNG hashes, local rollback PNG hashes, reconstructed rollback data-URI hashes, optimized WebP hashes, and the complete inline-image ID set to match the approved manifest. It writes a create-only external export and fails rather than overwriting an existing rollback artifact.

Migration 101 creates the atomic functions but does not update any row when the migration is applied. `apply` locks and hash-checks all six rows before one guarded update. A mismatch or partial state rolls back the entire call.

## Rollback

1. Keep the guarded route code in place so no restored data URI can reach a public response.
2. Reconstruct each original value as `data:image/png;base64,<original file bytes>` using the manifest `rollback.originalFile`.
3. Verify the reconstructed string SHA-256 equals `rollback.expectedDataUriSha256`.
4. Restore all six values in one database transaction using the manifest `rollback.sqlTemplate` entries.
5. If the application deployment itself must also be rolled back, retain the six static WebP files until all caches and clients have returned to the previous deployment.

The controlled rollback command validates the external export against the approved manifest and restores all six rows through one transaction:

```powershell
node --env-file=.env.local scripts/menu-image-migration/cutover.mjs rollback --export "C:\absolute\external\rollback-export.json"
```

No production mutation or deployment was performed while creating this tooling.
