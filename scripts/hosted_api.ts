import assert from "node:assert/strict";

export const project_reference = "sgmmabbsxxgqgtprfbje";

export function field(value: unknown, name: string): unknown {
    assert.ok(value !== null);
    assert.ok(typeof value === "object");
    const result: unknown = Reflect.get(value, name);
    return result;
}

export async function management_request({
    path,
    body,
}: {
    path: string;
    body: Record<string, unknown> | null;
}): Promise<unknown> {
    assert.ok(
        ["/api-keys", "/config/auth", "/database/migrations", "/database/query"].includes(path),
    );
    const token = process.env["SUPABASE_ACCESS_TOKEN"];
    assert.ok(typeof token === "string" && token.length > 0);
    const response = await fetch(
        `https://api.supabase.com/v1/projects/${project_reference}${path}`,
        {
            method: body === null ? "GET" : "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: body === null ? null : JSON.stringify(body),
            signal: AbortSignal.timeout(60_000),
            redirect: "error",
        },
    );
    if (!response.ok) throw new Error(`HOSTED_MANAGEMENT_HTTP_${response.status}`);
    const text = await response.text();
    assert.ok(text.length <= 2_000_000);
    const result: unknown = JSON.parse(text);
    return result;
}
