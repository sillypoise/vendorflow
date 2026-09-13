import { expect, test } from "@playwright/test";
import { check_accessibility } from "./accessibility";

function measure_loading() {
    const navigation = performance.getEntriesByType("navigation")[0];
    if (!(navigation instanceof PerformanceNavigationTiming)) throw new Error("Missing timing.");
    const resources = performance.getEntriesByType("resource");
    return {
        viewport_px: innerWidth,
        dom_content_loaded_ms: Math.round(navigation.domContentLoadedEventEnd),
        transferred_bytes:
            navigation.transferSize +
            resources.reduce(
                (sum, entry) =>
                    sum + (entry instanceof PerformanceResourceTiming ? entry.transferSize : 0),
                0,
            ),
    };
}

// Network failures are injected at the HTTP boundary; successful retries use the real database.
test("failed session creation and failed list reads recover without leaking errors", async ({
    page,
}) => {
    await page.goto("/requests");
    await page.route("**/auth/v1/signup", (route) => route.abort());
    await page.getByRole("button", { name: "Start private preview" }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByRole("button", { name: "Start private preview" })).toBeEnabled();
    await page.unroute("**/auth/v1/signup");
    await page.getByRole("button", { name: "Start private preview" }).click();
    await expect(page.getByRole("heading", { name: "Vendor requests", exact: true })).toBeVisible();
    await page.route("**/rest/v1/vendor_requests?*", () => {
        // Hold this read until navigation cancels it so the pending-state check is deterministic.
    });
    await page.getByRole("combobox", { name: "Status", exact: true }).selectOption("submitted");
    await expect(page.getByText("Loading requests…", { exact: true })).toBeVisible();
    await check_accessibility(page);
    await page.unroute("**/rest/v1/vendor_requests?*");
    await page.route("**/rest/v1/vendor_requests?*", (route) =>
        route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({ code: "", message: "password=private-internal-error" }),
        }),
    );
    await page.reload();
    await expect(page.getByRole("alert")).toContainText("temporarily unavailable");
    await expect(page.getByRole("alert")).not.toContainText("password");
    await check_accessibility(page);
    await page.unroute("**/rest/v1/vendor_requests?*");
    await page.getByRole("button", { name: "Retry", exact: true }).click();
    await page.getByRole("combobox", { name: "Status", exact: true }).selectOption("submitted");
    await expect(page.getByRole("link", { name: /Harbor Freight Partners/u })).toBeVisible();
});

test("unsaved navigation, denied edit route, and session cache separation", async ({ page }) => {
    await page.goto("/requests");
    await page.getByRole("button", { name: "Start private preview" }).click();
    await page.getByRole("link", { name: /Beacon Metrics/u }).click();
    const old_url = page.url();
    await page.getByRole("link", { name: "Edit request" }).click();
    await page.getByLabel("Vendor legal name").fill("Unsaved private name");
    page.once("dialog", (dialog) => {
        void dialog.dismiss();
    });
    await page.getByRole("link", { name: "Cancel", exact: true }).click();
    await expect(page.getByLabel("Vendor legal name")).toHaveValue("Unsaved private name");
    page.once("dialog", (dialog) => {
        void dialog.accept();
    });
    await page.getByRole("link", { name: "Cancel", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Beacon Metrics Inc." })).toBeVisible();
    await page.getByLabel("Preview role").selectOption("reviewer");
    await expect(page.getByRole("heading", { name: "Vendor requests", exact: true })).toBeVisible();
    await page.goto(`${old_url}/edit`);
    await expect(page.getByRole("heading", { name: "Requester access required" })).toBeVisible();
    await check_accessibility(page);
    await page.getByRole("button", { name: "End session" }).click();
    await expect(page).toHaveURL("/");
    await page.goto(old_url);
    await page.getByRole("button", { name: "Start private preview" }).click();
    await expect(page.getByRole("heading", { name: "Request unavailable" })).toBeVisible();
    await expect(page.getByText("Unsaved private name")).toHaveCount(0);
});

// One SVG serves the brand and favicon; a failed image must not hide the name or block entry.
test("brand artwork loads and image failure preserves navigation", async ({ page }) => {
    await page.goto("/");
    const mark = page.locator("img.brand-mark");
    await expect(mark).toHaveAttribute("alt", "");
    await expect
        .poll(() => mark.evaluate((image: HTMLImageElement) => image.naturalWidth))
        .toBeGreaterThan(0);
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", "/vendorflow-mark.svg");
    await page.route("**/vendorflow-mark.svg", (route) => route.abort());
    await page.reload();
    await expect(page.getByRole("link", { name: "VendorFlow home" })).toBeVisible();
    await expect.poll(() => mark.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(0);
    await page.getByRole("link", { name: "Open workflow preview" }).click();
    await expect(page.getByRole("heading", { name: "Your own workflow." })).toBeVisible();
    await expect(page.locator(".brand")).toHaveText("VendorFlow");
});

test("landing and entry page support keyboard navigation and accessible names", async ({
    page,
}) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Skip to main content" })).toBeAttached();
    console.info("Cold local landing measurement", await page.evaluate(measure_loading));
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("main")).toBeFocused();
    await check_accessibility(page);
    // Enlarged text must reflow the illustration without pushing the entry action off-screen.
    const enlarged_text = await page.addStyleTag({ content: ":root { font-size: 200%; }" });
    await check_accessibility(page);
    await enlarged_text.evaluate((element) => {
        element.textContent = "";
    });
    await page.getByRole("link", { name: "Open workflow preview" }).click();
    await check_accessibility(page);
});
