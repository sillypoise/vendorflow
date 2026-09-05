import { afterEach, expect, it, vi } from "vitest";
import { captcha_site_key } from "./turnstile";

afterEach(() => {
    vi.unstubAllEnvs();
});

it("permits only the exact local stack to omit CAPTCHA", () => {
    vi.stubEnv("VITE_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "");
    expect(captcha_site_key()).toBeNull();
    vi.stubEnv("VITE_SUPABASE_URL", "https://host.example");
    expect(captcha_site_key).toThrow("CAPTCHA_CONFIGURATION_INVALID");
});

it.each(["", "1x00000000000000000000AA", "invalid key", "0x4" + "a".repeat(98)])(
    "rejects missing, test, malformed, or oversized hosted keys %#",
    (key) => {
        vi.stubEnv("VITE_SUPABASE_URL", "https://host.example");
        vi.stubEnv("VITE_TURNSTILE_SITE_KEY", key);
        expect(captcha_site_key).toThrow("CAPTCHA_CONFIGURATION_INVALID");
    },
);

it("accepts a bounded production site key", () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://host.example");
    vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "0x4fictional-site-key");
    expect(captcha_site_key()).toBe("0x4fictional-site-key");
});
