import { expect, test } from "@playwright/test";

test("the four public routes remain available and the nine-image baseline is present", async ({ page }) => {
  for (const route of ["/", "/services", "/contact"]) {
    const response = await page.goto(route); expect(response?.status()).toBe(200); await expect(page.locator("main")).toBeVisible();
  }
  const response = await page.goto("/galerie"); expect(response?.status()).toBe(200);
  await expect(page.locator(".gallery-card")).toHaveCount(5); await expect(page.locator(".social-card")).toHaveCount(4);
  await expect(page.getByAltText("Manucure signature rose et or")).toBeVisible();
});
