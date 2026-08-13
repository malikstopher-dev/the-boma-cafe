# /admin Audit Sweep — Rewritten Request (2026-08-12)

**Continue the full `/admin` audit sweep. For every page under `src/app/admin/`, verify three things:**

1. **Envelope access** — each `fetch()` result must be unwrapped according to the *actual* shape its API route returns:
   - `{ data: [...] }` envelope → unwrap via `json.data ?? json`
   - Direct array (`/api/waiters`, `/api/cms/marketing` GET) → use `json` directly
   - `{ success, data }` POST/PATCH responses in `cms/marketing` → don't feed these into list setters
2. **Payload correctness** — every POST/PATCH/DELETE body must match the route's expected fields exactly (keys, casing, allowlists). Reference pattern: the `saveCountItem` fix (`productId`/`counted`, not `product_id`/`counted_units`) — look for the same class of mismatch everywhere.
3. **Error handling** — errors must surface to the user (banner/flash), not be silently swallowed or rendered as fake success.

**Method:** batch the ~80 admin pages into 4 groups:
- dashboard + bookings + quotes
- CMS menu + marketing
- site + settings + staff + waitstaff + packages
- operations/inventory

For each page also read the matching API route before judging. Produce a per-page report:
`FILE / ENVELOPE / PAYLOADS / ERRORS / VERDICT (OK or fix description)`.

**Then:** fix every `BROKEN` verdict, run strict inventory tsc + `npx vitest run` + `npm run build`, update `AGENTS.md` session entry, and commit.

**Already verified clean (skip):**
- `/api/waiters` + `/api/cms/marketing` list pages (direct arrays, handled correctly)
- Route-validity cross-check (0 genuinely missing API routes)
