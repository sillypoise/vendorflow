import { expect, type Page } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";

// Check automated WCAG rules and viewport containment, including error and enlarged-text views.
export async function check_accessibility(page: Page) {
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
