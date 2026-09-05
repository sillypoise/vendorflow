# VendorFlow Product Brief

## Status

- Stage: Application workflow implemented; experience hardening is next.
- Product owner: `@sillypoise`.
- Document owner: `@sillypoise`.
- Last reviewed: 2026-09-05.

## Problem

Small operations and finance teams often coordinate vendor intake through forms, email, chat, and
spreadsheets. Requesters cannot reliably see who owns a review, reviewers receive incomplete
information, and the final decision lacks a trustworthy history.

## Product proposition

VendorFlow gives requesters and reviewers one place to submit, assign, review, and resolve vendor
requests. The product emphasizes explicit permissions and traceable decisions rather than broad
procurement functionality.

## Capability being demonstrated

VendorFlow will provide reviewer-visible evidence of:

- Building a polished internal workflow with React and TanStack.
- Modeling workflow invariants and audit history in PostgreSQL.
- Enforcing action- and resource-scoped authorization with Supabase Row Level Security.
- Handling invalid input, denied actions, invalid transitions, and recoverable review outcomes.

## Users and responsibilities

### Requester

- Creates a vendor request within their organization.
- Reads and edits their own draft.
- Submits a complete draft.
- Reads decisions and audit history for their request.
- Corrects and resubmits a request when changes are requested.

### Reviewer

- Reads requests assigned to them.
- Approves, rejects, or requests changes on a request under review.
- Supplies a reason when rejecting or requesting changes.

### Administrator

- Reads requests within their organization.
- Assigns one reviewer to a submitted request.
- Reads audit history for requests within their organization.

Administrators do not silently override review decisions in the first release. This keeps decision
ownership explicit and prevents an administrative role from becoming an authorization bypass.

## Primary vertical flow

1. A requester creates and edits a draft.
2. Submission validates all required fields before changing state.
3. An administrator assigns a reviewer, which starts the review.
4. The assigned reviewer approves, rejects, or requests changes.
5. The requester sees the decision and its audit event.
6. If changes were requested, the requester edits and resubmits the request.

Each state transition and corresponding audit event must commit in one database transaction.

## First-release screens

1. A public introduction that accurately labels the project and demo data.
2. A role-aware request dashboard with useful status and assignment filters.
3. A vendor request form with field-level validation and draft behavior.
4. A review workspace containing request details, notes, and permitted actions.
5. A chronological, immutable request history.

## Required experience states

Every applicable screen must explicitly handle:

- Loading.
- Empty results.
- Invalid input.
- Permission denial.
- Stale or invalid workflow transitions.
- Unexpected server failure.
- Recovery through retry, correction, or safe navigation.

The first release supports a 320 CSS-pixel mobile viewport through a 1,440 CSS-pixel desktop
viewport. Stage 5 must test both boundaries and representative intermediate widths.

## Initial request data

The initial request contract contains:

- Vendor legal name.
- Vendor website.
- Service category.
- Business justification.
- Expected annual spend in integer cents and its currency.
- Whether the vendor receives confidential data.
- Whether the vendor supports a business-critical process.
- Request owner and organization, derived from authenticated server context.

Risk indicators may be derived from submitted answers for display. They will not independently make
or recommend approval decisions in the first release.

## Success criteria

The first release is complete when:

- The full vertical flow works against the real application database.
- PostgreSQL enforces organization, ownership, assignment, role, and transition boundaries.
- Audit events cannot be edited through the public application role.
- Valid, invalid, boundary, cross-user, and permission-denied paths have automated checks.
- The declared mobile and desktop viewport boundaries are usable and visually coherent.
- A visitor can safely demonstrate the core flow without affecting another visitor's data.
- `just check` passes without ignored failures.
- The public deployment and its required resources are documented and reproducible.
- The README distinguishes real behavior from seeded or simulated context.

## Non-goals

The first release will not include:

- Configurable or multi-stage approval workflows.
- Contract lifecycle, signatures, invoicing, or payments.
- Live compliance, identity, accounting, or procurement integrations.
- Email delivery infrastructure.
- AI-generated risk or approval recommendations.
- Production-scale multi-tenancy or enterprise provisioning.
- General workflow-building abstractions.

## Decisions and re-check triggers

### Public demo identity isolation

A shared mutable demo account is not acceptable because visitors could affect one another. Before
public deployment, Stage 5 must select and test a visitor-isolated Supabase identity and seed/reset
model. If isolation cannot be made simple and reliable, the deployment design must be reconsidered.

### Local Supabase operation with Podman

Stage 2 verified the minimal local stack through Podman's compatibility API without Docker. The
[runtime decision](./decisions/0002-local-supabase-runtime.md) records the temporary CLI pin,
digest-locked images, supported host boundary, and upgrade trigger.

### Hosting topology

Cloudflare Pages plus hosted Supabase is the current recommendation. Stage 6 must verify provider
support, cost, secret handling, state handling, rollback, and teardown before infrastructure is
applied.
