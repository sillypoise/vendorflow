# Repo Agent Context

<!-- BEGIN MANAGED GUIDE HEADER -->
This repository uses the pi guide system.

## Guide Activation Contract

Active guides for this repository are defined in:

- `.pi/guides.json` — canonical machine-readable guide selection
- installed pi guide package extension — resolves and injects active guides into the system prompt

The pi guide package can be made available either:

- globally from `~/.pi/agent/settings.json`, or
- repo-locally from `.pi/settings.json`

Repo-local `AGENTS.md` supplements the guide system with repository-specific context.
It does not define the canonical active guide set.

## Authoring Rules for This File

Use this file for:

- repository architecture facts
- build, test, and validation commands
- local workflow expectations
- repository-specific constraints
- durable notes that help future tasks in this repo

Do not use this file for:

- reusable cross-repo guide content
- large generic policy documents
- secrets, tokens, or credentials
- machine-readable guide selection state

If a rule should apply across multiple repositories, promote it into the guide package instead of only documenting it here.
<!-- END MANAGED GUIDE HEADER -->

## Repo-Specific Context

<!-- BEGIN REPO CONTEXT -->
- Purpose: Vendor intake and approval portfolio product demonstrating internal workflows,
  PostgreSQL modeling, and resource-scoped permissions.
- Primary languages: TypeScript, SQL, and OpenTofu configuration in `infra/`.
- Key directories: `src/` contains the React application and colocated tests; `e2e/` contains real
  Chromium workflow/accessibility checks; `scripts/` contains
  typed local tooling; `supabase/migrations/` owns schema changes; `supabase/tests/` contains pgTAP
  authorization and workflow checks; `supabase/seed.sql` contains fictional local data;
  `src/lib/database.types.ts` is generated from the database; `docs/` contains product, contract,
  and decision records.
- Architectural constraints: PostgreSQL is the final authorization boundary. Sensitive workflow
  transitions must atomically enforce authorization, revision checks, state mutation, and audit
  insertion. Keep the six-state workflow explicit; do not introduce a generic workflow engine.
<!-- END REPO CONTEXT -->

## Build / Test / Validation

- Install: `just install`.
- Build: `just build`.
- Test: `just test`; with local Supabase running, `just database-test` and `just browser-test`.
- Lint: `just lint`; with local Supabase running, `just database-lint`.
- Typecheck: `just typecheck`.
- Validation: Run `just database-start`, `just browser-install`, and `just infrastructure-init`,
  then `just check`; review against
  `docs/workflow-contract.md`.
- Run one test: `just test-one path/to/test_file.ts`.

## Local Workflow Notes

- Preferred commands: Use root `just` recipes; use Podman rather than Docker for local containers.
  Run `just database-start` and `just database-stop` for the minimal local Supabase stack. Use
  `just database-reset` only when deleting local changes is intentional.
- Safe-to-edit areas: `src/`, `scripts/`, `supabase/`, and `docs/`, subject to their recorded
  contracts and ownership boundaries.
- Areas requiring extra care: RLS policies, authenticated database functions, audit events, schema
  migrations, generated database types, demo identity isolation, and infrastructure state.
- Review expectations: Check valid, invalid, boundary, stale-revision, permission-denied, and
  cross-organization paths for every workflow contract change.

## Repository-Specific Constraints

- Compatibility expectations: The contract is pre-release. After `v1`, preserve documented field,
  state, transition, and error semantics or provide an explicit migration or controlled cutover.
- Migration / rollout constraints: Apply schema changes through committed migrations. Review
  mixed-version application and database behavior before public deployment.
- Performance constraints: No unsupported performance claims. Establish workloads and measurements
  before setting performance targets.
- Security / privacy constraints: Derive authority from authenticated database context, fail closed,
  and never expose service-role credentials. Public demo users must not affect another visitor's
  data. Use only fictional portfolio data. Shared login has been removed; anonymous visitors receive
  server-issued private workspaces and bounded role/reset capabilities. Hosted abuse protection and
  service-only cleanup scheduling are release gates in `docs/decisions/0005-isolated-demo.md`.
- Infrastructure state: `infra/terraform.tfstate` is encrypted, local, and operator-owned. Load
  `secret` in zsh for provider credentials and `TF_VAR_state_passphrase`; never print their values.
  Preserve state across interrupted applies. Partial bootstrap status and containment are recorded
  in `docs/decisions/0006-hosted-deployment.md`.
