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

Stage 1, product definition. No application has been scaffolded or deployed yet.

- [Product brief](./docs/product-brief.md)
- [Workflow contract](./docs/workflow-contract.md)
- [Technology decision](./docs/decisions/0001-technology-stack.md)

## Planned stack

- React and TypeScript with Vite.
- TanStack Router, Query, and Form.
- Supabase Auth and PostgreSQL with Row Level Security.
- PostgreSQL functions for authorized, atomic workflow transitions.
- Vitest, React Testing Library, Playwright, and database authorization tests.
- Cloudflare Pages for the frontend, subject to an infrastructure validation spike.
- OpenTofu for supported project-owned infrastructure and Podman for local containers.

## Planned delivery stages

1. Define the product, workflow contract, and architectural boundaries.
2. Establish the application, command, validation, and local database foundations.
3. Implement the database model, authorization policies, transitions, and database tests.
4. Build the complete requester and reviewer flow.
5. Add failure recovery, responsive polish, accessibility checks, and end-to-end tests.
6. Provision infrastructure, deploy the public demo, and capture portfolio evidence.

Commands and local setup instructions will be added in Stage 2, when executable tooling exists.
