import { expect, test } from "@playwright/test";
import {
  expireCurrentSessionForFixture,
  getLocalSupabaseRuntime,
  revokeSessionsForFixture,
} from "./local-supabase";
import { authFixture, expectAdminHome, submitLogin } from "./fixtures";

async function expectLoginWithoutAdminData(page: import("@playwright/test").Page) {
  await expect(page).toHaveURL(/\/admin\/connexion(?:\?.*)?$/);
  await expect(page.getByRole("button", { name: "Se connecter" })).toBeVisible();
  await expect(page.locator(".admin-shell, .admin-welcome-card")).toHaveCount(0);
}

test("anonymous deep links preserve a safe return path and all admin responses are private", async ({ page }) => {
  const response = await page.goto("/admin?vue=compacte");
  await expectLoginWithoutAdminData(page);
  await expect(page).toHaveURL(/returnTo=%2Fadmin%3Fvue%3Dcompacte/);
  expect(response?.headers()["cache-control"]).toContain("private");
  expect(response?.headers()["cache-control"]).toContain("no-store");
});

test("a current admin survives 20 protected navigation and full-refresh cycles", async ({ page }) => {
  const admin = authFixture("ADMIN");
  await page.goto("/admin/connexion");
  await submitLogin(page, admin.email, admin.password);
  await expectAdminHome(page);

  for (let cycle = 0; cycle < 20; cycle += 1) {
    const navigation = await page.goto("/admin");
    expect(navigation?.headers()["cache-control"]).toContain("private");
    expect(navigation?.headers()["cache-control"]).toContain("no-store");
    await expectAdminHome(page);
    await page.reload();
    await expectAdminHome(page);
  }
});

test("role removal is effective on the first following protected request", async ({ page }) => {
  const admin = authFixture("ROLE_REMOVABLE_ADMIN");
  const runtime = getLocalSupabaseRuntime();
  await page.goto("/admin/connexion");
  await submitLogin(page, admin.email, admin.password);
  await expectAdminHome(page);

  const { error } = await runtime.admin.auth.admin.updateUserById(admin.userId, {
    app_metadata: { role: null },
  });
  if (error) throw new Error("Unable to remove the local fixture role");

  try {
    await page.goto("/admin");
    await expectLoginWithoutAdminData(page);
  } finally {
    const { error: restoreError } = await runtime.admin.auth.admin.updateUserById(admin.userId, {
      app_metadata: { role: "admin" },
    });
    if (restoreError) throw new Error("Unable to restore the local fixture role");
  }
});

test("a deleted session is rejected even while the browser keeps its old JWT", async ({ page }) => {
  const admin = authFixture("REVOCABLE_ADMIN");
  await page.goto("/admin/connexion");
  await submitLogin(page, admin.email, admin.password);
  await expectAdminHome(page);

  revokeSessionsForFixture(admin.userId);
  await page.goto("/admin");
  await expectLoginWithoutAdminData(page);
});

test("an expired current session is rejected on the first protected request", async ({ page }) => {
  const admin = authFixture("EXPIRABLE_ADMIN");
  await page.goto("/admin/connexion");
  await submitLogin(page, admin.email, admin.password);
  await expectAdminHome(page);

  expireCurrentSessionForFixture(admin.userId);
  await page.goto("/admin");
  await expectLoginWithoutAdminData(page);
});

test("the recoverable unavailable state renders no protected data", async ({ page }) => {
  await page.goto("/admin/connexion?indisponible=1");
  await expect(page.locator("form[data-auth-status=unavailable]")).toBeVisible();
  await expect(page.locator(".admin-shell, .admin-welcome-card")).toHaveCount(0);
});
