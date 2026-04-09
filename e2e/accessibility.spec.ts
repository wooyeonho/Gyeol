import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Accessibility tests using axe-core.
 * Tests WCAG 2.2 AA compliance on key pages.
 */

const PAGES_TO_TEST = [
  { path: "/", name: "Home" },
  { path: "/login", name: "Login" },
  { path: "/dna", name: "DNA" },
  { path: "/care", name: "Care" },
  { path: "/settings", name: "Settings" },
  { path: "/discover", name: "Discover" },
];

for (const page of PAGES_TO_TEST) {
  test(`${page.name} page should have no critical accessibility violations`, async ({ page: pw }) => {
    await pw.goto(page.path, { waitUntil: "domcontentloaded" });

    // Wait for initial render
    await pw.waitForTimeout(1000);

    const results = await new AxeBuilder({ page: pw })
      .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
      .exclude("[aria-hidden='true']") // Skip hidden elements
      .analyze();

    // Filter to critical and serious violations only
    const criticalViolations = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );

    if (criticalViolations.length > 0) {
      const summary = criticalViolations.map(
        (v) => `[${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} instances)`
      ).join("\n");
      console.warn(`Accessibility violations on ${page.name}:\n${summary}`);
    }

    // No critical violations allowed
    const critical = results.violations.filter((v) => v.impact === "critical");
    expect(critical).toHaveLength(0);
  });
}

test("chat interface should have proper ARIA roles", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);

  // Check for required ARIA landmarks
  const main = page.locator("[role='main']");
  await expect(main).toBeVisible();

  // Check for skip-to-content link
  const skipLink = page.locator("a[href='#main-content']");
  expect(await skipLink.count()).toBeGreaterThanOrEqual(1);
});

test("forms should have associated labels", async ({ page }) => {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);

  // Run axe specifically for form-related rules
  const results = await new AxeBuilder({ page })
    .withRules(["label", "label-title-only", "form-field-multiple-labels"])
    .analyze();

  const formViolations = results.violations.filter((v) => v.impact === "critical");
  expect(formViolations).toHaveLength(0);
});
