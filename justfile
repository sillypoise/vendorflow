set shell := ["bash", "-euo", "pipefail", "-c"]

# List the supported project commands.
default:
    @just --list

# Install exactly the dependencies recorded in the lockfile.
install:
    pnpm install --frozen-lockfile

# Start the local frontend development server.
develop:
    pnpm develop

# Create the production frontend bundle.
build:
    pnpm build

# Format supported project files.
format:
    pnpm format

# Verify formatting without changing files.
format-check:
    pnpm format:check

# Run type-aware static checks with warnings denied.
lint:
    pnpm lint

# Run the TypeScript compiler without emitting files.
typecheck:
    pnpm typecheck

# Run the unit and component test suite once.
test:
    pnpm test

# Run one unit or component test file.
test-one test_file:
    pnpm vitest run --config vite.config.ts {{ quote(test_file) }}

# Pull and verify the digest-locked local Supabase images.
database-images:
    node scripts/prepare_supabase_images.ts

# Start the minimal local Supabase services through the Podman API.
database-start: database-images
    node scripts/run_local_supabase.ts start

# Reset the running local database through migrations and fictional seed data.
database-reset:
    node scripts/run_local_supabase.ts reset

# Run every non-mutating database validation against the running local database.
database-check: database-lint database-test database-types-check

# Check public database functions for typing and lint warnings.
database-lint:
    node scripts/run_local_supabase.ts lint

# Run transactional pgTAP checks against the running local database.
database-test:
    node scripts/run_local_supabase.ts test

# Regenerate TypeScript definitions from the running local database.
database-types:
    node scripts/run_local_supabase.ts types
    pnpm exec oxfmt --write src/lib/database.types.ts

# Verify that committed TypeScript database definitions match the running schema.
database-types-check: database-types
    git diff --exit-code -- src/lib/database.types.ts

# Stop local Supabase without retaining a database backup.
database-stop:
    node scripts/run_local_supabase.ts stop

# Show local Supabase container state without exposing generated keys.
database-status:
    podman ps --all --filter label=com.supabase.cli.project=p2-vendorflow \
        --format "table {{"{{"}}.Names{{"}}"}}\t{{"{{"}}.Status{{"}}"}}"

# Install the pinned Chromium browser used by the end-to-end suite.
browser-install:
    pnpm exec playwright install chromium

# Test the production application in real, isolated browser sessions.
browser-test: build
    pnpm exec playwright test

# Run the required non-deployment checks against a running local database.
check: format-check lint typecheck test database-check browser-test infrastructure-validate

# Install the pinned infrastructure providers; requires the state passphrase environment variable.
infrastructure-init:
    umask 077; tofu -chdir=infra init -input=false -lockfile=readonly

# Format the infrastructure configuration.
infrastructure-format:
    tofu -chdir=infra fmt -check=false

# Validate infrastructure without accessing hosted resources.
infrastructure-validate:
    tofu -chdir=infra fmt -check
    tofu -chdir=infra validate

# Save an encrypted plan for operator review; never enable provider debug logging.
infrastructure-plan:
    umask 077; tofu -chdir=infra plan -input=false -lock-timeout=30s -out=release.tfplan

# Apply only the previously reviewed encrypted plan.
infrastructure-apply approval:
    test {{ quote(approval) }} = approve-vendorflow-plan
    umask 077; tofu -chdir=infra apply -input=false -lock-timeout=30s release.tfplan

# Review pending hosted migrations without applying them or loading local seed identities.
hosted-database-plan:
    node scripts/hosted_release.ts database-plan

# Apply the reviewed committed migrations to the project-owned hosted database.
hosted-database-apply approval:
    test {{ quote(approval) }} = approve-vendorflow-migrations
    node scripts/hosted_release.ts database-apply

# Verify the hosted workflow using transactional fictional fixtures and real database roles.
hosted-database-check:
    node scripts/hosted_release.ts database-check

# Build with the hosted project's publishable configuration; no credentials enter the bundle.
hosted-build:
    node scripts/hosted_release.ts build

# Verify selected hosted Auth controls without displaying provider secrets.
hosted-status:
    node scripts/hosted_release.ts status

# Upload a committed, validated release candidate; this does not enable hosted signup.
deploy approval:
    test {{ quote(approval) }} = approve-vendorflow-upload
    node scripts/hosted_release.ts deploy

# Intentionally benchmark maximum audit-row cleanup; fixtures roll back but WAL/disk work is real.
hosted-cleanup-benchmark approval:
    test {{ quote(approval) }} = approve-vendorflow-benchmark
    node scripts/hosted_release.ts benchmark

# Verify unsigned API and unverified signup denial using only the publishable key.
hosted-access-check:
    node scripts/hosted_access.ts

# Probe hosted frontend and bounded database health using only the publishable API key.
hosted-health:
    node scripts/hosted_health.ts

# Create one durable operator alert for failed scheduled probes (GitHub Actions only).
hosted-health-alert:
    node scripts/hosted_health_alert.ts

# Print the active project tool versions.
runtime:
    @echo "Node.js $(node --version)"
    @echo "pnpm $(pnpm --version)"
    @just --version
    @podman --version
    @echo "Supabase CLI $(pnpm exec supabase --version)"
