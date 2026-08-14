import { expect, test } from "@playwright/test";
import { authFixture, expectAdminHome, submitLogin } from "./fixtures";

test("an authorized admin signs in, sees the real services and gallery entries, and logs out", async ({ page }) => {
  const admin = authFixture("ADMIN");
  await page.goto("/admin/connexion");
  await submitLogin(page, admin.email, admin.password);
  await expectAdminHome(page);
  await expect(page.getByRole("link", { name: /prestations/i }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /galerie/i }).first()).toHaveAttribute("href", "/admin/galerie");
  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await expect(page).toHaveURL(/\/admin\/connexion$/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/connexion/);
});

test("unknown, wrong-password, and non-admin attempts expose one refusal", async ({ browser }) => {
  const admin = authFixture("ADMIN");
  const nonAdmin = authFixture("NON_ADMIN");
  const attempts = [
    [`unknown-${Date.now()}@example.invalid`, "wrong"],
    [admin.email, "wrong"],
    [nonAdmin.email, nonAdmin.password],
  ] as const;
  const outputs: Array<{ visible: string; announced: string; status: string | null }> = [];

  for (const [email, password] of attempts) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/admin/connexion");
    await submitLogin(page, email, password);
    const alert = page.locator("form[data-auth-status]").getByRole("alert");
    outputs.push({
      visible: await alert.innerText(),
      announced: (await alert.textContent()) ?? "",
      status: await page.locator("form[data-auth-status]").getAttribute("data-auth-status"),
    });
    if (email === nonAdmin.email) {
      await page.goto("/admin");
      await expect(page).toHaveURL(/\/admin\/connexion/);
    }
    await context.close();
  }

  assertAllEqual(outputs.map((value) => JSON.stringify(value)));
});

test("safe return applies only after fresh login and unsafe values fall back", async ({ page }) => {
  const admin = authFixture("ADMIN");
  await page.goto("/admin/connexion?returnTo=%2Fadmin%3Fvue%3Dcompacte");
  await submitLogin(page, admin.email, admin.password);
  await expect(page).toHaveURL(/\/admin\?vue=compacte$/);

  await page.goto("/admin/connexion?returnTo=https%3A%2F%2Fevil.example%2Fadmin");
  await expectAdminHome(page);
});

function assertAllEqual(values: string[]) {
  expect(new Set(values).size).toBe(1);
}
