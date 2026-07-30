# Master Architecture Review — The Boma Café Management System

**Lead Reviewers:** Principal Software Architect, Database Architect, Senior Backend Engineer, Senior Frontend Engineer, DevOps Engineer, Enterprise Solutions Architect  
**Scope:** Full-stack architecture audit of the current system + proposed inventory subsystem  
**Date:** 2026-07-29  
**Classification:** Internal — Pre-implementation Review  

---

## 0. Executive Summary

The Boma Café system has grown organically from a simple website into a management platform spanning CMS, booking, POS, staff management, quotes, PDF generation, email, and a background job queue. The proposed inventory system is the next major addition.

**Current state:** The system works in production. Booking submissions, PDF generation, email delivery, staff PIN auth, and order management are operational. The architecture shows its age in specific ways — auth is dual (cookie + PIN), API routes are inconsistent, the CMS data layer is a God module, TypeScript strict mode is disabled, and there are no automated tests.

**Inventory proposal (V3 + V3.1):** The transaction-ledger model is the right foundation. The generic engine + bar module separation is correct. The weaknesses are in execution details — contradictory specs, fragile SQL patterns, missing production hardening.

**Overall verdict:** The system is **conditionally approved** with 17 high-priority findings that must be resolved before V1 implementation. No fundamental redesign is needed, but several structural issues in the current system should be fixed alongside the inventory build — not after.

---

## 1. Database Architecture

### 1.1 Current Database Assessment

**Migration numbering:**
- 37 migrations spanning from initial tables to background jobs
- Gaps at 024, 025, 026 (likely rolled back or collapsed)
- Files 002 and 003 are split with no clear rationale
- 016 and 016a are sibling migrations with the same major number

**Finding 1.1 — Migration numbering inconsistency.**
- **Problem:** Jumping from 023 to 027 makes it impossible to know if migrations 024-026 were deleted, rolled back, or never existed. The `016` / `016a` naming introduces a convention that isn't used elsewhere.
- **Impact:** New developers cannot trust the migration sequence. Rollbacks to a specific point in time require guesswork.
- **Recommendation:** Establish a single monotonic numbering convention. Document that 024-026 were unused/abandoned. Use `supabase migration new <name>` going forward which auto-numbers.
- **Priority:** Medium — documentation fix, no production impact.

**Finding 1.2 — Column type inconsistency across migrations.**
- **Problem:** `bookings.created_at` in migration 001 uses `TIMESTAMPTZ DEFAULT NOW()`. `site_settings` in migration 015 uses `TIMESTAMPTZ DEFAULT NOW()`. But some tables use `TIMESTAMP` without timezone, and some use `TIMESTAMPTZ` without explicit defaults. No consistent convention.
- **Impact:** Timezone handling is fragile. Queries comparing timestamps across tables with different timezone awareness will produce incorrect results during DST transitions.
- **Recommendation:** Enforce `TIMESTAMPTZ` (always with timezone) for all timestamp columns across all tables. Add a lint rule to the migration review process.
- **Priority:** Low — existing data is consistent within tables. Fix applies to new migrations.

**Finding 1.3 — No `updated_at` trigger convention.**
- **Problem:** Some tables have `updated_at TIMESTAMPTZ DEFAULT NOW()` but rely on application code to update it. There is no PostgreSQL trigger to auto-maintain `updated_at`.
- **Impact:** Rows retain stale `updated_at` values if the application forgets to set them. Audit queries that rely on `updated_at` are unreliable.
- **Recommendation:** Create a single reusable trigger function:
  ```sql
  CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
  BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
  $$ LANGUAGE plpgsql;
  ```
  Apply it to every table that has an `updated_at` column.
- **Priority:** Medium — low effort, high reliability gain.

**Finding 1.4 — No soft-delete convention across existing tables.**
- **Problem:** Migration 015 (CMS tables) has no `is_active` or `deleted_at` columns. Deleting a menu item or event forces a hard DELETE with no recovery. The inventory proposal correctly defines soft-delete, but the existing system has no uniform approach.
- **Impact:** Accidental deletion of CMS content is unrecoverable without database restore.
- **Recommendation:** Do NOT retrofit soft-delete to existing tables (too risky for stable modules). But add a project-wide convention document that all NEW tables must have `is_active BOOLEAN DEFAULT true` and `deleted_at TIMESTAMPTZ`. The inventory proposal already does this.
- **Priority:** Medium — applies to new development only.

### 1.2 Inventory Schema Assessment

**Finding 1.5 — The `running_balance` contradiction must be resolved.**
- **Problem:** V3 defines `inventory_transactions.running_balance NUMERIC(15,4)`. V3.1 recommends removing it. Both documents exist simultaneously. A developer implementing from these documents will not know which to follow.
- **Impact:** If `running_balance` is implemented, every INSERT must compute `previous_balance + quantity`, which requires a `SUM` query (or a cached last-balance lookup). This creates a read-before-write dependency that defeats the purpose of an append-only ledger. If it's computed incorrectly, balances diverge.
- **Recommendation:** Remove `running_balance` definitively. The column has no value that `SUM(quantity)` doesn't provide. If denormalised balances are needed for performance, use the materialized view — which is explicitly documented as non-authoritative.
- **Priority:** Critical — must be resolved before any table creation.

**Finding 1.6 — Materialized view refresh strategy is inverted.**
- **Problem:** The V3 proposal defaults to a trigger-based refresh (`REFRESH MATERIALIZED VIEW CONCURRENTLY` on every INSERT). The V3.1 proposal recommends periodic refresh (every 60s). The default in the document is still the trigger approach.
- **Impact:** At 10M transactions, a trigger-based refresh fires 10M times. Even with `CONCURRENTLY`, each refresh is an exclusive lock on the materialized view for the duration of the refresh. At high write volume, readers will regularly encounter stale or locked views.
- **Recommendation:** Flip the default to periodic refresh (60s interval via pg_cron or application scheduler). Document the trigger approach as an optimisation for low-write-volume scenarios only. Remove the trigger code from the migration.
- **Priority:** Critical — prevents a production incident at scale.

