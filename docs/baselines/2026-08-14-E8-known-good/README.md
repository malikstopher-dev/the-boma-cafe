# E8 Known-Good Baseline — 2026-08-14

Snapshot of production the day Mission E8 (Admin Multi-User RBAC) went live.
Purpose: exact "known-good" reference for future comparisons, debugging, and restore decisions.

## Point-in-time facts

| Item | Value |
|------|-------|
| Date (UTC) | 2026-08-14 (captured ~23:30 local, session 89722de→4e28c83) |
| Git HEAD (code baseline) | `6e58cfc` — last CODE commit deployed (RBAC hole fix) |
| Git HEAD (docs only) | `4e28c83` — AGENTS.md record (no code change) |
| Deployment URL | https://the-boma-cafe-pvvhaas9p-malikstopher-5581s-projects.vercel.app |
| Production alias | https://the-boma-cafe.vercel.app |
| Supabase project ref | `lyksqvqtiysjttwpgeyw` |
| Migration state | **Local == Remote, 000–079** (see migration-history.txt; 016a skipped by CLI pre-existing, 024–026/041–044 never existed as files) |
| Migration 079 | Applied to prod this day via `supabase db push` |
| `ADMIN_LEGACY_FALLBACK` | `true` (owner flips to `false` after 1–2 stable days) |
| Tests at baseline | 121/121 vitest; inventory strict tsc clean; `next build` green |

## Schema baseline

The authoritative schema record is the migration files at commit `6e58cfc`
(`supabase/migrations/000…079`) — migration history above proves the remote
`schema_migrations` table matches those files exactly at this point in time.

> Caveat: migrations 001–049 were originally applied to prod manually via the
> dashboard SQL editor (pre-history era, repaired 2026-07-31). The remote schema
> is believed identical to the files, but a byte-exact `pg_dump` was NOT taken
> (no Docker, no DB password on hand). If byte-exact certainty is ever needed,
> run from the Supabase dashboard with the DB password:
> `pg_dump --schema-only` against `db.lyksqvqtiysjttwpgeyw.supabase.co`.

## Admin accounts (usernames + roles ONLY — no secrets in repo)

| Username | Display | Role |
|----------|---------|------|
| mahindra | MR MAHINDRA | owner |
| chriselda | Chriselda | full_manager |
| gibbs | Mr Gibbs | manager |
| isaac | Mr Isaac | manager |
| khosi | Ms Khosi | assistant_manager |

- Passwords set 2026-08-14 via temp script (bcrypt 12, `must_change_password=false`); never stored in repo.
- `admin_accounts` seeded by migration 079 with `password_hash NULL`; passwords applied post-migration.

## What was verified live this day (automated, cleaned up after)

- 5/5 logins OK; wrong password → 401
- RBAC matrix: owner + full_manager 200 on `/api/admin/accounts` + `/api/admin/audit/recent`;
  managers + assistant_manager 403; inventory dashboard 200 for all roles
- Audit trail recorded real identities (auth.login rows with admin_name + role)
- `/api/waiters` POST: mahindra 201, khosi **403** (bare-path RBAC hole found + fixed at `6e58cfc`)
- Public endpoints unaffected: booking/config, staff/list, admin/accounts/public
- All verification sessions / audit rows / probe waiters deleted post-test

## Restore / compare procedure

```
# Verify migration parity against this baseline
npx supabase link --project-ref lyksqvqtiysjttwpgeyw --yes
npx supabase migration list --linked        # expect 000–079, local == remote

# If reverting code to baseline
git checkout 6e58cfc
```

## Known-good worker state (from AGENTS, Oracle VM)

- Background-job worker running on Oracle Cloud Always Free (`145.241.101.133`, PM2 `boma-worker`, deploy key `ad4aba1`) — unchanged by E8.