import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const maximum_service_attempts = 50;
const service_attempt_interval_ms = 100;
const supabase_command_timeout_ms = 300_000;
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
        .slice(-120)
        .join("\n")
        .slice(-20_000);
}

function write_frontend_environment(socket_path: string): void {
    assert.ok(socket_path.startsWith("/"));
    assert.ok(socket_path.endsWith(".sock"));

    const status_result = spawnSync("pnpm", ["exec", "supabase", "status", "--output", "env"], {
        encoding: "utf8",
        env: { ...process.env, DOCKER_HOST: `unix://${socket_path}` },
        timeout: supabase_command_timeout_ms,
    });

    if (status_result.error !== undefined) {
        throw status_result.error;
    }
    if (status_result.status !== 0) {
        const safe_output = sanitize_failure_output(
            `${status_result.stdout}\n${status_result.stderr}`,
        );
        throw new Error(`Supabase status failed.\n${safe_output}`);
    }

    const api_url_match = /^API_URL="([^"]+)"$/mu.exec(status_result.stdout);
    const publishable_key_match = /^PUBLISHABLE_KEY="([^"]+)"$/mu.exec(status_result.stdout);
    assert.ok(api_url_match !== null);
    assert.ok(publishable_key_match !== null);
    const api_url = api_url_match[1];
    const publishable_key = publishable_key_match[1];
    assert.ok(api_url !== undefined);
    assert.ok(publishable_key !== undefined);
    assert.equal(api_url, "http://127.0.0.1:54321");
    assert.ok(publishable_key.startsWith("sb_publishable_"));

    const environment_path = fileURLToPath(new URL("../.env.local", import.meta.url));
    const environment = [
        `VITE_SUPABASE_URL=${api_url}`,
        `VITE_SUPABASE_PUBLISHABLE_KEY=${publishable_key}`,
        "",
    ].join("\n");
    writeFileSync(environment_path, environment, { encoding: "utf8", mode: 0o600 });
}

const action = process.argv[2];

if (process.argv.length !== 3) {
    throw new Error("Expected one action: start, stop, reset, test, lint, or types.");
}

switch (action) {
    case "start":
    case "stop":
    case "reset":
    case "test":
    case "lint":
    case "types":
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

    let expose_success_output = false;
    let supabase_arguments: string[];

    switch (action) {
        case "start":
            supabase_arguments = ["exec", "supabase", "start", "--exclude", supabase_exclusions];
            break;
        case "stop":
            supabase_arguments = ["exec", "supabase", "stop", "--no-backup"];
            break;
        case "reset":
            supabase_arguments = ["exec", "supabase", "db", "reset", "--local"];
            break;
        case "test":
            supabase_arguments = ["exec", "supabase", "test", "db", "--local", "supabase/tests"];
            expose_success_output = true;
            break;
        case "lint":
            supabase_arguments = [
                "exec",
                "supabase",
                "db",
                "lint",
                "--local",
                "--level=warning",
                "--fail-on=warning",
                "--schema=public,private",
            ];
            expose_success_output = true;
            break;
        case "types":
            supabase_arguments = [
                "exec",
                "supabase",
                "gen",
                "types",
                "typescript",
                "--local",
                "--schema=public",
            ];
            break;
    }

    const supabase_result = spawnSync("pnpm", supabase_arguments, {
        encoding: "utf8",
        env: { ...process.env, DOCKER_HOST: `unix://${socket_path}` },
        timeout: supabase_command_timeout_ms,
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

    if (action === "start") {
        write_frontend_environment(socket_path);
    }

    if (action === "types") {
        const types_directory = fileURLToPath(new URL("../src/lib", import.meta.url));
        const types_path = fileURLToPath(new URL("../src/lib/database.types.ts", import.meta.url));

        assert.ok(supabase_result.stdout.length > 0);
        assert.ok(supabase_result.stdout.length <= 5_000_000);
        assert.ok(supabase_result.stdout.includes("export type Database"));
        mkdirSync(types_directory, { mode: 0o755, recursive: true });
        writeFileSync(types_path, supabase_result.stdout, { encoding: "utf8", mode: 0o644 });
    }

    if (expose_success_output) {
        process.stdout.write(supabase_result.stdout);
        process.stderr.write(supabase_result.stderr);
    }

    process.stdout.write(`Local Supabase ${action} completed.\n`);
} finally {
    if (service_process !== null) {
        service_process.kill("SIGTERM");
    }
}
