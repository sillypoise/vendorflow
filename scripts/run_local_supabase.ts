import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";

const maximum_service_attempts = 50;
const service_attempt_interval_ms = 100;
const supabase_exclusions = [
    "realtime",
    "storage-api",
    "imgproxy",
    "mailpit",
    "postgres-meta",
    "studio",
    "edge-runtime",
    "logflare",
    "vector",
    "supavisor",
].join(",");

function podman_service_is_ready(socket_path: string): boolean {
    assert.ok(socket_path.startsWith("/"));
    assert.ok(socket_path.endsWith(".sock"));

    const result = spawnSync(
        "podman",
        ["--url", `unix://${socket_path}`, "info", "--format=json"],
        { encoding: "utf8", timeout: 1_000 },
    );

    return result.status === 0;
}

function sanitize_failure_output(output: string): string {
    assert.equal(typeof output, "string");
    assert.ok(output.length <= 10_000_000);

    return output
        .replaceAll(/eyJ[A-Za-z0-9._-]+/gu, "[REDACTED_JWT]")
        .replaceAll(/sb_[A-Za-z0-9_-]+/gu, "[REDACTED_SUPABASE_KEY]")
        .replaceAll(/(key|password|secret)(\s*[:=]\s*)\S+/giu, "$1$2[REDACTED]")
        .split("\n")
        .slice(-20)
        .join("\n")
        .slice(-2_000);
}

const action = process.argv[2];

if (process.argv.length !== 3) {
    throw new Error("Expected exactly one action: start or stop.");
}

switch (action) {
    case "start":
    case "stop":
        break;
    case undefined:
        throw new Error("Expected one local Supabase action.");
    default:
        throw new Error(`Unsupported local Supabase action: ${action}`);
}

if (process.platform !== "linux") {
    throw new Error("The local Supabase Podman workflow currently supports Linux only.");
}

const user_id = process.getuid?.();

if (user_id === undefined) {
    throw new Error("The local Supabase Podman workflow requires a POSIX user identifier.");
}

const runtime_directory = process.env.XDG_RUNTIME_DIR ?? `/run/user/${user_id}`;

if (!runtime_directory.startsWith("/")) {
    throw new Error("The runtime directory must be an absolute path.");
}

const socket_directory = `${runtime_directory}/podman`;
const socket_path = `${socket_directory}/podman.sock`;

mkdirSync(socket_directory, { mode: 0o700, recursive: true });

const service_was_ready = podman_service_is_ready(socket_path);
const service_process = service_was_ready
    ? null
    : spawn("podman", ["system", "service", "--time=0", `unix://${socket_path}`], {
          stdio: "ignore",
      });

try {
    let service_is_ready = service_was_ready;

    for (let attempt = 0; attempt < maximum_service_attempts; attempt += 1) {
        if (service_is_ready) {
            break;
        }

        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, service_attempt_interval_ms);
        service_is_ready = podman_service_is_ready(socket_path);
    }

    if (!service_is_ready) {
        throw new Error("Podman API service did not become ready within 5 seconds.");
    }

    const supabase_arguments =
        action === "start"
            ? ["exec", "supabase", "start", "--exclude", supabase_exclusions]
            : ["exec", "supabase", "stop", "--no-backup"];
    const supabase_result = spawnSync("pnpm", supabase_arguments, {
        encoding: "utf8",
        env: { ...process.env, DOCKER_HOST: `unix://${socket_path}` },
        timeout: 300_000,
    });

    if (supabase_result.error !== undefined) {
        throw supabase_result.error;
    }

    if (supabase_result.status !== 0) {
        const safe_output = sanitize_failure_output(
            `${supabase_result.stdout}\n${supabase_result.stderr}`,
        );
        throw new Error(`Supabase ${action} failed.\n${safe_output}`);
    }

    process.stdout.write(`Local Supabase ${action} completed.\n`);
} finally {
    if (service_process !== null) {
        service_process.kill("SIGTERM");
    }
}
