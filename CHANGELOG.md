# LexOps Client Portal — Changelog

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
