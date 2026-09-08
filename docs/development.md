# Development and deployment

## Local setup

Use Linux/amd64, Node.js 22.23.2–24.x, pnpm 10.33.2, just 1.43+, rootless Podman 5.7+, and
OpenTofu 1.11.x. CI pins OpenTofu 1.11.5.

```sh
just install
just database-start
just develop
```

The app runs at http://127.0.0.1:5174. Database startup prepares digest-locked images and writes local
publishable configuration to ignored `.env.local`. Local signup omits CAPTCHA; hosted signup does not.

`just database-reset` intentionally deletes local changes and rebuilds from migrations and fixtures.
`just database-stop` removes the disposable local stack. Neither command operates on hosted data.

## Validation

With the local database running:

```sh
just browser-install
just infrastructure-init
just check
```

Infrastructure initialization requires an encryption variable. Operators with existing hosted state
load `secret` first. On a fresh checkout **without hosted state**, initialization can use:

```sh
TF_VAR_state_passphrase=vendorflow-ci-validation-only-not-for-hosted-state just infrastructure-init
```

That public fixture is only for validation, never hosted plans/applies. `just check` runs formatting,
type-aware lint, TypeScript, unit/component tests, database lint/tests, generated-type drift checks,
a production build, Chromium/axe checks, and infrastructure validation. Browser tests reject hosted
backends and run at 320, 768, and 1,440 CSS pixels. Use `just --list` for individual commands.

## Hosted operations

Load `secret` in the approved zsh environment before privileged commands. Never print credentials or
supply them as command arguments. Review and commit migrations before applying them.

```text
just hosted-database-plan
just hosted-database-apply approve-vendorflow-migrations
just hosted-database-check
just hosted-build
# Commit and validate before uploading.
just deploy approve-vendorflow-upload
just hosted-health
```

The HTTPS migration runner preserves repository versions and never uploads local seed identities.
Deployment receives only public browser configuration; it does not toggle signup. Existing visitor
workspaces are not automatically reset by a migration.

Review `just infrastructure-plan` before `just infrastructure-apply approve-vendorflow-plan`.
After each apply, back up encrypted `infra/terraform.tfstate` to operator-controlled durable storage,
independently of its password-manager recovery key. Do not commit state or use the CI fixture on it.

See [hosted operations](decisions/0007-hosted-operations.md) for monitoring, evidence, and limitations,
and [infrastructure ownership](decisions/0006-hosted-deployment.md) for state, rollback, and teardown.
