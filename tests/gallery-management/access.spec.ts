import { expect, test } from "@playwright/test";
import { authFixture, expectAdminHome, submitLogin } from "./fixtures";
import { createAuthFixture, deleteAuthFixture, getLocalSupabaseRuntime, revokeSessionsForFixture } from "./local-supabase";

test("visitors are redirected from every gallery administration deep link", async ({ page }) => {
  for (const path of ["/admin/galerie", "/admin/galerie/nouvelle", "/admin/galerie/00000000-0000-4000-8000-000000000001/modifier"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/admin\/connexion\?returnTo=/);
  }
});

test("the dashboard and navigation expose the real gallery list", async ({ page }) => {
  test.skip(Boolean(process.env.KN_GALLERY_E2E_SCENARIO), "Real-data suite");
  const admin = authFixture("ADMIN");
  await page.goto("/admin/connexion");
  await submitLogin(page, admin.email, admin.password);
  await expectAdminHome(page);
  await page.getByRole("link", { name: "Galerie", exact: true }).first().click();
  await expect(page).toHaveURL(/\/admin\/galerie$/);
  await expect(page.getByRole("heading", { name: "Galerie", exact: true })).toBeVisible();
});

test("a revoked administrator cannot reopen the gallery list", async ({ page }) => {
  test.skip(Boolean(process.env.KN_GALLERY_E2E_SCENARIO), "Real-data suite");
  const runtime = getLocalSupabaseRuntime();
  const admin = await createAuthFixture(runtime, "gallery-revoked", true);
  try {
    await page.goto("/admin/connexion");
    await submitLogin(page, admin.email, admin.password);
    await expectAdminHome(page);
    revokeSessionsForFixture(admin.userId);
    await page.goto("/admin/galerie");
    await expect(page).toHaveURL(/\/admin\/connexion\?.*session=expired/);
    await expect(page.locator(".admin-gallery-list")).toHaveCount(0);
  } finally {
    await deleteAuthFixture(runtime, admin);
  }
});
