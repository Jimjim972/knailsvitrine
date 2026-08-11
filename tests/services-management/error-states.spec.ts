import { expect, test } from "@playwright/test";
import { authFixture, expectAdminHome, submitLogin } from "./local-supabase";

test("admin empty and unavailable states are distinct and recoverable", async ({ page }) => {
  const scenario = process.env.KN_SERVICE_E2E_SCENARIO;
  test.skip(scenario !== "admin-empty" && scenario !== "admin-unavailable", "Scenario-specific test");
  const admin = authFixture("ADMIN"); await page.goto("/admin/connexion"); await submitLogin(page, admin.email, admin.password); await expectAdminHome(page);
  await page.goto("/admin/prestations");
  if (scenario === "admin-empty") {
    await expect(page.getByRole("heading", { name: "Aucune prestation" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Créer une prestation" })).toBeVisible();
    await expect(page.getByText("Prestations indisponibles")).toHaveCount(0);
  } else {
    await expect(page.getByRole("heading", { name: "Prestations indisponibles" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Réessayer" })).toBeVisible();
    await expect(page.getByText("Aucune prestation")).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText("KN_RAW_PROVIDER_DETAIL");
  }
});

test("public read failure shows no static or empty fallback", async ({ page }) => {
  test.skip(process.env.KN_SERVICE_E2E_SCENARIO !== "public-unavailable", "Scenario-specific test");
  const admin = authFixture("ADMIN"); await page.goto("/admin/connexion"); await submitLogin(page, admin.email, admin.password); await expectAdminHome(page);
  await page.goto("/admin/prestations");
  const visibility = page.locator(".admin-inline-action:visible").first();
  const button = visibility.getByRole("button");
  const masking = (await button.textContent())?.trim() === "Masquer";
  await button.click();
  await expect(visibility.getByText(masking ? "La prestation est masquée." : "La prestation est active.")).toBeVisible();
  await page.goto("/services");
  await expect(page.getByRole("heading", { name: "Prestations indisponibles" })).toBeVisible();
  await expect(page.getByText("Manucure Russe")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("KN_RAW_PROVIDER_DETAIL");
});
