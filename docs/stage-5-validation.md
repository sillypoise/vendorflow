# Stage 5 Validation Evidence

- Owner: `@sillypoise`.
- Recorded: 2026-09-05.
- Scope: Local production build, Linux amd64, rootless Podman, pinned Supabase and Chromium.
- Status: Local hardening evidence, not a public deployment or security certification.

## Reproduce

```bash
just install
just database-start
just browser-install
just check
```

`just browser-test` builds the application and runs seven scenarios at each of three viewport sizes
against a fresh production preview server on port 4174. Its configuration rejects a non-local
Supabase URL. It creates isolated anonymous identities/workspaces; those expire rather than changing
shared fixtures. `just database-reset` deletes all local changes and is optional when a clean fixture
rebuild is intentional. `just database-stop` removes the local stack without backup.

## Observed checks

- 23 unit/component checks: route recovery, nullable draft values, field boundaries, bounded error
  mapping/redaction, unsafe browser configuration, malformed identifiers, and first/last/invalid
  request-page boundaries.
- 146 transactional pgTAP checks: ordinary and demo authorization, all six workflow states,
  field/revision boundaries, atomic audit behavior, RLS isolation, inactive membership, demo
  provisioning/control grants, expiry, cap edges, cleanup, and abandoned anonymous identities.
- 21 Chromium checks: requester → administrator → reviewer, requested changes/correction/resubmission
  and approval; independent visitors across role changes/reset; invalid drafts and empty views;
  failed session creation, pending reads, backend errors and retry; stale edits across tabs;
  unsaved-navigation confirmation; denied edit routes; logout/new-session cache separation.
- Automated axe WCAG 2 A/AA and 2.1 AA checks on landing, entry, dashboard, form, and completed detail
  views at 320×800, 768×1,024, and 1,440×1,000. Checked viewport overflow and form/control bounds.
- Keyboard skip-link focus was exercised in Chromium. Temporary full-page captures of the seeded
  request at 320 and 1,440 pixels were visually reviewed; no clipped controls were observed. Those
  captures were deleted, not published as permanent portfolio evidence.
- Direct local Auth checks denied email signup (HTTP 400) and shared-fixture password login
  (HTTP 422), both with `email_provider_disabled`. The browser-test hosted-URL guard also rejected
  a non-local configuration before test collection.
- Formatting, strict type-aware lint (including E2E code), TypeScript, public/private database lint,
  generated-type drift, and the warning-free production build passed.

The tests live in `src/**/*.test.*`, `supabase/tests/`, and `e2e/`. Tests use the actual Auth/PostgREST
boundary except explicitly injected network failures. Browser traces, videos, screenshots, and
storage-state files are not recorded. Failure-context files may contain fictional workspace text;
`test-results/` and browser reports are ignored and must not be uploaded.

## Loading measurements

The keyboard/entry scenario prints a cold local landing navigation measurement on every run using
`PerformanceNavigationTiming` and resource `transferSize` values. One observed production-preview
run returned:

| Viewport width | DOMContentLoaded | Transferred by measurement time |
| --- | --- | --- |
| 1,440 px | 36 ms | 98,493 bytes |
| 320 px | 33 ms | 98,493 bytes |
| 768 px | 34 ms | 98,493 bytes |

These are individual observations on an unthrottled local machine and a fresh browser context, not
percentiles, LCP/INP measurements, real-device results, or hosted latency claims. The transfer total
covers resources observed by the measurement point, not every later route. Re-run `just browser-test`
for current numbers; differences are expected.

The same build reported approximately 304 kB / 95 kB gzip for the largest JavaScript chunk, 229 kB /
61 kB gzip for authenticated-session dependencies, and 74 kB / 19 kB gzip for the form chunk. Build
sizes are a payload baseline, not evidence of runtime responsiveness. See the
[decision's resource sketch](./decisions/0005-isolated-demo.md#resource-sketch-and-confidence).

## Findings resolved

- Open forms previously inherited background-refetched revisions. They now capture the initial
  revision and retain typed values after a stale save, with explicit discard/reload recovery.
- Real-browser exact label locators exposed that inline help/error text contributes to accessible
  names. Select tests use exact combobox roles; field errors are announced and invalid inputs marked.
- Role-change tests initially navigated before full-page cache disposal finished. They now wait for
  the target dashboard before accessing another request.
- Reviewer actions stack at narrow widths; request facts wrap long text; reduced-motion preferences
  disable transitions; request lists have bounded previous/next controls.

## Limitations and next gates

Confidence is high for the explicit local checks above. Automated axe and viewport checks do not
establish complete WCAG conformance: no screen-reader audit, physical mobile device testing,
Firefox/WebKit coverage, or exhaustive state/viewport combination is claimed. Terminal rejection
and expiry/cap behavior are database-tested; the browser suite does not force time or server caps.
Concurrent provisioning is protected by row locking, but no simultaneous-connection load/race test
or maximum-size cleanup benchmark was run.

A lost mutation response may follow a successful commit. The UI warns users to check current state;
create retries are not idempotent. Five-page reads are not snapshot-consistent across concurrent
writes. Neither limitation warrants a generic retry or pagination framework for this bounded demo.

[Hosted release gates](./decisions/0005-isolated-demo.md#public-release-gates) remain mandatory:
CAPTCHA/token delivery and rate controls, cleanup scheduling/backlog alerts, capacity measurements,
HTTPS/security configuration, infrastructure state handling, and deployed isolation checks. Nothing
is publicly deployed, and no hosted performance or abuse-resistance claim is made.