**Finding 1.7 — The `inventory_uom_conversions` table has a structural flaw.**
- **Problem:** The UNIQUE constraint uses `COALESCE(product_type, '')`, which treats empty string and NULL as equivalent for uniqueness purposes, but PostgreSQL's UNIQUE constraint treats NULLs as unequal. The `COALESCE` trick creates a unique index that silently accepts duplicate rows when `product_type` varies between NULL and '' between rows.
- **Impact:** Duplicate conversion rules go undetected. The engine picks the wrong conversion silently.
- **Recommendation:** Split into two tables:
  - `inventory_uom_conversions_global(from_uom_id, to_uom_id, factor)` — shared across all products
  - `inventory_uom_conversions_product(product_id, from_uom_id, to_uom_id, factor)` — product-specific overrides with `UNIQUE(product_id, from_uom_id, to_uom_id)`
  
  The engine queries product-specific first, falls back to global. This eliminates the `product_type` ambiguity entirely.
- **Priority:** High — prevents a data integrity bug.

**Finding 1.8 — UUID sentinel value in materialized view unique index.**
- **Problem:** The index uses `COALESCE(location_id, '00000000-0000-0000-0000-000000000000')` to work around PostgreSQL's inability to index NULLs in unique constraints. If a real UUID with this value is generated (extremely unlikely but possible with `gen_random_uuid()`), it will conflict.
- **Impact:** Near-zero probability but non-zero. More importantly, it's a code smell that signals the design hasn't accounted for nullable columns in unique constraints.
- **Recommendation:** Use a partial unique index instead:
  ```sql
  CREATE UNIQUE INDEX idx_balance_product_location 
  ON inventory_product_balances(product_id, location_id) 
  WHERE location_id IS NOT NULL;
  ```
  And handle the location_id IS NULL case separately in queries.
- **Priority:** Medium — won't cause issues in practice but should be fixed for correctness.

**Finding 1.9 — No table partitioning strategy for 10M+ transactions.**
- **Problem:** The `inventory_transactions` table is designed as a single flat table. At 10M rows, queries filtering by date range will scan unnecessary partitions. The proposal mentions partitioning as a future option but provides no design.
- **Impact:** Dashboard reports and reconciliation queries that span a month will scan all 10M rows instead of the relevant 200K rows within that month. Response time degrades linearly with data volume.
- **Recommendation:** Design for monthly partitioning from the start:
  ```sql
  CREATE TABLE inventory_transactions ( ... ) 
  PARTITION BY RANGE (created_at);
  ```
  Create a migration script that auto-creates the next month's partition. This is trivially easy to add at table creation time and painful to add to a table with 10M rows.
- **Priority:** Medium — not urgent for V1 scale (<50K transactions), but should be in the schema from day one to avoid a zero-downtime migration later.

