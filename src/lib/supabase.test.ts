import { afterEach, expect, it, vi } from "vitest";

const publishable_key = "sb_publishable_fictional_test_configuration";

afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
});

// Browser configuration must reject privileged keys and non-loopback cleartext endpoints.
it.each([
    ["http://host.example", publishable_key, "SUPABASE_CONFIGURATION_INVALID"],
    ["", publishable_key, "SUPABASE_CONFIGURATION_MISSING"],
    [
        "https://host.example",
        "sb_secret_fictional_test_configuration",
        "SUPABASE_CONFIGURATION_INVALID",
    ],
    ["https://host.example", "", "SUPABASE_CONFIGURATION_INVALID"],
])("rejects unsafe browser configuration for %s", async (url, key, code) => {
    vi.stubEnv("VITE_SUPABASE_URL", url);
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", key);
    const { get_supabase_client } = await import("./supabase");
    expect(() => {
        get_supabase_client();
    }).toThrow(code);
    expect(() => {
        get_supabase_client();
    }).not.toThrow("fictional_test_configuration");
});
