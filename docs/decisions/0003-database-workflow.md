# 0003: Database-Enforced Vendor Workflow

- Status: Accepted and implemented.
- Date: 2026-09-04.
- Decision owner: `@sillypoise`.
- Contract owner: `@sillypoise`.

## Context

VendorFlow must prove that permissions and lifecycle rules survive direct API calls rather than
existing only as hidden buttons. Request edits and transitions also need stale-write protection and
an immutable decision timeline.

## Decision

PostgreSQL is the final authorization and workflow boundary.

- `organizations` owns tenant scope.
- `organization_memberships` binds one authenticated user to one organization and one role in
  version 1.
- `vendor_requests` stores request fields, state, assignment, and a monotonic revision.
- `vendor_request_audit_events` stores append-only creation and transition events.
- Row Level Security restricts reads to request owners, assigned reviewers, and organization
  administrators according to their resource scope.
- Authenticated roles have no direct insert, update, or delete grants on workflow tables.
- Narrow `security definer` functions derive authority from `auth.uid()`, lock the request row,
  validate the expected revision and action, mutate state, and insert the audit event atomically.
- Public functions use an empty `search_path` and fully qualified object names.
- Expected boundary failures use SQLSTATE `P0001` and the stable contract error code as the message.
- Draft fields travel through a nullable composite input so generated TypeScript reflects incomplete
  draft values without unsafe client casts.

The migration, policies, function grants, and error behavior are owned together in
`supabase/migrations/20260904222312_initial_vendor_workflow.sql`.

## Alternatives considered

### Direct table mutations under RLS

RLS can restrict which rows a caller changes, but it does not by itself provide one narrow contract
for state, revision, assignment, and audit mutation. Direct writes were rejected because partial or
out-of-order updates would be harder to prevent and review.

### A separate application API

A Node API could enforce the same workflow, but it would duplicate the Supabase authorization
boundary before external integrations or server-only orchestration require it. This remains
deferred.

### A generic workflow model

Configurable states and transitions were rejected. Six explicit states and three transition RPCs are
smaller, easier to test, and sufficient for the current product proof.

## Contract and compatibility

The Stage 3 contract change is pre-release and has no external consumers. It clarifies:

- The public draft and transition RPC names.
- Full-replacement draft update semantics.
- A 1,000-character decision-reason maximum.
- Creation audit events and the omission of ordinary draft edits from lifecycle history.
- One organization membership per user in version 1.

Future state, role, field, error, or RPC changes require an explicit contract delta and
mixed-version migration review.

## Security properties

- Client-provided organization, owner, role, and actor values are not accepted as authority.
- Cross-organization mutations return `REQUEST_NOT_FOUND` to avoid confirming resource existence.
- Missing identities and inactive memberships fail closed.
- Audit events cannot be inserted, updated, or deleted by the authenticated application role.
- Unknown categories and decisions are parsed inside RPCs so callers receive bounded validation
  errors rather than database enum details.
- Seed records use fictional `.example` identities and only a documented local fixture password
  hash; they contain no production credentials.

## Performance sketch

The initial operating assumption is at most 1,000 requests and eight lifecycle events per request in
a demonstration organization. At a conservative 4 KiB per request and 1 KiB per event, primary row
data is roughly 12 MiB. Allowing another 2x for indexes remains below 40 MiB.

Dashboard reads are indexed by organization, state, owner, reviewer, and update time. Audit reads
are indexed by request and creation order. Transition work locks one request and inserts one event,
so its expected database work is constant per action. Stage 4 must paginate list reads rather than
using the API's 1,000-row safety ceiling as a page size.

These are design estimates, not measured performance claims. Re-evaluate if a current workload
exceeds the assumption or query plans stop using the declared indexes.

## Evidence

The pgTAP suite contains 88 checks covering:

- Schema and least-privilege grants.
- Owner, reviewer, administrator, inactive-user, and anonymous behavior.
- Same-organization and cross-organization visibility.
- All valid transitions and representative invalid state/action pairs.
- Minimum, maximum, and immediately out-of-range field values.
- Stale revisions, invalid assignments, missing reasons, and terminal states.
- Audit atomicity and direct mutation denial.

`supabase db lint` reports no warnings for the public schema. Database reset applies the migration
and loads deterministic fictional seed data successfully. Generated TypeScript definitions are
committed and checked for schema drift.