**Finding 1.10 — The `inventory_products` table stores `cost_price` as a single value.**
- **Problem:** `cost_price` implies there is a single cost per product. In reality, cost changes with each supplier delivery. Using a single column means every new delivery at a different price must update `cost_price`, losing the previous price history.
- **Impact:** Inventory valuation reports will be inaccurate during periods of price fluctuation. The cost at time-of-sale is lost.
- **Recommendation:** Remove `cost_price` from `inventory_products` (it's always derivable). Add `unit_cost NUMERIC(10,2)` to `inventory_transactions` so each purchase records its cost. For reporting, the `inventory_product_balances` materialized view can use `LAST_VALUE(cost_per_unit)` or `AVG(cost_per_unit)` depending on the costing method (FIFO, weighted average, or specific identification). Document which costing method is used.
- **Priority:** High — required for accurate profit margin reporting.

---

## 2. API Architecture

### 2.1 Current API Assessment

The system has approximately 70 API route files across 15+ route groups.

**Finding 2.1 — No consistent REST patterns.**
- **Problem:** `/api/cms/bar` handles both categories and items in a single endpoint, distinguishing them by inspecting the request body (`body.name !== undefined && !body.categoryId` vs `body.categoryId !== undefined`). This is fragile — adding a new field that matches one of these heuristics will silently break routing.
- **Impact:** Adding a `name` field to a bar item (which is reasonable — items have names) will cause it to be misidentified as a category. This is a real bug waiting to happen.
- **Recommendation:** Split into separate endpoints:
  - `GET/POST/PUT/DELETE /api/cms/bar/categories`
  - `GET/POST/PUT/DELETE /api/cms/bar/items`
  
  This duplicates code slightly but eliminates the routing fragility entirely. The pattern used in `booking/` routes (separate endpoints per resource) is the correct one. Apply it everywhere.
- **Priority:** High — this is a latent production bug.

**Finding 2.2 — No API versioning.**
- **Problem:** All API routes are at versionless paths (`/api/booking/submit`, `/api/cms/bar`, etc.). If the request/response contract changes, there is no way to run old and new clients simultaneously.
- **Impact:** Any breaking change to an API response requires updating all clients at the same time. For a single-venue system this is manageable, but as the system grows (mobile app, third-party POS, commercial SaaS) it becomes a blocker.
- **Recommendation:** For V1, formalise the API contract with a version header (`Accept: application/vnd.boma.v1+json`) rather than URL-based versioning. This is less invasive than `/api/v1/` paths. Document the current response shapes as v1.
- **Priority:** Low — not needed for current scale. Document as a future requirement.

**Finding 2.3 — Inconsistent error responses.**
- **Problem:** Error responses across API routes are inconsistent:
  - `/api/cms/bar`: `{ error: 'Failed to read bar menu' }` (status 500)
  - `/api/booking/submit`: `{ error: 'Validation failed', details: {...} }` (status 400)
  - Middleware: `{ error: 'UNAUTHORIZED' }` (status 401)
  
  Some error messages are lowercase, some uppercase. Some include details, some don't. There is no standard error envelope.
- **Impact:** Frontend code must handle multiple error shapes. Error handling logic is duplicated across every page component. Monitoring and debugging are harder.
- **Recommendation:** Define a standard error envelope:
  ```typescript
  interface ApiError {
    code: string                    // 'VALIDATION_ERROR', 'NOT_FOUND', 'RATE_LIMITED'
    message: string                 // Human-readable
    details?: Record<string, any>   // Optional machine-readable details
    requestId?: string              // Correlation ID for debugging
  }
  ```
  Add a helper function `apiError(code, message, status, details?)` used by every route.
- **Priority:** Medium — refactoring all 70 routes is significant. Apply to new routes (inventory) immediately. Retrofit to existing routes as they are touched.

**Finding 2.4 — Rate limiting is inconsistently applied.**
- **Problem:** `/api/booking/submit` uses `checkRateLimit()`. Other form-submission endpoints (`/api/supabase/contact`, `/api/supabase/bookings`) do not. The rate limit check is a simple IP-based check with no documentation of the throttling limits.
- **Impact:** Contact form and booking submission from the public website are subject to abuse. No rate limiting on the older `supabase/*` endpoints.
- **Recommendation:** Move rate limiting into the middleware for all public-facing POST endpoints. Use a configurable limit per-path. Remove the per-route `checkRateLimit()` calls and centralise the logic.
- **Priority:** Medium — security hardening.

### 2.2 Inventory API Assessment

**Finding 2.5 — 60+ endpoints for V1 is over-engineered.**
- **Problem:** The V3.1 API specification lists 60+ endpoints across 10 resource groups. The V1 scope (Phase 1A–1C) does not include purchase orders, booking integration, or intelligence features — yet endpoints for these are specified.
- **Impact:** Developers will feel pressure to implement endpoints that aren't needed. Unused API code becomes dead weight — tested at creation and never tested again. The API surface becomes confusing for frontend developers.
- **Recommendation:** Document endpoints that are NOT in V1 with a clear `(future)` marker. Only implement endpoints for resources that exist in V1:
  - Products (CRUD)
  - Transactions (INSERT + list + single)
  - Stock counts (CRUD + approve + reconcile)
  - Imports (upload, preview, approve, rollback, list, single)
  - Suppliers (CRUD)
  - Locations (CRUD + stock summary)
  - Dashboard (aggregates + alerts)
  - Reports (daily, variance, waste, fast/slow, valuation)
  - UOMs and categories (CRUD)
  - Menu integration (link, unlink, list linked/unlinked)
  
  Everything else (purchase orders, booking integration, forecasting) is deferred until Phase 2+.
- **Priority:** High — scope control for V1.

---

## 3. Authentication & Authorization

**Finding 3.1 — Two parallel auth systems create confusion.**
- **Problem:** The system has TWO authentication systems:
  1. **Cookie-based auth** (middleware): SHA-256 hashes of role-specific passwords stored in cookies. Used by the admin CMS.
  2. **PIN-based staff auth** (staff system): 4-6 digit PINs validated against `staff_sessions` table. Used by the staff PWA.
  
  These systems coexist but are not integrated. A staff member with admin PIN cannot access admin cookies and vice versa. The middleware checks both sequentially.
- **Impact:** Auth logic is duplicated (middleware.ts vs lib/auth.ts vs lib/auth/requireRole.ts). The `requireRoleFromHeadersOrSession` function has a fallback path that re-checks cookies — this is a maintenance burden and a potential security gap if the two systems disagree.
- **Recommendation:** Unify under a single session model. The PIN-based system (which supports multiple staff members, session expiry, inactivity timeout, per-staff roles) is more sophisticated and should become the primary auth method. The cookie-based password hashes (which only support 4 fixed roles with shared passwords) should be deprecated. Migration path:
  1. Create an `admin_users` table with PINs for each admin (existing staff system already has this)
  2. Migrate admin CMS login to use PIN auth
  3. Remove cookie-based password auth in a future release
- **Priority:** High — security and maintainability.

**Finding 3.2 — Shared passwords for roles.**
- **Problem:** The cookie-based auth system has 4 passwords (admin, kitchen, waiter, bar) stored as environment variables. All admin users share the same password. There is no way to revoke access for a single staff member without changing the shared password.
- **Impact:** When a staff member leaves, the admin password must be changed (affecting all remaining admins) or remains unchanged (leaving a security gap). Audit trails cannot identify which admin performed an action — only that "an admin" did it.
- **Recommendation:** Deprecate shared passwords (see 3.1). Use per-staff PINs with individual session tokens. The PIN system already exists and is in production for staff. Extend it to admin users.
- **Priority:** High — security gap.

**Finding 3.3 — No CSRF protection on API routes.**
- **Problem:** The middleware checks authentication via cookies but does not implement CSRF token validation. Any authenticated user's browser can be tricked into making API calls to the admin backend via a CSRF attack.
- **Impact:** If an admin is logged in and visits a malicious site, that site can make authenticated API calls to the Boma admin.
- **Recommendation:** Add CSRF protection for cookie-authenticated routes. The simplest approach: check the `Origin` or `Referer` header matches the expected domain in the middleware. For higher security, implement double-submit cookie pattern or SameSite=Strict enforcement.
- **Priority:** Medium — the admin is behind auth, but CSRF is still a valid attack vector.

**Finding 3.4 — No Supabase Auth integration.**
- **Problem:** The system has Supabase Auth available but only uses it indirectly. The `createBrowserClient()` function creates a Supabase client with the anon key. The `getAdminClient()` function uses the service role key bypassing RLS entirely. There is no use of Supabase Auth's built-in user management, JWT tokens, or RLS policies based on `auth.uid()`.
- **Impact:** Every API route that uses `getAdminClient()` has service-role access to the entire database. If a route is accidentally exposed without middleware protection (as some are — `/api/supabase/bookings` POST is public), an attacker has full database access.
- **Recommendation:** Migrate to Supabase Auth for admin access. Create admin users in Supabase Auth. Use the anon key + JWT for route-level authorization. Reserve the service role key for background jobs and server-to-server calls only. Phase this migration alongside the cookie-to-PIN auth migration (3.1, 3.2).
- **Priority:** High — security hardening.

---

## 4. Frontend Architecture

**Finding 4.1 — No component composition strategy.**
- **Problem:** The `admin/bar-menu/page.tsx` page is a 368-line monolithic client component that:
  - Fetches data inline via `fetch()`
  - Manages its own loading, error, and form state
  - CRUDs categories and items via inline API calls
  - Has no separation between data layer, presentation, and business logic
  
  This pattern is repeated across most admin pages.
- **Impact:** Every admin page is a custom monolith. There is no reusable data-fetching hook, no form library standardisation, no error boundary composition. Adding a new admin page requires copy-pasting and adapting an existing monolith. Maintenance cost grows linearly with number of pages.
- **Recommendation:** Establish a consistent page composition pattern:
  ```typescript
  // 1. Server Component for initial data fetch + layout
  export default async function AdminBarMenuPage() {
    const data = await getBarMenuData()  // Server-side fetch
    return <BarMenuClient initialData={data} />
  }
  
  // 2. Client Component for interactivity
  function BarMenuClient({ initialData }: { initialData: BarMenuData }) {
    // Only client-side state here
  }
  ```
  This reduces client-side bundle size, eliminates loading states for initial data, and separates concerns. Apply to all new inventory pages. Retrofit to existing admin pages over time.
- **Priority:** High — applies to new inventory development. Use this pattern for all inventory pages.

**Finding 4.2 — No form validation library in use.**
- **Problem:** The bar-menu page validates form inputs manually. The booking submission uses Zod. There is no consistent approach to form validation across the app.
- **Impact:** Form validation quality varies by page. Some pages have no client-side validation. Error messages are inconsistent. The UX varies wildly.
- **Recommendation:** Standardise on React Hook Form + Zod for all new forms. Zod is already a dependency and is used in the booking system. Extend it to all admin forms. The inventory proposal already uses Zod for import validation — this should be the standard.
- **Priority:** Medium — apply to new inventory pages.

**Finding 4.3 — TailwindCSS is not used despite being in the stack description.**
- **Problem:** The project description lists TailwindCSS as part of the stack. The actual codebase uses CSS Modules exclusively. The `postcss.config.mjs` has an empty plugins array.
- **Impact:** Confusion for new developers who expect Tailwind utility classes. The CSS Module approach works but duplicates styling logic that Tailwind would centralise.
- **Recommendation:** Either adopt TailwindCSS (add the plugin to postcss config, migrate incrementally) or remove it from the stack documentation. Either is fine — but the documentation must match reality. For the inventory pages, use TailwindCSS (it's the modern standard) while leaving existing CSS Modules untouched.
- **Priority:** Low — documentation fix only. Don't migrate existing pages.

**Finding 4.4 — No shared state management or data fetching approach.**
- **Problem:** Pages use raw `fetch()` in useEffect (bar-menu), the admin layout uses `useAuth()` from a context, and the staff system uses a custom `auth-context.tsx`. There is no SWR, TanStack Query, or any standardised data fetching strategy.
- **Impact:** Each page implements its own loading, caching, and error states. There is no request deduplication — if two components on the same page fetch the same endpoint, both requests fire independently. No stale-while-revalidate caching exists anywhere.
- **Recommendation:** Adopt a standard data fetching library. SWR or TanStack Query are both excellent choices. For inventory pages, use this from day one. The import preview (which polls for status changes) and the dashboard (which needs periodic refresh) benefit immediately from SWR's built-in revalidation.
- **Priority:** Medium — reduce boilerplate in new inventory pages.

---

## 5. Folder Structure & Modularity

**Finding 5.1 — No domain boundaries.**
- **Problem:** The `src/lib/` directory is a flat list of 31 modules covering auth, CMS, booking, email, PDF, POS, staff, marketing, firebase, charts, and utilities. There is no subdirectory grouping or domain separation. The `src/lib/cms-supabase.ts` file is 650 lines covering settings, menu, events, gallery, bar menu, promotions, announcements, popups, and inquiries — all in one file.
- **Impact:** This is a God module. Every change to any CMS feature touches this file. It's impossible to reason about dependencies. The module has no clear responsibility — it's "everything CMS."
- **Recommendation:** Break `cms-supabase.ts` into domain-specific files:
  ```
  src/lib/cms/
    site-settings.ts
    menu.ts
    events.ts
    gallery.ts
    bar-menu.ts
    promotions.ts
    announcements.ts
    popup.ts
    inquiries.ts
    index.ts  (barrel exports)
  ```
  This is a safe refactoring — no logic changes, just file reorganisation. Do this before the inventory system adds more code to the CMS layer.
- **Priority:** High — the existing God module will only grow with inventory additions.

**Finding 5.2 — No barrel exports.**
- **Problem:** Most directories lack an `index.ts` barrel file. Importing from `src/lib/cms-supabase.ts` requires knowing the exact function name. There is no centralised public API for any subsystem.
- **Impact:** Imports are fragile — moving a function to a different file breaks all imports. Developers must read internal file structures to find what they need.
- **Recommendation:** Add barrel files to every domain directory. The inventory proposal already includes this in V3.1's recommendations — apply the same pattern to existing subsystems like booking, staff, and CMS.
- **Priority:** Medium — apply to inventory from day one, retrofit to other subsystems over time.

**Finding 5.3 — No clear separation between server and client code.**
- **Problem:** Server-side code (API routes, DB queries) and client-side code (components, hooks) live in the same directory hierarchy with no naming convention to distinguish them. `src/lib/` contains both server-only files (`supabase.ts`, `rate-limit.ts`, `pdf/generate.ts`) and client-only files (`cart.tsx`, `auth-context.tsx`, `booking.tsx`).
- **Impact:** It's possible to accidentally import server-only code (like `getAdminClient()`) into a client component. Next.js will either throw an error at build time or expose sensitive service-role credentials to the browser.
- **Recommendation:** Establish a clear naming convention or directory split:
  - `src/lib/server/` — server-only code (DB queries, service roles, rate limiting)
  - `src/lib/client/` — client-only code (contexts, hooks, browser APIs)
  - Files that work in both environments stay in `src/lib/`
  
  Next.js's `server-only` package can enforce this at import time.
- **Priority:** Medium — security best practice.

---

## 6. Security Architecture

**Finding 6.1 — Service role key exposed via `getAdminClient()` in every API route.**
- **Problem:** The `getAdminClient()` function creates a Supabase client with the service role key, which bypasses all RLS policies. This client is used in most API routes that interact with the database. A compromised API route has unfettered access to the entire database.
- **Impact:** Any vulnerability in any API route (there are ~70 of them) gives an attacker full database access. There is no defence in depth — RLS policies exist on tables but are never used because all queries run as service role.
- **Recommendation:** Create scoped Supabase clients:
  - `getAdminClient()` — service role, only for background jobs and server-to-server calls
  - `getAuthenticatedClient(token)` — uses JWT from auth, respects RLS
  - `getPublicClient()` — anon key for public reads only
  
  Route handlers should authenticate the user, extract their JWT, and use the authenticated client. This is a significant migration (touches every route) but is essential for security hardening.
- **Priority:** High — security gap at the architectural level.

**Finding 6.2 — No input sanitisation beyond Zod validation (booking).**
- **Problem:** The booking submission validates with Zod. Other public-facing endpoints (`/api/supabase/contact`, `/api/supabase/orders`, `/api/supabase/bookings`) accept arbitrary JSON and insert it directly. There is no HTML sanitisation, no SQL injection protection (beyond parameterised queries — which Supabase handles), and no size limits on text fields.
- **Impact:** XSS attacks via stored HTML in CMS fields. Potential abuse of unvalidated public endpoints.
- **Recommendation:** Apply Zod validation to all public-facing endpoints. The booking system's pattern (parse → validate → type-safe access → insert) should be the standard for all new endpoints. Add HTML sanitisation (`DOMPurify` server-side or `sanitize-html` npm package) for any user-submitted text that will be rendered as HTML.
- **Priority:** Medium — existing endpoints have not been exploited, but the risk exists.

**Finding 6.3 — No audit log for configuration changes.**
- **Problem:** Changing CMS settings (site settings, menu items, prices) does not generate audit entries. There is no record of who changed what or when.
- **Impact:** If a price is changed to the wrong value, there is no way to determine who changed it or what the previous value was. Rollback requires guessing.
- **Recommendation:** Extend the existing `booking_audit_log` pattern to CMS operations. Create a `cms_audit_log` table with `(table_name, record_id, action, changes JSONB, performed_by, created_at)`. Log all mutations to CMS tables. The inventory proposal already defines an `inventory_audit_log` — use the same pattern.
- **Priority:** Medium — valuable for accountability, not blocking.

---

## 7. Background Jobs & Async Processing

**Finding 7.1 — The worker and Next.js share no code.**
- **Problem:** The background job worker (`src/jobs/`) is a separate Node.js CJS bundle compiled with tsup. It imports from `src/lib/` at build time. The worker code is duplicated in the bundle — changes to `src/lib/pdf/generate.ts` require rebuilding both the Next.js app and the worker.
- **Impact:** Deployment complexity increases. Two separate builds are needed. If the worker bundle is not rebuilt after a library change, it will use stale code.
- **Recommendation:** This is acceptable for the current scale. The tsup config correctly bundles dependencies. Document the dual-build requirement in the deployment pipeline. Add a `build:all` script that runs `next build` and `tsup` sequentially.
- **Priority:** Low — it works, just document it.

**Finding 7.2 — No monitoring or alerting for job failures.**
- **Problem:** The worker logs structured JSON output. There is no integration with any monitoring system (DataDog, Sentry, PagerDuty, or even a Slack webhook). If a job fails, the error is logged but no one is notified.
- **Impact:** Failed PDF generation or email delivery goes undetected until a customer complains. Service degrades silently.
- **Recommendation:** Add a simple notification mechanism for failed jobs:
  - Option A (V1): Email the admin on job failure (reuse existing Resend integration)
  - Option B (V2): Slack webhook for failed jobs
  - Option C (future): Sentry integration for error tracking
  
  The dead-letter status exists in the schema — hook up an alert when jobs enter dead-letter state.
- **Priority:** Medium — prevents silent service degradation.

---

## 8. Testing & Quality

**Finding 8.1 — No automated tests.**
- **Problem:** The `__tests__/` directory contains a few legacy test files (`.mjs`, `.test.ts`, `.js`) that appear to be historical artefacts. There is no test runner configured in `package.json`. The `lint` script hangs (documented in AGENTS.md).
- **Impact:** Zero test coverage for 70 API routes, 31 lib modules, and 29 admin pages. Every deployment relies on manual testing. Regression bugs are guaranteed.
- **Recommendation:** This is the single highest-risk finding in this entire review. No amount of architectural excellence compensates for untested code.
  
  **Minimum viable test strategy:**
  1. Configure Vitest (already compatible with the TypeScript/ESM setup)
  2. Add unit tests for the pricing engine (`src/lib/booking/pricing.ts`) — algorithmic logic, high value
  3. Add unit tests for the inventory conversion engine (`src/lib/inventory/engine/conversion.ts`) — mathematical logic
  4. Add unit tests for the import parser and matcher — complex logic, critical for data integrity
  5. Integration test one representative API route (`POST /api/booking/submit`) end-to-end
  6. Write these tests BEFORE the inventory system is implemented
  
  The booking pricing engine has 381 lines of algorithmic logic with zero tests. The inventory conversion engine will have similar complexity. Both are high-risk for regressions.
- **Priority:** Critical — the highest priority item in this review.

**Finding 8.2 — TypeScript strict mode is disabled.**
- **Problem:** `tsconfig.json` has `"strict": false`. This disables `strictNullChecks`, `noImplicitAny`, `strictFunctionTypes`, and other type-safety features.
- **Impact:** `null` and `undefined` can be passed to functions that expect defined values. `any` types propagate through the codebase. TypeScript provides approximately 30% of its potential value.
- **Recommendation:** Enable strict mode incrementally:
  1. Add `"strict": true` — this will produce hundreds of errors initially
  2. Fix errors module by module, starting with the inventory engine (new code)
  3. Use `// @ts-nocheck` as a temporary escape hatch for legacy modules
  4. Track progress: modules in strict mode vs modules with escape hatches
  
  The inventory engine MUST be strict from day one. Enforce this with a per-directory tsconfig if needed.
- **Priority:** High — prevents an entire category of bugs in new code.

---

## 9. Inventory System — Specific Review

**Finding 9.1 — The ledger model needs an explicit "why this over event sourcing" justification.**
- **Problem:** The inventory proposal presents a transaction-ledger model without addressing why it isn't a full event-sourced system. Event sourcing (storing events rather than transactions) is the natural evolution of the ledger pattern for systems that need temporal queries, audit trails, and replayability.
- **Impact:** In 6–12 months, someone will ask "why didn't we use event sourcing?" The answer needs to be documented now.
- **Recommendation:** Add a short appendix comparing the ledger model to event sourcing:
  - **Ledger advantages:** Simpler, maps naturally to SQL, easy to understand, no event versioning, no snapshot management, standard PostgreSQL tooling.
  - **Event sourcing advantages:** Complete historical reconstruction, temporal queries are natural, event store is append-only, supports CQRS naturally.
  - **Decision:** The ledger model is correct for V1. Event sourcing adds complexity (event versioning, event store infrastructure, projection rebuild) that is not justified by current requirements. If temporal queries or multi-service event-driven architecture becomes necessary, the ledger can be migrated to an event store.
- **Priority:** Low — documentational. Important for future architects.

**Finding 9.2 — Stock count approval should handle the "count while another transaction is happening" case more explicitly.**
- **Problem:** The concurrency section correctly identifies that a stock count running concurrently with an import will produce a variance that includes the import. The resolution says "either is correct — the count captures physical reality." This is true but unsatisfying.
- **Impact:** When a manager investigates a variance of -24 tots that was caused by an import they forgot about, they will be confused. The variance reason will be attributed to the count when it was really timing.
- **Recommendation:** Store the `inventory_transactions.id` recorded BEFORE the count started and AFTER the count completed. The reconciliation report shows "transactions during count: 3 (purchase +2 bottles, spillage −4 tots, sale −6 tots)." This gives the manager full context without requiring them to reconstruct the timeline manually.
  ```sql
  CREATE TABLE stock_counts (
    ...
    snapshot_tx_before UUID,   -- last transaction ID when count started
    snapshot_tx_after  UUID,   -- last transaction ID when count was approved
  );
  ```
- **Priority:** Medium — improves manager trust in reconciliation.

**Finding 9.3 — Import rollback at application level is insufficient for database-level corruption or operator error.**
- **Problem:** The rollback mechanism (inserting reversal transactions) only works for imports that were applied through the system. If a database administrator runs a raw SQL UPDATE on `inventory_transactions`, or if a migration corrupts data, the application-level rollback cannot help.
- **Impact:** DBA errors or migration bugs require point-in-time recovery from database backups. The system has no self-service recovery for these scenarios.
- **Recommendation:** Document the backup and recovery strategy explicitly in the inventory deployment guide:
  1. Database backups (Supabase daily backups)
  2. Point-in-time recovery procedures
  3. Export the ledger weekly as CSV to Supabase Storage or external blob store
  4. Test recovery from backup quarterly
  
  The V3.1 backup section covers this but doesn't give it enough prominence. Move it to the deployment guide.
- **Priority:** Low — standard operational practice that applies to any database.

**Finding 9.4 — No cost-method strategy.**
- **Problem:** The proposal uses `unit_cost NUMERIC(10,2)` on transactions but doesn't specify which costing method is used (FIFO, LIFO, weighted average, or specific identification). When the same product is purchased at different prices, the valuation report must know which cost to use for remaining stock.
- **Impact:** Inventory valuation reports will produce different numbers depending on which costing method is inadvertently implemented. The same report run by two different developers will disagree.
- **Recommendation:** Designate **weighted average cost** as the standard method for V1:
  ```
  new_avg_cost = ((current_qty * current_avg_cost) + (new_qty * new_unit_cost)) / (current_qty + new_qty)
  ```
  This is the simplest method to implement and is acceptable for hospitality inventory. Document that specific identification (actual cost per bottle) is available for high-value items (premium spirits, wine collections) as a V2 enhancement.
- **Priority:** Medium — prevents future reporting inconsistencies.

**Finding 9.5 — No recipe/ingredient cost roll-up.**
- **Problem:** The cocktail recipe engine defines ingredients but doesn't calculate the cost of the resulting drink. If a Mojito costs `rum(R6.40) + mint(R0.50) + lime(R1.20) + syrup(R0.30) + soda(R0.80) = R9.20`, the system should compute this automatically.
- **Impact:** Menu pricing decisions lack ingredient cost data. Managers cannot determine pour cost percentage (cost ÷ sell price) for individual cocktails.
- **Recommendation:** Add a computed `total_cost` column (GENERATED or calculated on read) to `bar_recipes` that sums `ingredient.quantity × ingredient.product.latest_unit_cost` for all ingredients in the recipe. This is low-effort and high-value for pricing decisions.
- **Priority:** Low — deferred to V2 recipe engine. Document as a requirement.

---

## 10. Operations & DevOps

**Finding 10.1 — No CI/CD pipeline defined.**
- **Problem:** There is no `.github/workflows/` directory, no CI configuration, no build pipeline. Deployments are manual (`git push` triggers Vercel deploy). The worker requires a separate deploy step.
- **Impact:** No automated testing on PRs. No deployment gating. No rollback automation. Deployments are high-risk manual operations.
- **Recommendation:** Minimum viable CI:
  1. GitHub Actions workflow that runs on every PR:
     - `npm run build` (catch compilation errors)
     - Run unit tests (after they exist — see 8.1)
     - `npm run typecheck` (after strict mode — see 8.2)
  2. Separate workflow for the worker build (`npx tsup`)
  3. Vercel deployment hooks for automated staging deploys
- **Priority:** High — required for team development.

**Finding 10.2 — No structured logging.**
- **Problem:** The existing codebase uses `console.error()` for error logging. The worker has a structured JSON logger. The Next.js app does not.
- **Impact:** Production debugging requires reading Vercel function logs which are unstructured text. Error rates cannot be tracked. Alerting requires log parsing.
- **Recommendation:** Adopt a structured logging library (pino or winston). Use the worker's logger pattern (structured JSON) for the Next.js app as well. Add request IDs to every API call (`x-request-id` header) for log correlation.
- **Priority:** Medium — operational excellence.

**Finding 10.3 — No environment management strategy.**
- **Problem:** The `.env.local`, `.env.production.off`, and `.env.vercel` files suggest multiple environments but there is no documented strategy for promotion between environments (dev → staging → production).
- **Impact:** Configuration drift between environments. Untested changes promoted to production.
- **Recommendation:** Document a simple environment strategy:
  - `development` — local machine, `.env.local`
  - `preview` — Vercel preview deployments, auto-provisioned for each PR
  - `production` — Vercel production, manual deploy from `main` branch
  
  Use Vercel's environment variables UI for preview and production. Keep `.env.local` for local development only.
- **Priority:** Low — documentational.

---

## 11. Domain Architecture & Future-Readiness

### 11.1 Context Map

```
┌─────────────────────────────────────────────────────────────────────┐
│                    THE BOMA CAFÉ — BOUNDED CONTEXTS                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │   PUBLIC    │  │   CMS       │  │  BOOKING    │  │   INVENTORY  │ │
│  │   WEBSITE   │  │             │  │  & QUOTES   │  │   (NEW)      │ │
│  │             │  │ Site        │  │             │  │              │ │
│  │ Menu       │  │ Settings    │  │ Types       │  │ Products     │ │
│  │ Bar Menu   │  │ Menu        │  │ Venues      │  │ Transactions │ │
│  │ Gallery    │  │ Events      │  │ Packages    │  │ Suppliers    │ │
│  │ Events     │  │ Promotions  │  │ Pricing     │  │ Locations    │ │
│  │ Booking    │  │ Gallery     │  │ Customers   │  │ Stock Counts │ │
│  │ Contact    │  │ Media       │  │ Quotes      │  │ Imports      │ │
│  │            │  │ Popup       │  │ Payments    │  │ Purchases    │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                    SHARED KERNEL                               │    │
│  │  Staff · Auth · Supabase Client · Storage · Background Jobs  │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────────┐     │
│  │     POS     │  │   STAFF     │  │  REPORTING &             │     │
│  │  (Orders)   │  │   CHAT      │  │  ANALYTICS (future)      │     │
│  │             │  │   PWA       │  │                          │     │
│  │ Cart        │  │             │  │  BI Dashboards           │     │
│  │ Checkout    │  │ Messages    │  │  Revenue Reports         │     │
│  │ Kitchen     │  │ Voice       │  │  Inventory Valuation     │     │
│  │ Display     │  │ Notifs      │  │  Financial Reports       │     │
│  │ Bar Display │  │ PIN Login   │  │  Supplier Reports        │     │
│  └─────────────┘  └─────────────┘  └──────────────────────────┘     │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                    FUTURE CONTEXTS                             │    │
│  │  Accounting · CRM · Kitchen Inventory · Purchasing ·          │    │
│  │  Multi-Branch · Multi-Warehouse · Multi-Currency · SaaS       │    │
│  └──────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

**Finding 11.1 — No explicit domain boundaries in the codebase.**
- **Problem:** The context map above exists only in this review. The actual codebase has no module boundaries that align with these contexts. `cms-supabase.ts` crosses the CMS, Menu, and Bar Menu contexts. `booking/` directory is well-structured but sits beside `cms-supabase.ts` in `src/lib/` with no architectural distinction.
- **Impact:** As the system grows, cross-context dependencies become spaghetti. A change to the "CMS" context can inadvertently affect the "Booking" context because they share infrastructure in `cms-supabase.ts`.
- **Recommendation:** Enforce the context boundaries in the codebase structure:
  ```
  src/
    cms/          ← bounded context
    booking/      ← bounded context (partially exists)
    inventory/    ← bounded context (proposed)
    pos/          ← bounded context (partially exists)
    staff/        ← bounded context (partially exists)
    shared/       ← shared kernel (staff, auth, supabase)
  ```
  Each context owns its own API routes, database queries, types, and components. The shared kernel provides cross-cutting concerns (auth, storage, background jobs). The inventory proposal already follows this pattern — extend it to the existing codebase.
- **Priority:** Medium — apply to new inventory context immediately. Retrofit existing code incrementally.

### 11.2 Future POS Integration

**Finding 11.2 — The inventory transaction model is not fully compatible with POS integration without significant work.**
- **Problem:** The current POS (orders) creates order items with menu item IDs and quantities. The inventory engine expects transactions with product IDs and UOM-specific quantities. Bridging these requires a lookup table (`bar_item_inventory_links` exists, but it only handles the menu-to-product mapping) and a quantity conversion (1 Mojito on the order ≠ 40ml rum, 15ml syrup, etc.).
- **Impact:** When POS integration begins (Phase 3), developers will discover that a simple "deduct stock when order is placed" is not simple. Every menu item must have:
  1. A linked inventory product (or recipe)
  2. A pour size conversion
  3. Multi-ingredient handling for cocktails
  4. A transaction type (sale) with the correct product ID and quantity in base UOM
  
  This is significant integration work, not just a SQL trigger.
- **Recommendation:** Add a "Integration Impact" section to the inventory proposal that explicitly maps the POS order lifecycle to inventory transactions:
  1. Order placed → no inventory impact (V1)
  2. Order item prepared → deduct via recipe or direct product link
  3. Order cancelled → reverse deduction
  4. Order modified → adjust deduction
  
  This upfront documentation prevents surprise during Phase 3.
- **Priority:** Medium — upfront planning prevents scope creep.

### 11.3 Future Kitchen Inventory

**Finding 11.3 — The generic engine cannot support kitchen inventory without significant additions.**
- **Problem:** The V3 proposal claims the generic engine supports kitchen inventory because it has UOMs and transactions. This is misleading. Kitchen inventory requires:
  1. **Batch tracking** (FIFO costing for perishables)
  2. **Trim/waste tracking** (30% of a head of lettuce is waste)
  3. **Yield management** (a 5kg case of tomatoes yields 4.5kg after trimming)
  4. **Multiple suppliers per product** (kitchens regularly switch suppliers based on price)
  5. **Unit variance** (a "bunch of mint" varies by weight)
  6. **FIFO valuation** (oldest stock used first, cost matters)
  
  None of these are in the current engine design.
- **Impact:** A developer starting the kitchen module will find that the engine handles about 40% of the requirements. The remaining 60% requires significant schema changes and new engine features — likely a V4-level redesign.
- **Recommendation:** Be honest about this in the proposal. Document the kitchen expansion gap (see ARB finding 7 in the previous review). Do NOT claim the engine "supports kitchen" in its current form. The engine supports the *concept* of general inventory, but the kitchen module will require substantial additions.
- **Priority:** Low — planning only. Kitchen inventory is not in the roadmap for 12+ months.

---

## 12. Scores & Verdict

### Final Scores

| Category | Score | Rationale |
|---|---|---|
| **Database Architecture** | 6.5/10 | Transaction ledger is the right choice. Migration numbering is inconsistent. No partitioning, no `updated_at` triggers, no soft-delete convention. Inventory schema has 4 unresolved issues (running_balance, MV refresh, UOM conversion design, cost history). |
| **Backend / API** | 5.5/10 | 70 API routes with inconsistent patterns. No error standard. Mixed REST heuristics (bar route). No CSRF. Service role key used everywhere (no RLS). Rate limiting is partial. No API versioning. |
| **Frontend** | 5/10 | Monolithic client components. No composition pattern. No data fetching standard. No form library. CSS Modules + no Tailwind (despite docs). Admin sidebar is hardcoded with emoji icons. 368-line bar-menu page is typical. |
| **Authentication** | 4/10 | Two parallel auth systems (cookie + PIN). Shared passwords per role. No per-user audit trail. No Supabase Auth integration. No RLS enforcement. Cookie-based CSRF exposure. |
| **Scalability** | 6/10 | Background worker is well-designed. Ledger model scales writes well. Read performance needs dashboard cache and partitioning. No read-replica strategy documented. 10M transaction target is achievable with fixes. |
| **Maintainability** | 4.5/10 | God module (650-line cms-supabase.ts). No domain boundaries. Flat lib/ directory. TypeScript strict mode off. Zero test coverage. No CI/CD. No barrel exports. Sidebar has 25 hardcoded nav items. |
| **Performance** | 6.5/10 | Reasonable performance targets. Good index strategy. Cursor-based pagination is correct. Materialized view refresh needs flipping to periodic. Dashboard cache is missing. No write-throughput analysis. |
| **Developer Experience** | 3.5/10 | Zero tests. TypeScript strict mode off. No CI. No linting (lint hangs). No consistent patterns. Dual auth systems confuse. No barrel exports. Copy-paste-driven development for admin pages. |
| **Enterprise Readiness** | 3/10 | No multi-tenancy. No API versioning. No billing. No SLA monitoring. No webhooks. No multi-language. No multi-currency. Auth doesn't scale to per-user. The proposal was not designed for enterprise — this score is appropriate. |
| **Risk** | 6/10 | (Lower score = higher risk) Highest risks: zero test coverage, TypeScript strict mode off, service-role-key-in-every-route, shared admin passwords, God module architecture. |
| **Overall** | 49/100 | |

### Would I Approve This Architecture for Production?

**Not in its current state.**

The system WORKS in production. That is the single strongest attribute — it's not theoretical, it's serving customers. The booking system, POS, staff management, and background jobs are functioning correctly.

However, the following must be resolved before the inventory system is added. Adding more functionality to an already-fragile foundation increases risk faster than it increases value.

**Gate criteria for inventory implementation:**

1. ✅ Transaction-ledger model (approve — correct decision)
2. ✅ Generic engine + bar module separation (approve — correct decision)
3. ✅ M:N menu-inventory linking (approve — correct decision)
4. ✅ Card-based stock count UX (approve — best-in-class design)
5. ❌ **Must fix:** Zero test coverage — at minimum, unit tests for the pricing engine and inventory conversion engine must exist
6. ❌ **Must fix:** Running_balance contradiction resolved
7. ❌ **Must fix:** Materialized view refresh strategy changed to periodic (not trigger-based)
8. ❌ **Must fix:** Inventory schema UOM conversion design simplified
9. ❌ **Must fix:** Inventory API endpoint list scoped to V1 only
10. ❌ **Must fix:** TypeScript strict mode enabled for all new inventory code
11. ⚠️ **Should fix:** cms-supabase.ts God module broken up before inventory adds more CMS functionality
12. ⚠️ **Should fix:** API error standard established and used by inventory routes
13. ⚠️ **Should fix:** Auth unification plan documented (cookie-to-PIN migration)
14. ⚠️ **Should fix:** Service role key usage limited (inventory routes should use RLS)

**Conditional approval rationale:** The V3 + V3.1 inventory proposal is architecturally sound in its core decisions. The weaknesses are in the surrounding system (auth, testing, modularity, code quality) and in specific schema details that are fixable before implementation. The inventory system should NOT wait for the entire codebase to be refactored — that would never ship. But it should NOT be built on an untested foundation with contradictory specs and disabled type checking.

### Final Verdict

**⚠️ CONDITIONALLY APPROVED FOR IMPLEMENTATION**

Conditions (must be met before Phase 1A begins):

1. Write unit tests for the inventory conversion engine (V3.3 minimum)
2. Resolve the `running_balance` contradiction — remove the column
3. Change materialized view refresh to periodic (60s) — remove trigger approach
4. Simplify the UOM conversion design — remove the fragile `COALESCE` unique index
5. Enable TypeScript strict mode for all new `src/inventory/` code
6. Define and enforce a standard API error envelope for inventory routes
7. Scope the V1 API specification to only Phase 1A–1C endpoints
8. Document the costing method (weighted average) and add unit_cost to transactions

**Strongly recommended (but not blocking):**

9. Split `cms-supabase.ts` into domain-specific files before adding inventory-related CMS functions
10. Adopt a data fetching library (SWR/TanStack Query) for inventory dashboard
11. Use the Server Component + Client Component composition pattern for all inventory pages
12. Document the backup/recovery strategy in the deployment guide

---

*Master Architecture Review — The Boma Café Management System*
*Review completed: 2026-07-29*
*Next action: Resolve 8 blocking conditions, then begin Phase 1A implementation.*
