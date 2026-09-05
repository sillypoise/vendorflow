import { defineConfig } from "@playwright/test";
import { loadEnv } from "vite";

// E2E checks mutate disposable fixtures and must never target a hosted workspace.
const environment = loadEnv("production", process.cwd(), "VITE_");
if (environment["VITE_SUPABASE_URL"] !== "http://127.0.0.1:54321") {
    throw new Error("Browser tests require the local Supabase API at 127.0.0.1:54321.");
}

export default defineConfig({
    testDir: "./e2e",
    fullyParallel: false,
    workers: 1,
    retries: 0,
    timeout: 60_000,
    expect: { timeout: 10_000 },
    reporter: "list",
    use: {
        baseURL: "http://127.0.0.1:4174",
        browserName: "chromium",
        // Auth tokens and private workspace data must not leak into CI artifacts.
        trace: "off",
        screenshot: "off",
        video: "off",
    },
    projects: [
        { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
        { name: "mobile", use: { viewport: { width: 320, height: 800 } } },
        { name: "tablet", use: { viewport: { width: 768, height: 1024 } } },
    ],
    webServer: {
        command: "pnpm exec vite preview --host 127.0.0.1 --port 4174 --strictPort",
        url: "http://127.0.0.1:4174",
        reuseExistingServer: false,
        timeout: 30_000,
    },
});
