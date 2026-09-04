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
- Primary languages: TypeScript and SQL; OpenTofu configuration will be added for infrastructure.
- Key directories: `docs/` contains product, contract, and decision records. Application,
  database, test, and infrastructure directories will be recorded when Stage 2 establishes them.
- Architectural constraints: PostgreSQL is the final authorization boundary. Sensitive workflow
  transitions must atomically enforce authorization, revision checks, state mutation, and audit
  insertion. Keep the six-state workflow explicit; do not introduce a generic workflow engine.
<!-- END REPO CONTEXT -->

## Build / Test / Validation

- Install: Not available until Stage 2 establishes locked dependencies and `just install`.
- Build: Not available until Stage 2 establishes `just build`.
- Test: Not available until Stage 2 establishes `just test`.
- Lint: Validate Markdown manually until Stage 2 establishes `just lint`.
- Typecheck: Not available until Stage 2 establishes `just typecheck`.
- Validation: Review product and contract changes against `docs/product-brief.md` and
  `docs/workflow-contract.md`.
- Run one test: To be documented with the Stage 2 test harness.

## Local Workflow Notes

- Preferred commands: Use root `just` recipes once Stage 2 creates the `justfile`; use Podman rather
  than Docker for local containers.
- Safe-to-edit areas: Product documentation during Stage 1. Later stages will define code ownership
  boundaries as they create directories.
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
  data. Use only fictional portfolio data.
