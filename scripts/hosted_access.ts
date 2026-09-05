import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { field, project_reference } from "./hosted_api.ts";

try {
    const configuration: unknown = JSON.parse(readFileSync("deployment/public.json", "utf8"));
    const key = field(configuration, "publishable_key");
    assert.equal(field(configuration, "api_url"), `https://${project_reference}.supabase.co`);
    assert.ok(typeof key === "string" && key.startsWith("sb_publishable_"));
    await Promise.all(
        ["vendor_requests?select=id&limit=1", "rpc/start_demo", "rpc/cleanup_expired_demos"].map(
            async (path) => {
                const mutation = path.startsWith("rpc/");
                const response = await fetch(
                    `https://${project_reference}.supabase.co/rest/v1/${path}`,
                    {
                        method: mutation ? "POST" : "GET",
                        headers: { apikey: key, "Content-Type": "application/json" },
                        body: mutation ? "{}" : null,
                        redirect: "error",
                        signal: AbortSignal.timeout(15_000),
                    },
                );
                assert.equal(response.status, 401);
                console.info(`Unsigned access denied: ${path}`);
            },
        ),
    );
    const signup = await fetch(`https://${project_reference}.supabase.co/auth/v1/signup`, {
        method: "POST",
        headers: { apikey: key, "Content-Type": "application/json" },
        body: "{}",
        redirect: "error",
        signal: AbortSignal.timeout(15_000),
    });
    assert.ok([400, 422].includes(signup.status));
    const body: unknown = await signup.json();
    const code = field(body, "error_code");
    assert.ok(
        ["captcha_failed", "signup_disabled", "anonymous_provider_disabled"].includes(String(code)),
    );
    console.info(`Unverified signup denied: ${String(code)}`);
} catch {
    console.error("Hosted access checks failed; no provider details were printed.");
    process.exitCode = 1;
}
