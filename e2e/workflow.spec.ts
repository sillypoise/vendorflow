import { expect, test, type Page } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";

async function enter_demo(page: Page) {
    await page.goto("/requests");
    await page.getByRole("button", { name: "Start private demo" }).click();
    await expect(page.getByRole("heading", { name: "Vendor requests", exact: true })).toBeVisible();
}

async function switch_role(page: Page, role: string) {
    await page.getByLabel("Demo role").selectOption(role);
    await expect(page.getByRole("heading", { name: "Vendor requests", exact: true })).toBeVisible();
    await expect(page.getByLabel("Demo role")).toHaveValue(role);
    await page.getByRole("link", { name: /Beacon Metrics/u }).click();
}

async function check_accessibility(page: Page) {
    const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
    expect(result.violations).toEqual([]);
    const controls = page.locator("input, select, textarea, button");
    expect(await controls.count()).toBeLessThanOrEqual(100);
    expect(
        await controls.evaluateAll((elements) =>
            elements.every((element) => {
                const bounds = element.getBoundingClientRect();
                return bounds.width === 0 || (bounds.left >= -1 && bounds.right <= innerWidth + 1);
            }),
        ),
    ).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
    );
}

// Real browser sessions exercise GoTrue, PostgREST, RLS and the UI at both declared viewport bounds.
test("request changes, correct, resubmit, and approve with an immutable timeline", async ({
    page,
}) => {
    await enter_demo(page);
    await check_accessibility(page);
    await page.getByRole("link", { name: /Beacon Metrics/u }).click();
    await page.getByRole("button", { name: "Submit request", exact: true }).click();
    await expect(page.locator(".status-badge")).toHaveText("Submitted");
    await switch_role(page, "administrator");
    await page
        .getByRole("combobox", { name: "Reviewer", exact: true })
        .selectOption({ label: "Demo visitor" });
    await page.getByRole("button", { name: "Assign reviewer", exact: true }).click();
    await expect(page.locator(".status-badge")).toHaveText("In review");
    await switch_role(page, "reviewer");
    await page
        .getByRole("combobox", { name: "Decision", exact: true })
        .selectOption("request_changes");
    await expect(page.getByRole("button", { name: "Record decision" })).toBeDisabled();
    await page
        .getByLabel("Decision reason (required)")
        .fill("Please clarify the data retention period.");
    await check_accessibility(page);
    await page.getByRole("button", { name: "Record decision" }).click();
    await expect(page.locator(".status-badge")).toHaveText("Changes requested");
    await switch_role(page, "requester");
    await page.getByRole("link", { name: "Edit request" }).click();
    await page
        .getByLabel("Business justification")
        .fill("Metrics are retained for thirty days in this fictional workspace.");
    await page.getByRole("button", { name: "Save draft" }).click();
    await page.getByRole("button", { name: "Resubmit request" }).click();
    await switch_role(page, "administrator");
    await page
        .getByRole("combobox", { name: "Reviewer", exact: true })
        .selectOption({ label: "Demo visitor" });
    await page.getByRole("button", { name: "Assign reviewer", exact: true }).click();
    await expect(page.locator(".status-badge")).toHaveText("In review");
    await switch_role(page, "reviewer");
    await page.getByRole("button", { name: "Record decision" }).click();
    await expect(page.locator(".status-badge")).toHaveText("Approved");
    await expect(page.locator(".timeline li")).toHaveCount(7);
    await expect(page.getByRole("link", { name: "Edit request" })).toHaveCount(0);
    await check_accessibility(page);
});

test("two visitors stay isolated through role switches and reset", async ({ page, browser }) => {
    await enter_demo(page);
    await page.getByRole("link", { name: /Beacon Metrics/u }).click();
    const private_url = page.url();
    const other_context = await browser.newContext();
    const other = await other_context.newPage();
    try {
        await enter_demo(other);
        await other.goto(private_url);
        await expect(other.getByRole("heading", { name: "Request unavailable" })).toBeVisible();
        await other.getByLabel("Demo role").selectOption("administrator");
        await expect(
            other.getByRole("heading", { name: "Vendor requests", exact: true }),
        ).toBeVisible();
        await other.goto(private_url);
        await expect(other.getByRole("heading", { name: "Request unavailable" })).toBeVisible();
        other.once("dialog", (dialog) => {
            void dialog.accept();
        });
        await other.getByRole("button", { name: "Reset my demo" }).click();
        await expect(
            other.getByRole("heading", { name: "Vendor requests", exact: true }),
        ).toBeVisible();
        await page.reload();
        await expect(page.getByRole("heading", { name: "Beacon Metrics Inc." })).toBeVisible();
    } finally {
        await other_context.close();
    }
});

test("draft validation, empty state, service failure and retry", async ({ page }) => {
    await enter_demo(page);
    // Empty responses remain a supported recovery state even with a populated starter workspace.
    await page.route("**/rest/v1/vendor_requests?*", (route) =>
        route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
    );
    await page.getByRole("combobox", { name: "Status", exact: true }).selectOption("rejected");
    await expect(page.getByRole("heading", { name: "No requests match this view." })).toBeVisible();
    await page.unroute("**/rest/v1/vendor_requests?*");
    await page.getByRole("link", { name: "New request" }).click();
    await page.getByLabel("Business justification").fill("too short");
    await page.getByLabel("Vendor legal name").click();
    await expect(page.getByText("Use at least 20 characters.")).toBeVisible();
    await page.getByLabel("Business justification").fill("");
    await page.getByLabel("Vendor legal name").fill("Draft recovery test");
    await check_accessibility(page);
    await page.route("**/rest/v1/rpc/create_vendor_request", (route) => route.abort());
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByRole("alert")).toContainText("Your unsaved values have been kept");
    await expect(page.getByLabel("Vendor legal name")).toHaveValue("Draft recovery test");
    await page.unroute("**/rest/v1/rpc/create_vendor_request");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByRole("heading", { name: "Draft recovery test" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Submit request", exact: true })).toBeDisabled();
});

test("stale edit preserves typed values instead of overwriting another tab", async ({
    page,
    context,
}) => {
    await enter_demo(page);
    await page.getByRole("link", { name: /Beacon Metrics/u }).click();
    await page.getByRole("link", { name: "Edit request" }).click();
    const second = await context.newPage();
    await second.goto(page.url());
    await second
        .getByLabel("Business justification")
        .fill("A newer justification saved from the second tab.");
    await second.getByRole("button", { name: "Save draft" }).click();
    await expect(second.getByRole("heading", { name: "Beacon Metrics Inc." })).toBeVisible();
    await page
        .getByLabel("Business justification")
        .fill("My unsaved justification must survive the stale-write error.");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByRole("alert")).toContainText("A newer version exists");
    await expect(page.getByLabel("Business justification")).toHaveValue(/My unsaved/u);
    page.once("dialog", (dialog) => {
        void dialog.accept();
    });
    await page.getByRole("button", { name: "Reload latest revision" }).click();
    await expect(page.getByLabel("Business justification")).toHaveValue(
        "A newer justification saved from the second tab.",
    );
});
