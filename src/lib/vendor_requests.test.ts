import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { expect, it } from "vitest";
import type { Database } from "./database.types";
import {
    WorkflowError,
    workflow_error_message,
    throw_database_error,
    list_vendor_requests,
    get_vendor_request,
} from "./vendor_requests";

// Exercise the public error mapper without displaying arbitrary database or transport content.
it.each([
    ["P0001", "DEMO_EXPIRED", "DEMO_EXPIRED"],
    ["P0001", "password=private", "INTERNAL_ERROR"],
    ["42501", "private", "PERMISSION_DENIED"],
    ["PGRST303", "private", "AUTHENTICATION_REQUIRED"],
    ["", "private", "DEPENDENCY_UNAVAILABLE"],
] as const)("maps failure %s/%s to %s", (code, message, expected) => {
    expect(() => {
        throw_database_error({ code, message });
    }).toThrow(expected);
    expect(workflow_error_message(new WorkflowError(expected))).not.toContain("private");
});

it("accepts a successful boundary result and gives actionable recovery messages", () => {
    expect(() => {
        throw_database_error(null);
    }).not.toThrow();
    expect(workflow_error_message(new WorkflowError("STALE_REVISION"))).toMatch(/Refresh/u);
    expect(workflow_error_message(new WorkflowError("DEMO_LIMIT_REACHED"))).toContain(
        "End this session",
    );
});

it("does not expose unexpected error details", () => {
    const message = workflow_error_message(new Error("password=unsafe database stack trace"));
    expect(message).toBe("VendorFlow could not complete the request. Try again.");
    expect(message).not.toContain("password");
    expect(message).not.toContain("database");
});

it.each([-1, 5, 0.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid page %s before any network access",
    async (page) => {
        const client = createClient<Database>("http://127.0.0.1:54321", "test-publishable", {
            auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
            global: {
                fetch: () => {
                    throw new Error("Unexpected network access.");
                },
            },
        });
        await expect(list_vendor_requests(client, "all", page)).rejects.toThrow(
            "VALIDATION_FAILED",
        );
        await expect(get_vendor_request(client, "not-a-uuid")).rejects.toThrow("REQUEST_NOT_FOUND");
    },
);

it.each([0, 4])("requests one bounded page at boundary %s", async (page) => {
    const client = createClient<Database>("http://127.0.0.1:54321", "test-publishable", {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        global: {
            fetch: (input) => {
                assert.ok(typeof input === "string");
                const url = new URL(input);
                expect(url.searchParams.get("offset")).toBe(String(page * 20));
                expect(url.searchParams.get("limit")).toBe("20");
                return Promise.resolve(
                    new Response("[]", {
                        status: 200,
                        headers: { "Content-Type": "application/json" },
                    }),
                );
            },
        },
    });
    await expect(list_vendor_requests(client, "all", page)).resolves.toEqual([]);
});
