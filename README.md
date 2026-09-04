# VendorFlow

VendorFlow is an independent product concept for vendor intake and approval. It demonstrates how a
spreadsheet-driven internal process can become a permission-aware workflow with explicit decisions
and an inspectable audit history.

> This repository is portfolio work, not client work or a production deployment. Organizations,
> vendors, users, and activity shown in the eventual demo will be fictional.

## Capability proof

The first release will prove one complete flow:

```text
requester creates a vendor request
→ input is validated
→ an administrator assigns a reviewer
→ the reviewer approves, rejects, or requests changes
→ every state change is authorization-checked and audited
→ the requester sees the result and can recover from requested changes
```

Authorization will be enforced in PostgreSQL rather than only through hidden interface controls.
The test suite will cover valid and invalid transitions, cross-user access, and role denial.

## Current status

Stage 2, application foundation. The repository contains a tested React/TanStack shell and a
minimal local Supabase runtime. The vendor request schema and working workflow begin in Stage 3.
Nothing has been deployed yet.

- [Product brief](./docs/product-brief.md)
- [Workflow contract](./docs/workflow-contract.md)
- [Technology decision](./docs/decisions/0001-technology-stack.md)
- [Local Supabase runtime decision](./docs/decisions/0002-local-supabase-runtime.md)

## Planned stack

- React and TypeScript with Vite.
- TanStack Router, Query, and Form.
- Supabase Auth and PostgreSQL with Row Level Security.
- PostgreSQL functions for authorized, atomic workflow transitions.
- Vitest, React Testing Library, Playwright, and database authorization tests.
- Cloudflare Pages for the frontend, subject to an infrastructure validation spike.
- OpenTofu for supported project-owned infrastructure and Podman for local containers.

## Local development

### Requirements

- Linux on amd64 for the current local Supabase image lock.
- Node.js 22.23.2 through 24.x.
- pnpm 10.33.2.
- just 1.43 or newer.
- Rootless Podman 5.7 or newer.

Use the repository commands rather than duplicating their internal steps:

```bash
just install
just database-start
just develop
```

The application runs at <http://127.0.0.1:5174>. Stop the local Supabase services when finished:

```bash
just database-stop
```

`just database-start` prepares digest-locked images, starts a temporary Podman API socket, and runs
only PostgreSQL, Kong, GoTrue, and PostgREST. It deliberately suppresses generated local keys. See
the [runtime decision](./docs/decisions/0002-local-supabase-runtime.md) for compatibility and
integrity details.

## Validation

```bash
just check
```

The check runs formatting verification, type-aware linting with warnings denied, TypeScript,
component tests, and a production build. Use `just --list` to discover individual commands.

## Planned delivery stages

1. Define the product, workflow contract, and architectural boundaries.
2. Establish the application, command, validation, and local database foundations.
3. Implement the database model, authorization policies, transitions, and database tests.
4. Build the complete requester and reviewer flow.
5. Add failure recovery, responsive polish, accessibility checks, and end-to-end tests.
6. Provision infrastructure, deploy the public demo, and capture portfolio evidence.

Commands and local setup instructions will be added in Stage 2, when executable tooling exists.
