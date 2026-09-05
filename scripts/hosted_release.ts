import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { field, management_request, project_reference } from "./hosted_api.ts";
import { hosted_migrations } from "./hosted_migrations.ts";

function command(args: string[], environment: NodeJS.ProcessEnv): string {
    assert.ok(args.length >= 2 && args.length <= 12);
    const executable = args[0];
    assert.ok(executable !== undefined);
    const result = spawnSync(executable, args.slice(1), {
        env: environment,
        encoding: "utf8",
        timeout: 300_000,
        maxBuffer: 2_000_000,
    });
    if (result.status !== 0) throw new Error("HOSTED_COMMAND_FAILED");
    return result.stdout;
}

async function public_configuration(): Promise<NodeJS.ProcessEnv> {
    const keys = await management_request({ path: "/api-keys", body: null });
    assert.ok(Array.isArray(keys) && keys.length <= 20);
    const key: unknown = keys.find(
        (candidate: unknown) => field(candidate, "type") === "publishable",
    );
    const publishable_key = field(key, "api_key");
    const site_key = command(
        ["tofu", "-chdir=infra", "output", "-raw", "turnstile_site_key"],
        process.env,
    ).trim();
    assert.ok(typeof publishable_key === "string" && publishable_key.startsWith("sb_publishable_"));
    assert.ok(site_key.startsWith("0x4"));
    return {
        PATH: process.env["PATH"],
        HOME: process.env["HOME"],
        PNPM_HOME: process.env["PNPM_HOME"],
        VITE_SUPABASE_URL: `https://${project_reference}.supabase.co`,
        VITE_SUPABASE_PUBLISHABLE_KEY: publishable_key,
        VITE_TURNSTILE_SITE_KEY: site_key,
    };
}

async function publish_candidate(configuration: NodeJS.ProcessEnv): Promise<void> {
    const key = configuration["VITE_SUPABASE_PUBLISHABLE_KEY"];
    assert.ok(typeof key === "string");
    const response = await fetch(
        `https://${project_reference}.supabase.co/rest/v1/rpc/demo_health`,
        {
            headers: { apikey: key },
            signal: AbortSignal.timeout(15_000),
            redirect: "error",
        },
    );
    assert.equal(response.status, 200);
    assert.equal(await response.text(), "true");
    assert.equal(
        command(["git", "status", "--porcelain"], process.env).trim(),
        "",
        "Commit and validate the release before uploading it.",
    );
    const token = process.env["CLOUDFLARE_API_TOKEN"];
    assert.ok(typeof token === "string" && token.length > 0);
    const uploaded = command(
        [
            "pnpm",
            "exec",
            "wrangler",
            "pages",
            "deploy",
            "dist",
            "--project-name",
            "vendorflow-demo",
            "--branch",
            "main",
            "--commit-dirty=false",
        ],
        {
            PATH: process.env["PATH"],
            HOME: process.env["HOME"],
            PNPM_HOME: process.env["PNPM_HOME"],
            CLOUDFLARE_API_TOKEN: token,
            CLOUDFLARE_ACCOUNT_ID: "176e1961f8f5e3f986bbe13a009cfcd4",
            WRANGLER_SEND_METRICS: "false",
        },
    );
    console.info({ deployment_urls: uploaded.match(/https:\/\/[a-z0-9.-]+\.pages\.dev/gu) });
}

async function benchmark_cleanup(): Promise<void> {
    const sql = readFileSync("supabase/benchmarks/demo_cleanup.sql", "utf8");
    assert.ok(sql.length < 20_000);
    const result = await management_request({ path: "/database/query", body: { query: sql } });
    assert.ok(Array.isArray(result) && result.length === 1);
    for (const name of [
        "request_rows",
        "audit_rows",
        "reason_bytes",
        "cleanup_ms",
        "cleanup_wal_bytes",
        "deleted_identities",
    ]) {
        const value = field(result[0], name);
        assert.ok(
            typeof value === "number" ||
                (typeof value === "string" && /^[0-9]{1,16}(\.[0-9]{1,4})?$/u.test(value)),
        );
        const measurement = Number(value);
        assert.ok(Number.isFinite(measurement) && measurement >= 0);
        console.info(`${name}: ${measurement}`);
    }
}

async function verify_database(): Promise<void> {
    const query = readFileSync("supabase/verification/hosted_workflow.sql", "utf8");
    assert.ok(query.length < 20_000);
    const result = await management_request({ path: "/database/query", body: { query } });
    assert.ok(Array.isArray(result) && result.length === 1);
    assert.equal(field(result[0], "hosted_workflow"), "passed");
    console.info("Hosted RLS, role decisions, stale revisions, audit, and reset isolation passed.");
}

async function main(): Promise<void> {
    assert.equal(process.argv.length, 3);
    const action = process.argv[2];
    assert.ok(
        [
            "database-plan",
            "database-apply",
            "database-check",
            "build",
            "deploy",
            "status",
            "benchmark",
        ].includes(action ?? ""),
    );
    if (action === "database-check") {
        await verify_database();
    } else if (action === "benchmark") {
        await benchmark_cleanup();
    } else if (action === "status") {
        const auth = await management_request({ path: "/config/auth", body: null });
        assert.equal(field(auth, "security_captcha_enabled"), true);
        assert.equal(field(auth, "external_email_enabled"), false);
        console.info({ signup_disabled: field(auth, "disable_signup"), captcha_enabled: true });
    } else if (action === "build" || action === "deploy") {
        const configuration = await public_configuration();
        command(["pnpm", "build"], configuration);
        mkdirSync("deployment", { recursive: true });
        writeFileSync(
            "deployment/public.json",
            JSON.stringify(
                {
                    api_url: configuration["VITE_SUPABASE_URL"],
                    publishable_key: configuration["VITE_SUPABASE_PUBLISHABLE_KEY"],
                    turnstile_site_key: configuration["VITE_TURNSTILE_SITE_KEY"],
                    frontend_url: "https://vendorflow-demo.pages.dev",
                },
                null,
                4,
            ) + "\n",
            { encoding: "utf8", mode: 0o644 },
        );
        console.info(
            "Hosted bundle and public probe configuration built without privileged credentials.",
        );
        if (action === "deploy") await publish_candidate(configuration);
    } else {
        await hosted_migrations(action === "database-apply");
    }
}

try {
    await main();
} catch (error) {
    const message = error instanceof Error ? error.message : "";
    console.error(/^HOSTED_[A-Z_0-9]+$/u.test(message) ? message : "HOSTED_OPERATION_FAILED");
    process.exitCode = 1;
}
