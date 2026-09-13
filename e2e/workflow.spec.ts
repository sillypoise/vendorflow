import { expect, test, type Page } from "@playwright/test";
import { check_accessibility } from "./accessibility";

async function enter_demo(page: Page) {
    await page.goto("/requests");
    await page.getByRole("button", { name: "Start private preview" }).click();
    await expect(page.getByRole("heading", { name: "Vendor requests", exact: true })).toBeVisible();
}

async function switch_role(page: Page, role: string) {
    await page.getByLabel("Preview role").selectOption(role);
    await expect(page.getByRole("heading", { name: "Vendor requests", exact: true })).toBeVisible();
    await expect(page.getByLabel("Preview role")).toHaveValue(role);
    await page.getByRole("link", { name: /Beacon Metrics/u }).click();
}

// All six states retain readable labels; navigation and row activation also work without a mouse.
test("request list preserves status labels and keyboard navigation", async ({ page }) => {
    await enter_demo(page);
    await expect(page.locator(".results-summary")).toHaveText("18 requests on this page");
    await expect(
        page.getByRole("navigation").getByRole("link", { name: "Requests" }),
    ).toBeVisible();
    await page.locator(".request-card").first().hover();
    await check_accessibility(page);
    const statuses = [
        "Draft",
        "Submitted",
        "In review",
        "Changes requested",
        "Approved",
        "Rejected",
    ];
    await expect(page.locator(".status-badge")).toHaveCount(18);
    expect((await page.locator(".status-badge").allTextContents()).toSorted()).toEqual(
        statuses.flatMap((label) => [label, label, label]).toSorted(),
    );
    await page.getByRole("combobox", { name: "Status", exact: true }).selectOption("rejected");
    await expect(page.locator(".status-badge")).toHaveText(["Rejected", "Rejected", "Rejected"]);
    await expect(page.locator(".results-summary")).toHaveText("3 requests on this page");
    await page.getByRole("combobox", { name: "Status", exact: true }).focus();
    await page.keyboard.press("Tab");
    await expect(page.locator(".request-card").first()).toBeFocused();
    await expect(page.locator(".request-card").first()).toHaveCSS("outline-style", "solid");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Request information" })).toBeVisible();
});

// The database's 160-character name bound is tested without word breaks, then at 200% text size.
test("maximum-length names reflow in details and the list with enlarged text", async ({ page }) => {
    await enter_demo(page);
    await page.getByRole("link", { name: "New request" }).click();
    const vendor_name = "W".repeat(160);
    await page.getByLabel("Vendor legal name").fill(vendor_name);
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByRole("heading", { name: vendor_name, exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Submit request", exact: true })).toBeDisabled();
    await check_accessibility(page);
    await page.getByRole("link", { name: "All requests" }).click();
    await expect(page.getByRole("heading", { name: vendor_name, exact: true })).toBeVisible();
    await page.addStyleTag({ content: ":root { font-size: 200%; }" });
    await check_accessibility(page);
    await page.getByRole("link", { name: vendor_name }).click();
    await check_accessibility(page);
});

// The expanded catalog stays on one page; filtering and reset must preserve the complete set.
test("eighteen sample vendors populate the dashboard and survive an explicit reset", async ({
    page,
}) => {
    await enter_demo(page);
    await expect(page.locator(".request-grid > li")).toHaveCount(18);
    await expect(page.getByRole("button", { name: "Next page" })).toBeDisabled();
    await page
        .getByRole("combobox", { name: "Status", exact: true })
        .selectOption("changes_requested");
    await expect(page.locator(".request-grid > li")).toHaveCount(3);
    await page.getByRole("link", { name: /Northline Support Systems/u }).click();
    await expect(page.locator(".timeline")).toContainText("Attach the data retention policy");
    page.once("dialog", (dialog) => {
        void dialog.accept();
    });
    await page.getByRole("button", { name: "Reset workspace" }).click();
    await expect(page.locator(".request-grid > li")).toHaveCount(18);
    await expect(page.getByLabel("Preview role")).toHaveValue("requester");
});

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
        .selectOption({ label: "Preview visitor" });
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
        .selectOption({ label: "Preview visitor" });
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
        await other.getByLabel("Preview role").selectOption("administrator");
        await expect(
            other.getByRole("heading", { name: "Vendor requests", exact: true }),
        ).toBeVisible();
        await other.goto(private_url);
        await expect(other.getByRole("heading", { name: "Request unavailable" })).toBeVisible();
        other.once("dialog", (dialog) => {
            void dialog.accept();
        });
        await other.getByRole("button", { name: "Reset workspace" }).click();
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
    await expect(page.locator(".results-summary")).toHaveText("0 requests on this page");
    await check_accessibility(page);
    await page.unroute("**/rest/v1/vendor_requests?*");
    await page.getByRole("link", { name: "New request" }).click();
    await page.getByLabel("Business justification").fill("too short");
    await page.getByLabel("Vendor legal name").click();
    await expect(page.getByText("Use at least 20 characters.")).toBeVisible();
    await check_accessibility(page);
    await page.getByLabel("Business justification").fill("");
    await page.getByLabel("Vendor legal name").fill("Draft recovery test");
    await check_accessibility(page);
    await page.route("**/rest/v1/rpc/create_vendor_request", (route) => route.abort());
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByRole("alert")).toContainText("Your unsaved values have been kept");
    await check_accessibility(page);
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
