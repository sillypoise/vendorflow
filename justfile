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

# Stop local Supabase without retaining a database backup.
database-stop:
    node scripts/run_local_supabase.ts stop

# Show local Supabase container state without exposing generated keys.
database-status:
    podman ps --all --filter label=com.supabase.cli.project=p2-vendorflow \
        --format "table {{"{{"}}.Names{{"}}"}}\t{{"{{"}}.Status{{"}}"}}"

# Run the required non-deployment checks.
check: format-check lint typecheck test build

# Print the active project tool versions.
runtime:
    @echo "Node.js $(node --version)"
    @echo "pnpm $(pnpm --version)"
    @just --version
    @podman --version
    @echo "Supabase CLI $(pnpm exec supabase --version)"
