# 0005: Isolated Visitor Workspaces and Experience Hardening

- Status: Accepted and implemented locally; public release blocked on hosted operational gates.
- Date: 2026-09-05.
- Decision and contract owner: `@sillypoise`.
- Contract: [Workflow contract](../workflow-contract.md#private-demo-boundary).
- Evidence: [Stage 5 validation](../stage-5-validation.md).

## Decision

Use Supabase anonymous authentication and PostgreSQL-issued demo capabilities. Each visitor owns
one private organization, membership, and seeded draft. Role switching simulates requester,
administrator, and reviewer personas on that identity; it does not claim separate-human approval.

`start_demo` locks the authenticated anonymous Auth row and provisions atomically/idempotently.
`demo_control` rechecks active membership and the unexpired private capability before changing role
or resetting caller-owned data. All workflow mutations lock the same session row before request
locking. Ordinary organizations cannot acquire these capabilities or nominate administrator-role
reviewers. Authenticated clients retain no direct table-write grants.

Reset is an explicit exception to lifecycle-history retention, not an ordinary workflow transition.
A private control log records provisioning, successful role changes, and resets without request
contents or credentials. It survives reset and is deleted only by service-only expiry cleanup.

Workspace access expires after 24 hours independently of JWT refresh. Caps are 100 live requests,
revision 100 per request, and 200 successful controls per session. Cleanup deletes at most one
expired workspace and 100 abandoned anonymous identities per call. The UI uses 20-row pages, at
most five pages, and revision-ordered audit reads. No public scheduler or service-role key exists
in the browser.

The browser retains the revision captured when editing starts, preserves values on failed saves,
and requires explicit discard/reload for stale edits. A changed role or identity receives a fresh
query cache. Workflow mutations are never automatically retried. A 15-second transport timeout bounds waits
but cannot establish whether a write committed; failure guidance tells users to inspect current
state before retrying. Creation has no idempotency key in this release.

## Admission and alternatives

- **Admit** two private tables and three narrow demo RPCs: current public-demo isolation, control
  auditing, expiry, and cleanup require server-owned state. Reuse existing workflow RPCs and RLS.
- **Reject** shared credentials: visitors could overwrite one another's requests and decisions.
- **Defer** three Auth users per visitor or a separate API: more tokens, provisioning, and cleanup
  complexity without a present need to prove independent-human separation of duties.
- **Admit** pinned Playwright and axe development dependencies: existing unit and database tests
  cannot observe real browser navigation, stale-tab behavior, CSS layout, or accessible names.
- **Defer** general workflow engines, production tenant provisioning, and arbitrary pagination:
  the current demo has explicit finite limits and one narrow flow.

## Resource sketch and confidence

Per workspace, at most 100 request rows and 10,000 lifecycle events can remain live. At an estimated
12 KiB per maximally populated request and 5 KiB per event (including multi-byte reason text), primary
row data stays around 50 MiB before indexes/WAL. Actual seeded data is much smaller. Cleanup handles
one workspace per transaction to avoid multiplying that worst-case deletion across 100 workspaces.
These are conservative design estimates, not storage or deletion-time benchmarks.

A page transfers at most 20 request records and performs no N+1 API reads. At 12 KiB per maximal
record, its request payload is roughly 240 KiB before JSON overhead/compression. Detail reads use
one request query and one bounded audit query. UI membership rechecks occur every 30 seconds while
mounted. Database session locks serialize same-visitor mutations; distinct visitors use distinct
rows. No throughput claim follows from these facts.

Confidence is high for tested local authorization and failure paths, based on real role-scoped
pgTAP and browser checks. Confidence in hosted abuse resistance and operations remains low until
Stage 6 exercises the deployed topology. Re-evaluate bounds before supporting larger organizations,
more than one membership, longer sessions, or independent reviewer identities.

## Public-release gates

Owner: `@sillypoise`. Security and operational controls must be verified before enabling signup.
The operator-authorized Stage 6 cutover permits the final real-session workflow/latency checks;
complete those checks before advertising a shipped release. See
[the cutover evidence and rollback](./0007-hosted-operations.md#remaining-evidence-and-rollout).

1. Enable and test hosted CAPTCHA (including browser token delivery) and conservative anonymous
   Auth/API rate limits. Local anonymous signup permits 100/hour/IP for repeated E2E runs and has no
   CAPTCHA. That configuration is not a hosted abuse-control approval.
2. Schedule service-only cleanup, measure worst-case invocation time/WAL, and alert on stale/missing
   cleanup runs, expired backlog, abnormal signup/control rates, and database capacity. Include
   abandoned Auth identities. Stage 6 installs the database-owned scheduler; measured workload and
   limitations are recorded in the hosted operations decision.
3. Verify anonymous Auth, disabled email signup/login, HTTPS, security headers/CSP, key separation,
   database/function grants, redacted logs, quotas, and fail-closed behavior on hosted Supabase.
4. Provision supported resources with OpenTofu; document state protection, rollback, teardown, and
   the offline application/Auth cutover. Do not deploy shared fixture credentials or browser-test
   artifacts. Security failures must remain visible in operator telemetry without tokens/payloads.
5. Measure hosted navigation and workflow latency under a declared workload. Local Chromium timings
   do not establish mobile-device performance, accessibility conformance, or public capacity.
