import { expect, test } from "@playwright/test";
import { authFixture, expectAdminHome, submitLogin } from "./fixtures";

test("gallery empty and unavailable states are distinct and recoverable", async ({ page }) => {
  const scenario = process.env.KN_GALLERY_E2E_SCENARIO;
  test.skip(scenario !== "admin-empty" && scenario !== "admin-unavailable", "Scenario-specific test");
  const admin = authFixture("ADMIN");
  await page.goto("/admin/connexion");
  await submitLogin(page, admin.email, admin.password);
  await expectAdminHome(page);
  await page.goto("/admin/galerie");
  if (scenario === "admin-empty") {
    await expect(page.getByRole("heading", { name: "Aucune photo" })).toBeVisible();
    await expect(page.getByText("Galerie indisponible")).toHaveCount(0);
  } else {
    await expect(page.getByRole("heading", { name: "Galerie indisponible" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Réessayer" })).toBeVisible();
    await expect(page.getByText("Aucune photo")).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText("network_scenario");
  }
});
