# VendorFlow

**Vendor intake and approval, without the spreadsheet-and-email handoffs.**

[Try the demo](https://vendorflow-demo.pages.dev) · [Demo walkthrough](docs/demo.md)

## The problem

Vendor requests often arrive with incomplete details, unclear ownership, and decisions buried in
email. A spreadsheet can track a status, but it cannot reliably enforce who may change it or explain
how a request reached that state.

## The solution

VendorFlow brings the request, review, and decision into one workflow:

1. **Requesters** describe the vendor, annual spend, business need, and data/operational risk.
2. **Administrators** assign submitted requests to a reviewer.
3. **Reviewers** approve, reject, or request changes with a reason.
4. **Everyone involved** can inspect the request's decision history.

Incomplete drafts can be saved. Stale edits cannot silently overwrite newer changes. Authorization,
revision checks, state changes, and audit entries are enforced together in PostgreSQL—not just by
hiding buttons in the browser.

## Explore the demo

Open the demo, complete verification, and select **Start private demo**. No email or password is
required. Each visitor gets an isolated workspace with six fictional vendor scenarios, from draft
to approved and rejected. Use **Demo role** to explore each part of the process.

Already have a workspace? **Reset my demo** loads the current sample dataset, but deletes your
workspace's existing requests and history. It does not affect other visitors or extend expiry.

The same browser session reuses its workspace; a separate browser/profile gets another one.
Workspaces expire after 24 hours. This is an independent product concept with fictional data and
simulated personas—not client work or evidence of independent-human separation of duties.

See the [sample data and walkthrough](docs/demo.md) for a repeatable demonstration.

## Under the hood

- **React + TypeScript**, with TanStack Router, Query, and Form.
- **Supabase Auth + PostgreSQL**, with resource-scoped RLS and atomic workflow functions.
- **Cloudflare Pages + Turnstile**, with OpenTofu-managed infrastructure.
- **Vitest, pgTAP, and Playwright/axe** for application, database, and browser checks.

Visitor data is isolated by authenticated identity. Cleanup runs in the database; operational health
is monitored without exposing privileged credentials. Role switching is a bounded demo capability,
not a general permission-management feature.

## Run locally

Requires Node.js 22.23.2–24.x, pnpm 10.33.2, just, and rootless Podman on Linux/amd64.

```sh
just install
just database-start
just develop
```

Open <http://127.0.0.1:5174>. See [development and deployment](docs/development.md) for validation,
intentional database resets, infrastructure prerequisites, and hosted commands.

## Further reading

- [Workflow and authorization contract](docs/workflow-contract.md)
- [Product scope](docs/product-brief.md)
- [Hosted operations and evidence](docs/decisions/0007-hosted-operations.md)

The operator has verified the hosted approval flow and cross-browser data isolation. Automated
checks cover invalid transitions, stale revisions, failure recovery, and access denial. Screenshots
and the final portfolio walkthrough remain to be captured; no production-scale claim is implied.
