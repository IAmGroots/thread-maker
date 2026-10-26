import { expect, test } from "@playwright/test";

test("landing page renders the hero and both calls to action", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page.locator("h1")).toBeVisible();
  await expect(page.getByRole("link", { name: "Open the composer" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "View saved threads" }).first()).toBeVisible();
});

test("login page renders a sign-in control", async ({ page }) => {
  await page.goto("/login", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("button", { name: /google/i })).toBeVisible();
});

test("legal pages are reachable from the footer", async ({ page }) => {
  for (const path of ["/privacy", "/terms", "/data-deletion"]) {
    const response = await page.goto(path, { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1")).toBeVisible();
  }
});

test("private pages redirect anonymous visitors to login", async ({ page }) => {
  for (const path of ["/settings", "/media", "/queue", "/calendar", "/analytics", "/billing"]) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await page.waitForURL("**/login", { waitUntil: "commit" });
    await expect(page.getByRole("button", { name: /google/i })).toBeVisible();
  }
});

test("app navigation exposes every workspace surface", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const nav = page.getByRole("navigation", { name: /navigation|navigasi/i });
  for (const label of ["Calendar", "Queue", "Analytics", "Media"]) {
    await expect(nav.getByRole("link", { name: label })).toBeVisible();
  }
});

test("no horizontal overflow on the landing page at mobile width", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
