import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { authFixture, expectAdminHome, submitLogin } from "./fixtures";

const VIEWPORTS = [
  { width: 320, height: 760 },
  { width: 768, height: 900 },
  { width: 1024, height: 900 },
] as const;

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
}

async function expectMinimumTarget(locator: import("@playwright/test").Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
}

test("login validation is labelled, associated, focused, and free of detectable Axe violations", async ({
  page,
  browserName,
}) => {
  await page.goto("/admin/connexion");
  const email = page.getByLabel("Adresse e-mail");
  const password = page.getByLabel("Mot de passe");
  const submit = page.getByRole("button", { name: "Se connecter" });

  await page.keyboard.press("Tab");
  await expect(email).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(password).toBeFocused();
  if (browserName === "webkit") await submit.focus();
  else await page.keyboard.press("Tab");
  await expect(submit).toBeFocused();

  await submit.click();
  await expect(email).toHaveAttribute("aria-invalid", "true");
  await expect(password).toHaveAttribute("aria-invalid", "true");
  await expect(email).toHaveAttribute("aria-describedby", "admin-email-error");
  await expect(password).toHaveAttribute("aria-describedby", "admin-password-error");
  await expect(page.locator("#admin-email-error")).toBeVisible();
  await expect(page.locator("#admin-password-error")).toBeVisible();
  await expect(email).toBeFocused();

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
});

test("login pending appears within one second and repeated activation submits one POST", async ({ page }) => {
  const admin = authFixture("ADMIN");
  await page.goto("/admin/connexion");
  await page.getByLabel("Adresse e-mail").fill(admin.email);
  await page.getByLabel("Mot de passe").fill(admin.password);

  let actionPosts = 0;
  await page.route("**/admin/connexion", async (route) => {
    if (route.request().method() === "POST") {
      actionPosts += 1;
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
    await route.continue();
  });

  const submit = page.locator(".admin-submit");
  const activatedAt = Date.now();
  const submission = submit.click();
  await expect(page.getByRole("status")).toContainText("Connexion en cours…");
  expect(Date.now() - activatedAt).toBeLessThan(1_000);
  await expect(submit).toBeDisabled();
  await page.keyboard.press("Enter");
  await submit.click({ force: true });
  await submission;
  await expectAdminHome(page);
  expect(actionPosts).toBe(1);
});

for (const viewport of VIEWPORTS) {
  test(`admin controls fit and remain touch-sized at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/admin/connexion");
    await expectNoHorizontalOverflow(page);
    await expectMinimumTarget(page.getByLabel("Adresse e-mail"));
    await expectMinimumTarget(page.getByLabel("Mot de passe"));
    await expectMinimumTarget(page.getByRole("button", { name: "Se connecter" }));

    const admin = authFixture("ADMIN");
    await submitLogin(page, admin.email, admin.password);
    await expectAdminHome(page);
    await expectNoHorizontalOverflow(page);
    await expectMinimumTarget(page.getByRole("button", { name: "Se déconnecter" }));
  });
}
