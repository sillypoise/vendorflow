# 0007: CAPTCHA, Database Maintenance, and HTTPS Migrations

- Status: Hosted workflow and cross-browser isolation confirmed by the operator.
- Owner: `@sillypoise`.
- Date: 2026-09-05.
- Contract: [Workflow and health boundaries](../workflow-contract.md).

## Admission decisions

- Reuse Cloudflare's explicit Turnstile API without another React dependency. One script is loaded
  per document with a 15-second deadline; verification has a separate 60-second deadline.
  Widget retries and refreshes are manual, callbacks are
  ignored after disposal/failure, tokens are bounded and single-use, and missing configuration
  fails closed. Compact rendering fits the declared 320-pixel layout. Supabase still verifies the
  token server-side; the browser is not the authorization boundary.
- Reuse Supabase's pg_cron extension and existing bounded cleanup function instead of deploying an
  external worker with a service key. A private singleton heartbeat records successful completion;
  a public, read-only health bit allows monitoring without privileged credentials, using only a
  publishable API key. The health bit includes missing/stale cleanup, backlog, rate, and storage
  thresholds. It is not a public diagnostics or cleanup endpoint.
- Admit a narrow HTTPS migration runner because both direct PostgreSQL paths were tested and failed:
  the pooler connection terminated unexpectedly and direct connection reported unavailable IPv6.
  Do not buy an IPv4 add-on or introduce another application server to work around this environment.

## Migration transport and safety

`hosted-database-plan` reads Supabase's native migration-history endpoint and prints pending local
filenames. `hosted-database-apply` requires explicit approval and committed, unmodified migration
files. SQL is read from the captured Git commit, not a mutable working-tree file. Each migration
uses the Management API database-query endpoint in one transaction, with a
30-second statement timeout and a transaction-scoped advisory lock. SQL and its original version,
name, and source are recorded in `supabase_migrations.schema_migrations`. An already applied
version aborts before schema mutation. After an ambiguous response, inspect the next plan before
retrying; do not automatically retry writes.

The runner preserves the repository's existing version identifiers rather than using the
Management API create-migration endpoint, which assigns new versions. Unknown hosted versions or
non-prefix history fail closed. No local seed identities are deployed. Existing migrations remain
immutable and must be reviewed together with contract deltas. Native CLI deployment can be
re-evaluated when a supported database network path exists.

An exploratory `supabase link` populated local version caches; a subsequent local reset stalled.
Clearing that generated link cache and rebuilding disposable local services restored validation.
The HTTPS runner does not link the workspace or share hosted caches with local Podman operations.

## Secret boundaries

Provider tokens come from the approved environment and are sent only to the fixed Supabase
Management API over HTTPS, with redirects denied. Raw provider responses and CLI diagnostics are not
printed. Browser builds receive only the fixed API URL, publishable key, and public Turnstile site
key. They never receive the database password, state recovery passphrase, CAPTCHA secret, or
service-role key as Vite configuration. Hosted operations do not upload traces or browser storage.

`public/_headers` fixes the allowed backend and Turnstile origins, blocks framing and objects,
restricts base URLs and forms, and enables HSTS/nosniff. Inline styles are permitted for widget
presentation; inline scripts and eval are not. Header lines exceed the code formatting limit because
Cloudflare's header artifact requires each policy on one line. Provider scripts are an explicit
third-party trust dependency, not vendored or integrity-pinned assets.

## Observed hosted database evidence

All four repository migrations were applied successfully through HTTPS; the subsequent plan had no
pending versions. A hosted heartbeat was observed with `demo_health() = true`, zero identities, and
zero requests before verification fixtures were introduced. Fixtures in
`supabase/verification/hosted_workflow.sql` then passed real authenticated-grant/RLS checks for two
visitors, cross-workspace denial, role denial, approval, stale revisions, audit preservation, and
reset isolation. Their transaction rolled back. Unsigned HTTP request reads, `start_demo`, and
cleanup calls each returned 401; signup without verification returned `captcha_failed`. Missing
operator credentials and an incorrect migration approval also failed closed. This does not prove
successful browser/Auth integration.

