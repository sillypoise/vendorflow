import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { field, project_reference } from "./hosted_api.ts";

try {
    const configuration: unknown = JSON.parse(readFileSync("deployment/public.json", "utf8"));
    const api_url = field(configuration, "api_url");
    const publishable_key = field(configuration, "publishable_key");
    assert.equal(api_url, `https://${project_reference}.supabase.co`);
    assert.ok(typeof api_url === "string");
    assert.ok(typeof publishable_key === "string" && publishable_key.startsWith("sb_publishable_"));
    const frontend = await fetch("https://vendorflow-demo.pages.dev/requests", {
        method: "HEAD",
        signal: AbortSignal.timeout(15_000),
        redirect: "error",
    });
    assert.equal(frontend.status, 200);
    assert.equal(
        frontend.headers.get("content-security-policy")?.includes("frame-ancestors 'none'"),
        true,
    );
    const response = await fetch(`${api_url}/rest/v1/rpc/demo_health`, {
        method: "GET",
        headers: { apikey: publishable_key },
        signal: AbortSignal.timeout(15_000),
        redirect: "error",
    });
    assert.equal(response.status, 200);
    assert.equal(await response.text(), "true");
    console.info("Hosted demo health is healthy.");
} catch {
    console.error(
        "Hosted demo health is unavailable or unhealthy; operator investigation required.",
    );
    process.exitCode = 1;
}
