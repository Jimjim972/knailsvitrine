import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { authFixture, expectAdminHome, submitLogin } from "./local-supabase";

async function tabTo(page: Page, target: Locator, tabKey: "Tab" | "Alt+Tab", limit = 80) {
  const visited = new Set<string>();
  for (let attempt = 0; attempt < limit; attempt += 1) {
    if (await target.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press(tabKey);
    visited.add(await page.evaluate(() => {
      const active = document.activeElement;
      return active ? `${active.tagName.toLowerCase()}#${active.id}` : "none";
    }));
  }
  const targetName = await target.getAttribute("id") ?? await target.textContent() ?? "unknown";
  const activeName = await page.evaluate(() => {
    const active = document.activeElement;
    return active ? `${active.tagName.toLowerCase()}#${active.id}` : "none";
  });
  throw new Error(`Keyboard focus did not reach ${targetName}; active element: ${activeName}; visited: ${[...visited].join(", ")}`);
}

async function expectKeyboardFocus(target: Locator) {
  await expect(target).toBeFocused();
  expect(await target.evaluate((element) => {
    const style = getComputedStyle(element);
    return element.matches(":focus-visible") && Number.parseFloat(style.outlineWidth) >= 3;
  })).toBe(true);
}

async function expectTouchTargets(page: Page, selector: string) {
  const boxes = await page.locator(selector).evaluateAll((elements) => elements
    .filter((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
    })
    .map((element) => {
      const rect = element.getBoundingClientRect();
      return { label: element.getAttribute("aria-label") ?? element.textContent?.trim() ?? element.tagName, width: rect.width, height: rect.height };
    }));
  expect(boxes.length).toBeGreaterThan(0);
  for (const box of boxes) {
    expect.soft(box.width, `${box.label} width`).toBeGreaterThanOrEqual(44);
    expect.soft(box.height, `${box.label} height`).toBeGreaterThanOrEqual(44);
  }
}

async function expectNoSeriousAxeViolation(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);
}

