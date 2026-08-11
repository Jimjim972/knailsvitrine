import { expect, test, type Page } from "@playwright/test";
import { authFixture, expectAdminHome, submitLogin } from "./fixtures";

const VIEWPORTS = [320, 768, 1024] as const;

async function expectPublicChrome(page: Page) {
  await expect(page.locator(".site-header")).toBeVisible();
  await expect(page.locator(".site-footer")).toBeVisible();
  await expect(page.getByRole("link", { name: /K'nails Beauty Institut/ })).toHaveAttribute(
    "href",
    "/services",
  );
  const footerHeadings = await page.locator(".site-footer h2").allTextContents();
  expect(footerHeadings).toEqual(["Explorer", "Nous contacter", "Horaires"]);
}

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
}

for (const width of VIEWPORTS) {
  test(`public routes retain their reference structure at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });

    await page.goto("/");
    await expect(page).toHaveURL(/\/services$/);
    await expectPublicChrome(page);
    await expect(page.getByRole("heading", { name: "Nos Prestations", level: 1 })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Esthétique & Visage", level: 2 }),
    ).toBeVisible();
    const serviceHeadings = await page.locator("main h2").allTextContents();
    expect(serviceHeadings).toEqual([
      "Onglerie & Manucure",
      "Soins du Corps",
      "Esthétique & Visage",
    ]);
    await expectNoHorizontalOverflow(page);

    await page.goto("/galerie");
    await expectPublicChrome(page);
    await expect(page.getByRole("heading", { name: "L'Art Sublimé", level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Journal Social", level: 2 })).toBeVisible();
    await expect(page.getByRole("link", { name: "Voir le profil" })).toHaveAttribute(
      "href",
      "https://www.instagram.com",
    );
    await expectNoHorizontalOverflow(page);

    await page.goto("/contact");
    await expectPublicChrome(page);
    await expect(
      page.getByRole("heading", { name: "Contact & Rendez-vous", level: 1 }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Envoyez-nous un message" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Informations pratiques" })).toBeVisible();
    await expect(page.getByRole("link", { name: "+33 1 23 45 67 89" }).first()).toHaveAttribute(
      "href",
      "tel:+33123456789",
    );
    await expectNoHorizontalOverflow(page);
  });
}

test("public Header and Footer never wrap the admin routes", async ({ page }) => {
  await page.goto("/admin/connexion");
  await expect(page.locator(".site-header, .site-footer")).toHaveCount(0);

  const admin = authFixture("ADMIN");
  await submitLogin(page, admin.email, admin.password);
  await expectAdminHome(page);
  await expect(page.locator(".site-header, .site-footer")).toHaveCount(0);
});
