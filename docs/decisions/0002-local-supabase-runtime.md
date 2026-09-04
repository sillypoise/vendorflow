# 0002: Run Local Supabase Through Podman

- Status: Accepted with a temporary version pin.
- Date: 2026-09-04.
- Decision owner: `@sillypoise`.
- Re-check: On every proposed Supabase CLI upgrade and no later than 2026-12-04.

## Context

The shared infrastructure standard requires Podman for local containers. The Supabase CLI targets a
Docker-compatible API rather than invoking Podman directly, so Stage 2 needed to establish whether
the required local database and authentication services work without introducing Docker.

The local host also rejects container registries by default except for an existing narrow allowlist.
Supabase publishes the required local images through GHCR and public ECR. Public ECR was unreachable
during the spike, while GHCR was reachable but denied by the host container policy.

## Observed evidence

On Linux amd64 with rootless Podman 5.7.0:

1. A temporary `podman system service` socket answered the Docker-compatible API.
2. Supabase CLI 2.116.0 initialized PostgreSQL but failed while streaming a secret archive into a
   container that had not started. Podman returned `passing bulk input to subprocess: broken pipe`.
3. Supabase CLI 2.114.0 used the earlier copy behavior and started the required services
   successfully.
4. PostgreSQL, Kong, GoTrue, and PostgREST reached their expected running states.
5. The local authentication health endpoint responded successfully.
6. Repeated start and stop operations completed without leaving project containers running.

Supabase issue [#6187](https://github.com/supabase/cli/issues/6187) links the upstream change that
introduced in-memory secret streaming. The failure observed here is specific to that newer transfer
path through Podman's compatibility API; it is not evidence that all later CLI versions will fail.

Confidence is high for the tested host and pinned versions. Confidence is low for other operating
systems and architectures because they were not tested.

## Decision

- Use rootless Podman and its local Docker-compatible Unix socket.
- Pin Supabase CLI 2.114.0 until a newer release passes the same start, health, repeated-start, and
  repeated-stop checks.
- Start only PostgreSQL, Kong, GoTrue, and PostgREST. Realtime, Storage, Studio, email capture,
  analytics, edge runtime, and pooling are disabled because the current product flow does not use
  them.
- Support Linux amd64 for the local Supabase workflow during this stage.
- Do not introduce Docker or a Docker daemon.

The CLI pin is temporary compatibility complexity. Remove it when a newer CLI passes the declared
checks through the supported Podman API.

## Container integrity

`supabase/images.lock.json` records the exact Linux amd64 digest for every required image.
`scripts/prepare_supabase_images.ts` pulls those immutable references and verifies each resulting
image digest before applying the tag expected by the CLI.

`supabase/containers-policy.json` rejects all sources except the four named GHCR repositories. Its
`insecureAcceptAnything` rule disables signature requirements only for those repositories; content
identity remains fixed by the immutable digest in the reviewed lock file. A lock update must review
both the Supabase CLI service version and the resulting image digest.

This policy is narrower than weakening the user's global container policy and does not modify host
configuration.

## Operational behavior

- `just database-images` prepares and verifies locked images.
- `just database-start` starts a temporary Podman API service and the minimal Supabase stack.
- `just database-stop` starts a temporary API service and removes the local stack without backup.
- `just database-status` reads container state directly through Podman.

The wrapper suppresses successful Supabase CLI output because that output contains generated local
keys. Failure output is bounded and redacts JWT-shaped values, Supabase key-shaped values, and named
key, password, or secret fields.

## Consequences

- Local database startup downloads several large images on first use.
- A CLI upgrade also requires an intentional image-lock update.
- Developers on non-Linux or non-amd64 systems need a separately tested workflow rather than an
  implicit emulation path.
- The current image lock is a local-development control, not the production deployment contract.
