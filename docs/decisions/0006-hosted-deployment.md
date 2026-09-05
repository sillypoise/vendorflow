# 0006: Hosted Deployment and Protected Infrastructure State

- Status: Partially provisioned; Turnstile write permission blocks bootstrap completion.
- Owner: `@sillypoise`.
- Date: 2026-09-05.

## Decision and scope

Use Cloudflare Pages direct uploads, Cloudflare Turnstile, and a single Supabase Free project in
`us-east-1`. North American prospective clients are the current location assumption; Pages serves
static assets globally. The operator approved the default `pages.dev` address and requested Free
services where possible. No paid upgrade or unrelated-account mutation is authorized.

The reviewed bootstrap plan contained five additions and no changes/deletions: one Pages project,
one Turnstile widget, one locally generated database password, one Supabase project, and project
settings. Existing Cloudflare resources were not imported or modified.

## Bootstrap result and containment

Pages `vendorflow-demo` and Supabase `sgmmabbsxxgqgtprfbje` were created. Turnstile creation returned
HTTP 403 even though widget listing succeeded. The token needs Account → Turnstile → Edit scoped
to the selected Cloudflare account. Do not retry the denied operation until permissions change.

Because the settings resource depends on Turnstile, it did not run. To contain the partial apply,
the operator-authorized Management API was used once to PATCH the new project's Auth configuration:
`disable_signup = true`; anonymous, email, and phone authentication all false. A subsequent GET
verified all four values. This was an incident-containment step, not an alternative provisioning
mechanism; the same values are represented in the pending OpenTofu settings resource.

The billing add-ons API reported zero selected paid add-ons. The provider returned null for
`instance_size`, so that field alone is not evidence of the billing tier. No frontend or migrations
have been deployed. No public demo signup is enabled. Resume with a fresh reviewed plan after the
Cloudflare permission change; keep the current state rather than recreating the project.

OpenTofu owns these resources in `infra/main.tf`. It reads provider tokens directly from their
supported environment variables. The `secret` zsh function supplies credentials locally. Never run
with provider debug logging or publish `tofu show -json` output: state contains resource secrets.

## State lifecycle

A single operator owns local state and locking. OpenTofu 1.11 encrypts state and saved plans with
AES-GCM using an operator-owned passphrase supplied as `TF_VAR_state_passphrase`. The passphrase is
an ephemeral sensitive variable, has no default, and must contain at least 32 characters. Encryption
is enforced with no plaintext fallback. Commands create artifacts under a restrictive umask.

Keep the passphrase in a password manager, independently of encrypted state. After each successful
apply, back up `infra/terraform.tfstate` to operator-controlled durable storage; do not commit it.
State and plan files were verified to be encrypted and owner-readable only. State reads with
missing and incorrect passphrases failed; the configured passphrase succeeded.
Local locks do not coordinate different machines. Do not run concurrent operations from multiple
copies. Losing both state and its recovery material is an incident, not a reason to blindly recreate
resources. A shared remote backend is deferred while there is one operator and no unattended apply.

The Supabase project has `prevent_destroy`. Teardown requires deliberate removal of that protection,
a separately reviewed destroy plan, and confirmation that hosted fictional data may be deleted.
There is no unattended destruction recipe. Roll back application artifacts independently of schema;
never reverse a migration by deleting state or dropping demo authorization tables.

## Provider provenance

Exact provider versions and archive checksums are committed in `infra/.terraform.lock.hcl`.
Cloudflare 5.24.0 and Random 3.7.2 installations verified publisher signatures. The OpenTofu registry
has no GPG key for Supabase 1.11.0, so its installation verified archive checksums but not a publisher
GPG signature. Its source is the official `supabase/terraform-provider-supabase` release. Review
source/release provenance and lock changes on every upgrade; do not silently accept a different
archive. This is a provenance limitation, not a claim of signature verification.

## Costs and release gates

The target recurring charge is $0 within the providers' Free allowances, not an unlimited-service
promise. Free Supabase can pause for inactivity and has constrained database/egress capacity. Paid
compute is not requested; `instance_size` is intentionally omitted rather than copying the paid
`micro` example from provider documentation. Verify the resulting tier before accepting bootstrap.

The existing [hosted release gates](./0005-isolated-demo.md#public-release-gates) remain binding:
CAPTCHA delivery and rejection, database migrations and cleanup scheduling, bounded storage and
operational alerts, hosted authorization/isolation, HTTPS/CSP, and reproducible portfolio evidence.
Do not enable public signup merely because infrastructure provisioning succeeded.

## Commands

After loading `secret` in the operator shell:

```text
just infrastructure-init
just infrastructure-validate
just infrastructure-plan
# Review the plan before the following explicit apply.
just infrastructure-apply approve-vendorflow-plan
```

Fresh-checkout provider initialization and `infrastructure-validate` need no hosted credentials;
initialization against existing encrypted state requires its passphrase. CI installs pinned OpenTofu
and runs provider initialization and validation, never plan/apply.

The saved plan is encrypted and is the only input accepted by the apply recipe. A fresh plan must
be reviewed after any configuration change. Infrastructure bootstrap is not part of `just check`.
