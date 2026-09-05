# 0004: Role-Aware Application Workflow

- Status: Accepted and implemented.
- Date: 2026-09-05.
- Decision owner: `@sillypoise`.
- Contract owner: `@sillypoise`.

Historical Stage 4 record: shared password login and 100-row list reads below were superseded by
[Stage 5](./0005-isolated-demo.md). They are not current setup instructions.

## Context

Stage 4 must expose the database workflow as a usable vertical product flow without moving trust to
the browser. Requesters, administrators, and reviewers need different actions, while denied or stale
client calls must remain safe when interface state is outdated or manipulated.

## Decision

The application uses Supabase Auth, TanStack Query, TanStack Form, and TanStack Router.

- A pathless authenticated route owns session and active-membership loading.
- PostgreSQL RLS determines which request, membership, and audit rows each role receives.
- The dashboard provides role-specific guidance and a bounded status filter over at most 100 rows.
- Requesters create nullable drafts, edit only database-permitted states, and submit complete work.
- Administrators assign active reviewers returned through organization-scoped RLS.
- Assigned reviewers approve, reject, or request changes with bounded reason input.
- Detail pages refetch requests and immutable audit history after every successful mutation.
- Stable database errors map to bounded user guidance; raw database or authentication errors are not
  rendered.
- Authenticated routes and feature screens are loaded separately from the public landing bundle.

Browser role checks improve usability only. They do not authorize an operation; every mutation still
uses the Stage 3 database functions and authenticated database context.

## Local authentication boundary

The seed provides fictional email identities with one intentionally public local password. The
password is stored as a fixed bcrypt hash in the local-only seed and is documented as a test
fixture, not a secret. Global signup remains disabled. `just database-start` writes only the local
API URL and publishable browser key to ignored `.env.local`; service-role and JWT signing values are
never written or displayed.

This shared local access model must not be deployed. Stage 5 owns isolated visitor identity design
and must replace or remove the fixture before public release.

## Alternatives considered

### Client-side mock workflow

Mocks would make visual work faster but would not demonstrate RLS, atomic transitions, stale
revisions, or real audit events. They were rejected because the database-backed vertical flow is the
core portfolio proof.

### A separate application server

A server could proxy every browser request, but it would duplicate the current authorization
boundary and add deployment and secret-management surface. It remains deferred until a current
server-only integration requires it.

### One eagerly loaded application bundle

A single bundle worked but crossed Vite's 500 kB warning boundary. Route-level lazy loading keeps
the public page independent from authenticated workflow dependencies and removes the build warning.

## Performance sketch

Dashboard queries are capped at 100 rows and audit queries at 100 events. The database API itself
retains a 1,000-row ceiling. The production build separates forms, details, dashboard, and
session/data dependencies; the largest generated chunk is below 310 kB before gzip. These are build
measurements and design limits, not runtime latency claims.

Re-evaluate pagination before an organization can exceed 100 requests or one request can approach
100 audit events. Stage 5 should measure representative page loading rather than infer latency from
bundle size.

## Evidence

- A real local Supabase session completed create, submit, assign, approve, and audit-read
  operations. The final request reached revision 4 with four audit events.
- A local signup attempt was denied while seeded password authentication succeeded.
- Unit tests cover landing and route recovery, nullable draft conversion, inclusive field
  boundaries, immediately invalid values, stale-error recovery wording, and internal-error
  redaction.
- Database authorization and transition behavior remains covered by the transactional pgTAP suite.
- TypeScript, type-aware lint, component tests, and the warning-free production build pass locally.

## Compatibility

This is a pre-release additive application layer with no external consumers. The membership
`display_name` field is additive and does not influence authorization. The database workflow states,
transition inputs, outputs, and stable error meanings are unchanged.
