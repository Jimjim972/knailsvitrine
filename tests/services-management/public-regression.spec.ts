import { expect, test } from "@playwright/test";

test("public home, gallery and contact remain reachable", async ({ page }) => {
  test.skip(Boolean(process.env.KN_SERVICE_E2E_SCENARIO), "Real-data suite");
  for (const path of ["/", "/galerie", "/contact"]) { const response = await page.goto(path); expect(response?.ok()).toBe(true); }
});
