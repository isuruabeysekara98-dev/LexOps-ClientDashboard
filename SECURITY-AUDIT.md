# Security audit — open findings

> Status: documented, **not yet fixed**. Raised during the Active Projects audit (2026-06-26).

## 🔴 CRITICAL — Generic DB proxy allows privilege escalation & cross-tenant access

### Where
- `server/routes/admin.ts`
  - `GET /api/admin/db-read` (~line 681)
  - `POST /api/admin/db` (~line 710)
- Both run on the **service-role key** (bypasses Supabase RLS) and are gated only by
  `requireAuth` (~line 22), which verifies the caller is *a* logged-in user but **not**
  their role and **not** row/project ownership.
- The client dashboard (`client/src/components/Dashboard.jsx`) reads/writes through these
  via the `adminFetch` / `dbWrite` helpers, so **clients are authenticated callers** of them.

### Impact (any logged-in client, from the browser console)
```js
// Privilege escalation to LexOps admin:
dbWrite("profiles", "update", { role: "lexops_admin" }, { id: MY_USER_ID })

// Cross-tenant data exfiltration (no project scoping enforced):
adminFetch("/db-read?table=invoices")     // ALL invoices, all clients
adminFetch("/db-read?table=profiles")     // every user
adminFetch("/db-read?table=proposals")    // every proposal

// Tamper with any project's rows by id:
dbWrite("invoices", "update", { status: "paid" }, { id: ANY_INVOICE_ID })
dbWrite("support_tickets", "delete", null, { id: ANY_TICKET_ID })
```
`ALLOWED_TABLES` includes `profiles`, `projects`, `invoices`, `proposals`,
`project_members`; the arbitrary `match` clause targets any row in any project.

### Why it exists (context)
The proxy was introduced because Supabase **RLS was blocking direct client reads/writes**,
so traffic was routed through the service-role key to make CRUD work. **The remediation must
preserve working CRUD** — keep the service-role proxy, but add authorization gates.

### Remediation (keep CRUD working, add gates)
1. **Protect `profiles.role`** — strip `role` (and other privileged columns) from any
   client-originated `profiles` write; ideally drop `profiles`/`projects` from the
   client-writable set entirely.
2. **Per-project ownership scoping** — resolve the caller's `project_members` rows; reject any
   `project_id` / `match.id` that isn't theirs. Require `project_id` on `db-read` (no unscoped
   table dumps).
3. **Split admin vs client surfaces** — admins (`requireAdmin`) keep broad access; clients get a
   narrow, ownership-checked surface (e.g. only `support_tickets` for their own project, read-only
   elsewhere).
4. **Per-table operation allowlists** — e.g. clients cannot `delete` invoices or `update` projects.

## 🟠 MEDIUM — Calendly URL not validated
`SupportTab.saveCalendlyUrl` (Dashboard.jsx ~line 1018) stores any string and renders it into
`<a href>` (~line 1274). A malicious/typo'd `javascript:` or non-URL value becomes a click-time
XSS / open-redirect. Validate `https://` (ideally `calendly.com`) before saving.

## 🟢 LOW
- Ticket delete has no confirmation (Dashboard.jsx ~line 1201) — optimistic, instant.
- `createTicket` failures are swallowed without user feedback (~line 1060).
