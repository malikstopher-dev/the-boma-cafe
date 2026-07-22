# ROLLBACK PLAN — CMS Audit Fixes (2026-07-12)

## Backup Artifacts

| Artifact | Location | Purpose |
|----------|----------|---------|
| Git branch | `backup/pre-cms-audit-20260712-110215` | Full snapshot of working tree before changes |
| Patch file | `backup-cms-audit.patch` | All 21 file diffs as a single patch |
| File list | `backup-modified-files.txt` | List of all 22 modified/added files |
| Migration | `supabase/migrations/023_fix_status_check_and_add_indexes.sql` | DB schema change (can be reverted) |

---

## How to Restore the Git Branch

To return to the exact pre-change state:

```bash
git checkout backup/pre-cms-audit-20260712-110215
```

To create a new branch from that snapshot:

```bash
git checkout -b restore-point backup/pre-cms-audit-20260712-110215
```

---

## How to Apply the Patch File

To re-apply all changes from scratch on a clean `main`:

```bash
git checkout main
git apply backup-cms-audit.patch
```

To apply with 3-way merge (resolves conflicts):

```bash
git apply --3way backup-cms-audit.patch
```

---

## How to Undo Each Commit (After They Are Made)

### If commits are already on `main`:

```bash
# Undo all 5 commits (soft reset — keeps files, removes commits)
git reset --soft HEAD~5

# Or hard reset (discards all changes)
git reset --hard HEAD~5
```

### If commits are on a feature branch:

```bash
# Revert individual commits in reverse order
git revert <commit-5-cleanup>
git revert <commit-4-revalidation>
git revert <commit-3-cms>
git revert <commit-2-database>
git revert <commit-1-security>
```

### If already pushed to production:

```bash
# Revert each commit individually and push
git revert --no-commit <commit-1-security>
git revert --no-commit <commit-2-database>
git revert --no-commit <commit-3-cms>
git revert --no-commit <commit-4-revalidation>
git revert --no-commit <commit-5-cleanup>
git commit -m "revert: rollback CMS audit changes"
git push origin main
```

---

## How to Revert Migration 023

The migration adds `served`/`rejected` to the orders status CHECK constraint
and adds two indexes. To revert:

```sql
-- Revert the CHECK constraint to original values
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'confirmed', 'preparing', 'packing', 'ready', 'completed', 'cancelled'));

-- Remove the indexes
DROP INDEX IF EXISTS idx_orders_status;
DROP INDEX IF EXISTS idx_orders_created_at;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
```

**Warning:** Reverting the CHECK constraint will cause any orders with
`served` or `rejected` status to fail future updates. Check first:

```sql
SELECT COUNT(*) FROM orders WHERE status IN ('served', 'rejected');
```

If count > 0, do NOT revert the constraint.

---

## How to Restore if Deployment Fails

### Scenario 1: Vercel build fails

```bash
# Revert to last known good commit
git revert HEAD
git push origin main
# Vercel will auto-deploy the reverted state
```

### Scenario 2: Runtime errors after deploy

```bash
# Option A: Revert the specific problematic commit
git revert <commit-hash>
git push origin main

# Option B: Restore entire backup branch to main
git checkout main
git reset --hard backup/pre-cms-audit-20260712-110215
git push --force origin main
```

**WARNING:** Force-pushing `main` will affect all collaborators.
Use only in emergencies.

### Scenario 3: Database migration causes issues

Run the SQL revert script above in the Supabase SQL Editor.
The code changes are backward-compatible with the old constraint
(the code only *adds* new statuses, it doesn't require them).

### Scenario 4: Need to restore individual files

```bash
# Restore a single file from the backup branch
git checkout backup/pre-cms-audit-20260712-110215 -- src/middleware.ts

# Or restore from the patch (requires manual extraction)
# Edit backup-cms-audit.patch to keep only the sections for the file you want
git apply --include="src/middleware.ts" backup-cms-audit.patch
```

---

## Verification After Rollback

```bash
# Confirm clean state
git status
npx tsc --noEmit
npx next build

# Confirm database is consistent
# Run in Supabase SQL Editor:
SELECT status, COUNT(*) FROM orders GROUP BY status;
```

---

## Emergency Contacts

- **Repository:** github.com/malikstopher-dev/the-boma-cafe
- **Deployment:** Vercel (auto-deploys on push to `main`)
- **Database:** Supabase (project: the-boma-cafe-pos)
