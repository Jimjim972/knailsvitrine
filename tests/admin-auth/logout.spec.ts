import { expect, test } from "@playwright/test";
import { stopLocalAuthService } from "./local-supabase";
import { authFixture, expectAdminHome, submitLogin } from "./fixtures";

test("logout announces pending, replaces navigation, and refuses the next shared-tab request", async ({
  page,
  context,
}) => {
  const admin = authFixture("ADMIN");
  await page.goto("/admin/connexion");
  await submitLogin(page, admin.email, admin.password);
  await expectAdminHome(page);

  const secondTab = await context.newPage();
  await secondTab.goto("/admin");
  await expectAdminHome(secondTab);

  let logoutPosts = 0;
  await page.route("**/admin", async (route) => {
    if (route.request().method() === "POST") {
      logoutPosts += 1;
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
    await route.continue();
  });

  const logoutButton = page.locator(".admin-logout-button");
  await expect(logoutButton).toHaveAccessibleName("Se déconnecter");
  const submission = logoutButton.click();
  await expect(page.getByRole("status")).toContainText("Déconnexion en cours");
  await expect(logoutButton).toBeDisabled();
  await submission;

  await expect(page).toHaveURL(/\/admin\/connexion$/);
  expect(logoutPosts).toBe(1);
  await expect(page.locator(".admin-shell, .admin-welcome-card, .admin-logout-button")).toHaveCount(0);

  await secondTab.reload();
  await expect(secondTab).toHaveURL(/\/admin\/connexion/);
  await expect(secondTab.locator(".admin-shell, .admin-welcome-card")).toHaveCount(0);

  await page.goBack();
  await expect(page.locator(".admin-shell, .admin-welcome-card, .admin-logout-button")).toHaveCount(0);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/connexion/);
});

test("local logout leaves a separately authenticated browser session valid", async ({ browser }) => {
  const admin = authFixture("ADMIN");
  const firstContext = await browser.newContext();
  const secondContext = await browser.newContext();
  const firstPage = await firstContext.newPage();
  const secondPage = await secondContext.newPage();

  try {
    for (const currentPage of [firstPage, secondPage]) {
      await currentPage.goto("/admin/connexion");
      await submitLogin(currentPage, admin.email, admin.password);
      await expectAdminHome(currentPage);
    }

    await firstPage.getByRole("button", { name: "Se déconnecter" }).click();
    await expect(firstPage).toHaveURL(/\/admin\/connexion$/);
    await secondPage.reload();
    await expectAdminHome(secondPage);
  } finally {
    await firstContext.close();
    await secondContext.close();
  }
});

test("a remote logout failure stays visible and retryable without false success", async ({ page }) => {
  test.setTimeout(60_000);
  const admin = authFixture("LOGOUT_ERROR_ADMIN");
  await page.goto("/admin/connexion");
  await submitLogin(page, admin.email, admin.password);
  await expectAdminHome(page);

  const restoreAuth = stopLocalAuthService();
  let authRestored = false;
  try {
    await page.getByRole("button", { name: "Se déconnecter" }).click();
    await expect(
      page.locator("form[data-auth-status=unavailable]").getByRole("alert"),
    ).toBeVisible({ timeout: 30_000 });
    expect(new URL(page.url()).pathname).toBe("/admin");
    await expect(page.getByRole("button", { name: "Réessayer la déconnexion" })).toBeEnabled();
    await expect(page.getByText(/déconnecté|déconnexion réussie/i)).toHaveCount(0);
    await expect(page.locator(".admin-shell, .admin-welcome-card")).toHaveCount(0);

    restoreAuth();
    authRestored = true;
    await page.getByRole("button", { name: "Réessayer la déconnexion" }).click();
    await expect(page).toHaveURL(/\/admin\/connexion$/);
    await expect(page.getByRole("button", { name: "Se connecter" })).toBeVisible();
  } finally {
    if (!authRestored) restoreAuth();
  }
});
