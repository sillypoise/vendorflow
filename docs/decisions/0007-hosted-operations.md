# 0007: CAPTCHA, Database Maintenance, and HTTPS Migrations

- Status: Implementation in progress; public signup remains closed.
- Owner: `@sillypoise`.
- Date: 2026-09-06.
- Contract: [Workflow and health boundaries](../workflow-contract.md).

## Admission decisions

- Reuse Cloudflare's explicit Turnstile API without another React dependency. One script is loaded
  per document with a 15-second deadline. Widget retries and refreshes are manual, callbacks are
  ignored after disposal/failure, tokens are bounded and single-use, and missing hosted configuration
  fails closed. Compact rendering fits the declared 320-pixel layout. Supabase still verifies the
  token server-side; the browser is not the authorization boundary.
- Reuse Supabase's pg_cron extension and existing bounded cleanup function instead of deploying an
  external worker with a service key. A private singleton heartbeat records successful completion;
  a public, read-only health bit allows credential-free privileged-access monitoring using only a
  publishable API key. The health bit includes missing/stale cleanup, backlog, rate, and storage
  thresholds. It is not a public diagnostics or cleanup endpoint.
- Admit a narrow HTTPS migration runner because both direct PostgreSQL paths were tested and failed:
  the pooler connection terminated unexpectedly and direct connection reported unavailable IPv6.
  Do not buy an IPv4 add-on or introduce another application server to work around this environment.

## Migration transport and safety

`hosted-database-plan` reads Supabase's native migration-history endpoint and prints pending local
filenames. `hosted-database-apply` requires explicit approval and committed, unmodified migration
files. Each migration uses the Management API database-query endpoint in one transaction, with a
30-second statement timeout and a transaction-scoped advisory lock. SQL and its original version,
name, and source are recorded together in `supabase_migrations.schema_migrations`. An already applied
version aborts before schema mutation. After an ambiguous response, inspect the next plan before
retrying; do not automatically retry writes.

The runner preserves the repository's existing version identifiers rather than using the
Management API create-migration endpoint, which assigns new versions. Unknown hosted versions or
non-prefix history fail closed. No local seed identities are deployed. Existing migrations remain
immutable and must be reviewed together with contract deltas. Native CLI deployment can be
re-evaluated when a supported database network path exists.

An exploratory `supabase link` also populated local version caches; a subsequent local reset stalled.
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

## Remaining evidence and rollout

Local tests cover token bounds, expiry, disposal, provider error redaction, signup token forwarding,
missing configuration, scheduler denial, heartbeat expiry, inactive jobs, and rate alert boundaries.
Hosted migrations, actual scheduler heartbeats, monitoring delivery, maximum-size cleanup behavior,
CAPTCHA delivery/rejection, and HTTPS browser workflow checks still require recorded evidence before
public signup can be enabled. A public frontend with signup closed is only a release candidate, not
a shipped portfolio demo.
