# 0001: Initial Technology Stack

- Status: Accepted with validation gates.
- Date: 2026-09-04.
- Decision owner: `@sillypoise`.

## Context

VendorFlow must demonstrate a polished internal workflow, PostgreSQL-backed modeling, and
server-enforced permissions. The portfolio strategy allocates TanStack and Supabase to this
project. The smallest useful architecture should preserve those signals without introducing a
separate custom API before it is required.

## Decision

Use:

- React and TypeScript with Vite for the browser application.
- TanStack Router for typed client routing.
- TanStack Query for remote server state and mutation lifecycle.
- TanStack Form for request forms.
- Supabase Auth for identity.
- Supabase PostgreSQL, Row Level Security, constraints, and database functions for data and
  authorization.
- Database functions for sensitive state transitions so authorization, revision checks, request
  mutation, and audit insertion occur atomically.
- Vitest and React Testing Library for unit and component checks.
- Playwright for browser-level vertical-flow checks.
- Database-level tests for policies, transitions, constraints, and denied operations.
- Cloudflare Pages as the tentative static frontend host and hosted Supabase as the tentative data
  platform.
- OpenTofu for provider-supported project infrastructure and Podman for local containers.

Add TanStack Table only when dashboard requirements exceed a simple semantic table. Select an
accessible component library only after the visual foundation identifies repeated component needs.

## Why this option

A client-rendered application can use Supabase's authenticated API while PostgreSQL remains the
final authorization boundary. This avoids a separate Node service that would initially proxy the
same operations without adding a current capability.

The sensitive transitions still receive narrow server-side contracts through PostgreSQL functions.
Unrestricted table updates are not used for workflow actions.

## Alternatives considered

### TanStack Start

TanStack Start could provide server rendering and server functions. VendorFlow's authenticated
workflow does not currently require server-rendered content, and adding a server runtime would
increase deployment and authorization surfaces. Reconsider it only if a current requirement needs
server-only orchestration or rendering.

### Next.js

Next.js is a credible application framework, but Integration Hub is the portfolio's primary Next.js
signal. Reusing it here would weaken the intended TanStack and Supabase architecture evidence.

### A custom Node API

A custom API could centralize authorization, but Supabase policies and narrow database functions can
satisfy the current boundaries with less machinery. Add an API only if external integrations,
privileged orchestration, or a contract unsupported by database functions becomes necessary.

### Configurable workflow engine

A generic workflow engine is rejected. The first release has one workflow and six known states, so
explicit transitions are safer and easier to verify.

## Consequences

- RLS policies and database functions are security-critical application code and require direct
  negative-path tests.
- Schema migrations are part of the application contract and must be reviewed with generated types.
- Browser code contains only the public Supabase key; service-role credentials remain outside the
  browser, repository, logs, and error payloads.
- Static hosting remains simple, but server-only functionality requires a separately justified
  boundary.
- Supabase local tooling and Cloudflare infrastructure support must pass validation before they are
  adopted in repeatable project commands.

## Validation gates

Stage 2 must demonstrate:

1. A reproducible Supabase development and test workflow that uses Podman or documents a justified
   narrow exception.
2. Locked frontend dependencies and strict formatting, linting, and type-checking commands.
3. No service-role credential in browser artifacts or repository files.

Stage 2 satisfied these gates on 2026-09-04. The tested Podman workflow and temporary Supabase CLI
pin are recorded in [decision 0002](./0002-local-supabase-runtime.md). The application currently
installs TanStack Router because routing has a current consumer. TanStack Query, TanStack Form, and
the Supabase browser client remain deferred until a working feature consumes each dependency.

Stage 6 must demonstrate:

1. Reviewable OpenTofu support for selected project-owned resources.
2. Documented cost, state, locking, rollback, and teardown behavior.
3. Visitor-isolated demo data and bounded reset behavior.

Failure of a validation gate triggers a review of this decision rather than an undocumented
workaround.
