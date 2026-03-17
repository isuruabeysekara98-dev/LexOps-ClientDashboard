# LexOps Client Portal — Changelog

## [67] — 2026-03-17 16:05
### Changes
- client/src/components/Dashboard.jsx
+20 insertions, -10 deletions


## [65] — 2026-03-17 16:00
### Changes
- client/src/components/Dashboard.jsx
+7 insertions, -8 deletions


## [63] — 2026-03-17 15:55
### Changes
- client/src/components/Dashboard.jsx
+5 insertions, -5 deletions


## [61] — 2026-03-17 15:50
### Changes
- client/src/components/Dashboard.jsx
+17 insertions, -3 deletions


## [60] — 2026-03-17 15:44
### Changes
- client/src/components/Dashboard.jsx
- scripts/commit.sh
+53 insertions, -55 deletions


## [56.0317] — 2026-03-17
chore: update portal — 2026-03-17 15:31


## [54.0312] — 2026-03-12
chore: update portal — 2026-03-12 06:18


## [53.0312] — 2026-03-12
chore: update portal — 2026-03-12 05:10


## [Unreleased]

## [0.1.0] — 2026-03-11
### Initial structured commit

### Added
- Full-stack client portal (React + Vite + Express + Supabase)
- Authentication and RBAC (lexops_admin, lexops_member, client roles)
- Dashboard with 8 tabs: Overview, Timeline, Tasks, Documents, Invoices, Software, Maintenance, Book a Call
- Client view with scoped tabs: Overview, Your Actions, Documents, Invoices, Book a Call
- Admin panel with 3 sections: Clients, Team, Projects
- Proposal onboarding flow: create, send, view, sign, account creation
- AI project structure generation from proposal PDF (Claude API)
- Resend email integration (all transactional emails)
- Welcome screen for first-time client login
- Document request and fulfillment flow
- Invoice upload-only flow
- Mobile optimisation
- Custom domain: client.lex-ops.io
- Favicon and page titles
- Forgot password and profile avatar
- CRUD operations for all dashboard tabs with error handling
- Date pickers for all date fields
- Assignee dropdown populated from team members
- Resend invite and pending invite management in admin panel
- Generate with AI button on projects (manual PDF upload trigger)
- GitHub integration and changelog

### Fixed
- project_members UUID type migration
- RLS policies across all tables
- Supabase duplicate email suppression
- Client blank screen after proposal acceptance
- Admin crash on null date fields
- React hooks ordering error in ProposalPage
- Express JSON body size limit for PDF uploads
- API catch-all intercepting /api routes