for (const [width, fixtureName] of [[320, "EXPIRABLE_ADMIN"], [768, "ROLE_REMOVABLE_ADMIN"], [1024, "LOGOUT_ERROR_ADMIN"]] as const) {
  test(`services admin is keyboard and touch accessible at ${width}px`, async ({ page, browserName }) => {
    test.skip(Boolean(process.env.KN_SERVICE_E2E_SCENARIO), "Real-data suite");
    await page.setViewportSize({ width, height: 900 });
    const admin = authFixture(fixtureName);
    await page.goto("/admin/connexion");
    await submitLogin(page, admin.email, admin.password);
    await expectAdminHome(page);
    await page.goto("/admin/prestations");
    const navigationTabKey = browserName === "webkit" ? "Alt+Tab" : "Tab";
    const formTabKey = "Tab";

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await expect(page.getByRole("status").filter({ hasText: /prestations?/ })).toBeVisible();
    await expectTouchTargets(page, ".admin-nav a, .admin-page-header .admin-button, .admin-text-action, .admin-logout-button");
    await expectNoSeriousAxeViolation(page);

    const createLink = page.getByRole("link", { name: "Nouvelle prestation" });
    await tabTo(page, createLink, navigationTabKey);
    await expectKeyboardFocus(createLink);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/admin\/prestations\/nouvelle$/);
    await expect(page.getByLabel("Nom")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await expectTouchTargets(page, ".admin-field-control input, .admin-field-control select, .admin-field-control textarea, .admin-checkbox, .admin-form-actions .admin-button");
    await expectNoSeriousAxeViolation(page);

    for (const control of [
      page.getByLabel("Nom"),
      page.getByLabel("Description"),
      page.getByLabel("Catégorie"),
      page.getByLabel("Type de tarif"),
      page.getByLabel("Montant (€)"),
      page.getByLabel("Durée (minutes), facultative"),
      page.getByLabel("Badge, facultatif"),
      page.getByLabel("Ordre d’affichage"),
      page.getByLabel("Prestation active et visible publiquement"),
    ]) {
      const controlTabKey = browserName === "webkit" && await control.getAttribute("type") === "checkbox"
        ? navigationTabKey
        : formTabKey;
      await tabTo(page, control, controlTabKey);
      await expectKeyboardFocus(control);
    }
    const cancelCreate = page.getByRole("link", { name: "Annuler" });
    await tabTo(page, cancelCreate, navigationTabKey);
    await expectKeyboardFocus(cancelCreate);
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Prestations", exact: true })).toBeVisible();

    const firstItem = page.locator(".admin-service-item").first();
    const edit = firstItem.getByRole("link", { name: "Modifier" });
    await tabTo(page, edit, navigationTabKey);
    await expectKeyboardFocus(edit);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/modifier$/);
    await expect(page.getByLabel("Nom")).toBeVisible();
    await tabTo(page, page.getByLabel("Nom"), formTabKey);
    await expectKeyboardFocus(page.getByLabel("Nom"));
    const cancelEdit = page.getByRole("link", { name: "Annuler" });
    await tabTo(page, cancelEdit, navigationTabKey);
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Prestations", exact: true })).toBeVisible();

    const activeItem = page.locator(".admin-service-item", {
      has: page.getByRole("button", { name: "Masquer" }),
    }).first();
    const activeServiceName = (await activeItem.getByRole("heading", { level: 2 }).textContent())?.trim();
    expect(activeServiceName).toBeTruthy();
    const currentFirstItem = page.locator(".admin-service-item", {
      has: page.getByRole("heading", { name: activeServiceName ?? "", exact: true }),
    });
    const visibility = currentFirstItem.getByRole("button", { name: /Masquer|Réactiver/ });
    await tabTo(page, visibility, navigationTabKey);
    await expectKeyboardFocus(visibility);
    await page.keyboard.press("Enter");
    await expect(currentFirstItem.getByRole("status").filter({ hasText: "La prestation est masquée." })).toBeVisible();
    await expect(currentFirstItem.locator(".admin-state")).toHaveText("Masquée");
    const reactivate = currentFirstItem.getByRole("button", { name: "Réactiver" });
    await expect(reactivate).toBeFocused();
    await expectKeyboardFocus(reactivate);
    await page.keyboard.press("Enter");
    await expect(currentFirstItem.getByRole("status").filter({ hasText: "La prestation est active." })).toBeVisible();
    await expect(currentFirstItem.locator(".admin-state")).toHaveText("Active");
    await expect(currentFirstItem.getByRole("button", { name: "Masquer" })).toBeFocused();
    const deleteTrigger = currentFirstItem.getByRole("button", { name: "Supprimer" });
    await tabTo(page, deleteTrigger, navigationTabKey);
    await expectKeyboardFocus(deleteTrigger);
    await page.keyboard.press("Enter");

    const dialog = page.getByRole("dialog", { name: "Supprimer la prestation ?" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Annuler" })).toBeFocused();
    await expectTouchTargets(page, ".admin-delete-dialog .admin-button");
    await expectNoSeriousAxeViolation(page);
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(deleteTrigger).toBeFocused();

    await page.goto("/admin/prestations/categories");
    await expect(page.getByRole("heading", { name: "Catégories", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await expectTouchTargets(page, ".admin-page-header .admin-button, .admin-category-item .admin-text-action");
    await expectNoSeriousAxeViolation(page);

    const firstCategory = page.locator(".admin-category-item").first();
    const editCategory = firstCategory.getByRole("link", { name: "Modifier" });
    await tabTo(page, editCategory, navigationTabKey);
    await expectKeyboardFocus(editCategory);
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Modifier la catégorie" })).toBeVisible();
    await expect(page.getByLabel("Nom")).toBeVisible();
    const cancelCategoryEdit = page.getByRole("link", { name: "Annuler" });
    await tabTo(page, cancelCategoryEdit, navigationTabKey);
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Catégories", exact: true })).toBeVisible();

    const deleteCategoryTrigger = page.locator(".admin-category-item").first().getByRole("button", { name: "Supprimer" });
    await tabTo(page, deleteCategoryTrigger, navigationTabKey);
    await expectKeyboardFocus(deleteCategoryTrigger);
    await page.keyboard.press("Enter");
    const categoryDialog = page.getByRole("dialog", { name: "Supprimer la catégorie ?" });
    await expect(categoryDialog).toBeVisible();
    await expect(categoryDialog.getByRole("button", { name: "Annuler" })).toBeFocused();
    await expectNoSeriousAxeViolation(page);
    await page.keyboard.press("Escape");
    await expect(categoryDialog).not.toBeVisible();
    await expect(deleteCategoryTrigger).toBeFocused();
  });
}
