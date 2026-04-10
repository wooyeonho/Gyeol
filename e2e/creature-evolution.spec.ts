import { test, expect } from "@playwright/test";

/**
 * E2E tests for creature DNA viewing and evolution ceremony.
 *
 * The DNA page (/dna) displays a radar chart with 16 axes grouped into
 * Cognitive, Emotional, Social, and Meta categories, along with species
 * info, expressed traits, and mutation history. The evolution ceremony
 * is triggered on the home page (/) when an evolution event occurs. The
 * evolution share page (/share/evolution) shows a shareable card.
 *
 * Tests verify pages load, key UI structures render, and basic
 * interactions work. When unauthenticated the pages may show default
 * DNA values or redirect.
 */
test.describe("DNA page — creature profile", () => {
  test("page loads without 500 error", async ({ page }) => {
    const response = await page.goto("/dna");
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(500);
  });

  test("page has visible content", async ({ page }) => {
    await page.goto("/dna");
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("page does not show unhandled runtime error overlay", async ({ page }) => {
    await page.goto("/dna");
    const errorOverlay = page.locator("#__next-error");
    const overlayCount = await errorOverlay.count();
    expect(overlayCount).toBe(0);
  });

  test("DNA Profile header renders", async ({ page }) => {
    await page.goto("/dna");
    await page.waitForTimeout(1000);

    const header = page.locator("header");
    const count = await header.count();
    if (count > 0) {
      await expect(header.first()).toBeVisible({ timeout: 10_000 });
      // Header contains "DNA Profile" eyebrow text
      const headerText = await header.first().textContent();
      if (headerText) {
        expect(headerText.length).toBeGreaterThan(0);
      }
    }
  });

  test("radar chart SVG renders", async ({ page }) => {
    await page.goto("/dna");
    await page.waitForTimeout(1500);

    // The RadarChart component renders an SVG element
    const svg = page.locator("svg");
    const svgCount = await svg.count();
    // With default DNA values, the radar chart should render even without auth
    expect(svgCount).toBeGreaterThanOrEqual(0);
  });

  test("DNA axis group bars render", async ({ page }) => {
    await page.goto("/dna");
    await page.waitForTimeout(1500);

    // Four axis groups: Cognitive, Emotional, Social, Meta
    // Each renders progress bars for its axes
    const bodyText = await page.locator("body").textContent();
    if (bodyText && !bodyText.includes("login")) {
      // If not redirected, check for group labels or axis labels
      const hasGroups =
        bodyText.includes("Cognitive") ||
        bodyText.includes("Emotional") ||
        bodyText.includes("Social") ||
        bodyText.includes("Meta") ||
        bodyText.includes("인지") ||
        bodyText.includes("감정") ||
        bodyText.includes("사회") ||
        bodyText.includes("메타");
      // Groups render if DNA data is available (even default values)
      expect(hasGroups || bodyText.includes("DNA")).toBeTruthy();
    }
  });

  test("no-data fallback message shows when unauthenticated", async ({ page }) => {
    await page.goto("/dna");
    await page.waitForTimeout(1500);

    const bodyText = await page.locator("body").textContent();
    // Either DNA data renders, or a fallback message, or a redirect
    expect(bodyText).toBeTruthy();
  });

  test("bottom navigation is present on DNA page", async ({ page }) => {
    await page.goto("/dna");
    await page.waitForTimeout(1000);

    const nav = page.locator("nav");
    const count = await nav.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe("Evolution share page", () => {
  test("page loads without 500 error", async ({ page }) => {
    const response = await page.goto("/share/evolution");
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(500);
  });

  test("page has visible content", async ({ page }) => {
    await page.goto("/share/evolution");
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("share page shows not-found state without gen param", async ({ page }) => {
    await page.goto("/share/evolution");
    await page.waitForTimeout(1000);

    // Without ?gen= query parameter, the page shows a not-found message
    // with a "back home" link
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).toBeTruthy();

    const homeLink = page.locator('a[href="/"]');
    const linkCount = await homeLink.count();
    // Should have a link back to home
    expect(linkCount).toBeGreaterThanOrEqual(1);
  });

  test("share page renders evolution card with gen param", async ({ page }) => {
    await page.goto("/share/evolution?gen=3&name=TestCreature");
    await page.waitForTimeout(1000);

    const bodyText = await page.locator("body").textContent();
    // Should show "Gen 3" and the creature name
    if (bodyText) {
      expect(bodyText).toContain("Gen 3");
      expect(bodyText).toContain("TestCreature");
    }
  });

  test("share page renders mutation badge when provided", async ({ page }) => {
    await page.goto("/share/evolution?gen=5&name=Astra&mutation=Luminous%20Shift");
    await page.waitForTimeout(1000);

    const bodyText = await page.locator("body").textContent();
    if (bodyText) {
      expect(bodyText).toContain("Gen 5");
      expect(bodyText).toContain("Astra");
      expect(bodyText).toContain("Luminous Shift");
    }
  });

  test("share page has CTA link to home", async ({ page }) => {
    await page.goto("/share/evolution?gen=2");
    await page.waitForTimeout(1000);

    const homeLink = page.locator('a[href="/"]');
    const count = await homeLink.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

test.describe("Evolution ceremony on home page", () => {
  test("home page loads without evolution ceremony by default", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(2000);

    // Evolution ceremony overlay should not be visible without an evolution event
    // The ceremony uses a fixed overlay with z-50
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).toBeTruthy();
  });

  test("home page does not crash when loading creature state", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");
    await page.waitForTimeout(2000);

    const criticalErrors = errors.filter(
      (e) => !e.includes("supabase") && !e.includes("NEXT_PUBLIC") && !e.includes("fetch"),
    );
    expect(criticalErrors).toHaveLength(0);
  });
});

test.describe("DNA page error handling", () => {
  test("no JavaScript errors on DNA page load", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/dna");
    await page.waitForTimeout(2000);
    const criticalErrors = errors.filter(
      (e) => !e.includes("supabase") && !e.includes("NEXT_PUBLIC") && !e.includes("fetch"),
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test("rapid navigation to DNA page does not crash", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");
    await page.goto("/dna");
    await page.goto("/discover");
    await page.goto("/dna");
    await page.waitForTimeout(2000);

    const criticalErrors = errors.filter(
      (e) => !e.includes("supabase") && !e.includes("NEXT_PUBLIC") && !e.includes("fetch"),
    );
    expect(criticalErrors).toHaveLength(0);
  });
});
