<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Architecture rules (frontend / backend separation)

The frontend never talks to the database directly. Every read and write goes through the API routes in `src/app/api/`.

## Pages and components (frontend)
- Do not use `createClient()` from `@/lib/supabase/client` to query tables (`.from(...)`) in pages or components.
- Call the backend with `api.get / api.post / api.patch / api.del` from `@/lib/api-client`.
- For the current user and org, use `getMe()` / `getOrgId()` from `@/lib/session` (one `/api/me` call per page load). Staff (PIN) pages use `getStaffOrg()`.
- Allowed to stay on Supabase in the browser: auth (sign in / sign out / password), Storage uploads, and Realtime channels.

## API routes (backend)
- Every route authenticates first:
  - Owner / branch manager: `verifyOrgAccess(org_id)`. Scope branch managers with `enforcedBranchId(access, branch_id)`.
  - Staff (PIN): `verifyStaffToken(extractStaffToken(req))`. Take `staff_id` / `org_id` from the token, never from the request body.
  - Admin panel: `requirePermission(req.headers.get('x-admin-key'), '<permission>')`.
  - Scheduled jobs: `isCronRequest(req)` from `@/lib/cronAuth`.
- Use the service-role client only after that check, and always filter by `org_id`. Verify that any id from the request (product, supplier, staff, branch) belongs to the org before writing.
- Never spread the request body into an insert/update. Whitelist fields explicitly.
- Values the server can know (org name, prices, supplier details, the acting user) come from the database, not the client.
- `route.ts` files may only export HTTP handlers. Shared helpers live in `src/lib/`.

## Data rules
- Product quantity is derived: the `after_stock_movement` trigger sets `products.qty` to the sum of `stock_movements.qty_change`. Change stock by inserting a movement; never write `qty` directly.
- `purchases.vat_amount` / `total_amount` are generated from `amount` and `has_vat`. Write `amount` (net) and `has_vat` only.
- New staff PINs are stored as bcrypt hashes and never returned to the browser.
- Supplier orders are sent once per drop below the reorder point (`lib/supplierOrderGate`).

## Workflow
- Work on the `staging` branch (separate Supabase project). Publish to `main` (production) only when the owner says so.
- Database changes: write the SQL under `supabase/security-fixes/` with a rollback file, run it on staging first, then production. Run it before deploying code that depends on it.
- Vercel functions run in `syd1`, next to the Supabase database (Sydney). Keep them co-located.