`just hosted-cleanup-benchmark approve-vendorflow-benchmark` ran the SQL workload in
`supabase/benchmarks/demo_cleanup.sql`: 100 requests, 10,000 audit rows, and 39,600,000 bytes of
maximum-length four-byte reasons. One measured hosted cleanup took **116.22 ms**, deleted one
identity, and produced an approximately **2,560,040-byte** cluster WAL delta. A preliminary run
completed but its numeric-result parser rejected PostgreSQL numeric strings; the corrected run
provided the recorded timing. All fixture data rolled back, but disk/WAL work was real.

Confidence: high for that single measurement, low for extrapolation under concurrency. This is a
maximum-row/reason workload, not a worst-case latency guarantee; it does not model refresh-token
history, concurrent callers, repeated churn, cold storage, or other workloads. The scheduled
20-second timeout is an enforced bound, not a demonstrated performance target.

The static uploader uses integrity-locked Wrangler as a development dependency. Its Worker/esbuild
installation hooks are explicitly ignored because this project uploads static files only; revisit
that decision before introducing Pages Functions. Builds receive a minimal environment containing
only public Vite configuration, while upload subprocesses receive only their Cloudflare credential.

The scheduled health probe checks a deep frontend route, framing policy, and the database health
bit every ten minutes. Failure opens or retains one bot-owned operator issue. Schedule latency is
not guaranteed; the owner must review workflow activity weekly, re-enable inactive schedules, and
investigate open alerts rather than treating silence as success. The pre-upload failed probes
[33987484796](https://github.com/sillypoise/vendorflow/actions/runs/33987484796) and
[33987588464](https://github.com/sillypoise/vendorflow/actions/runs/33987588464) created and retained
one [operator issue](https://github.com/sillypoise/vendorflow/issues/1). After the frontend upload,
[33987761099](https://github.com/sillypoise/vendorflow/actions/runs/33987761099) passed. The issue was
then closed with that evidence. This verifies issue creation and deduplication, not email delivery.

## Remaining evidence and rollout

Local tests cover token bounds, expiry, disposal, provider error redaction, signup token forwarding,
missing configuration, scheduler denial, heartbeat expiry, inactive jobs, and rate alert boundaries.
The closed-signup release candidate is uploaded at https://vendorflow-demo.pages.dev. Its first
release commit, `4339122`, passed [CI](https://github.com/sillypoise/vendorflow/actions/runs/33987469951).
A hosted Chromium visit at 320 pixels showed no horizontal overflow, but the production widget did
not issue a token within 30 seconds. That observation motivated the explicit verification deadline,
manual reload control, and tests at 59,999/60,000 ms, after success, and after disposal failure.

The operator subsequently confirmed that verification completes in a normal browser and enables
`Start private demo`. The operator then submitted with verification and observed HTTP 422 with
`code: anonymous_provider_disabled`, rather than the `captcha_failed` response observed without a
token. Confidence is high that the verified request passed the CAPTCHA check and reached the
closed anonymous-provider gate. After the cutover, the operator confirmed successful workspace
creation, submission, assignment, approval, and cross-browser data isolation. These are reported
normal-browser observations, separate from the automated database evidence below.

The operator explicitly authorized the next controlled cutover. The reviewed encrypted OpenTofu
plan changes only `disable_signup` to false and `external_anonymous_users_enabled` to true on the
existing settings resource: zero additions, one in-place update, zero deletions. CAPTCHA, its secret,
email/phone restrictions, rate limits, SSL, and API exposure remain unchanged. Hosted health,
missing-token rejection, and transactional authorization checks passed immediately before planning.

The apply completed with one settings update and no additions/deletions. Management API reads
confirmed both signup values and unchanged CAPTCHA, email/phone restrictions, rate limits, and JWT
lifetime. Post-cutover health and transactional workflow checks passed; unsigned reads/start/cleanup
still returned 401, and a missing CAPTCHA token still returned `captcha_failed`. A refreshed
infrastructure plan reported no changes. The encrypted local state was retained; its independent
operator-owned backup remains the operator's responsibility after this apply.

The reported live workflow check is complete; screenshots, a final walkthrough, and remaining
measurement evidence are separate portfolio tasks. Owner: `@sillypoise`.
If verification fails, restore the two prior Auth values through a fresh reviewed OpenTofu plan.
Do not reset the database or rotate unrelated credentials as a rollback. Never share request bodies,
CAPTCHA tokens, or browser-storage exports. Do not substitute test keys or forge tokens.
