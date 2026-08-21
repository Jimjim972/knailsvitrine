import { expect, test, type Page } from "@playwright/test";
import { authFixture, expectAdminHome, submitLogin } from "../admin-auth/fixtures";
import {
  galleryFixture,
  insertGalleryFixtures,
  removeGalleryFixtures,
} from "../gallery-management/fixtures";
import { createGalleryClient, getLocalSupabaseRuntime } from "../gallery-management/local-supabase";
import {
  expectAccessibilityScans,
  expectMinimumTargets,
  expectNoHorizontalOverflow,
  expectVisibleFocus,
  tabTo,
} from "../helpers/accessibility";

async function expectPageContract(page: Page) {
  await expectNoHorizontalOverflow(page);
  await expectMinimumTargets(page);
}

test("Auth couvre neutre, validation, attente et refus avec annonces associées", async ({
  page,
  browserName,
}, testInfo) => {
  await page.goto("/admin/connexion");
  await expectPageContract(page);
  await expectAccessibilityScans(page, testInfo, "admin-auth-neutral");

  const submit = page.getByRole("button", { name: "Se connecter" });
  await tabTo(page, submit, { key: browserName === "webkit" ? "Alt+Tab" : "Tab" });
  await expectVisibleFocus(submit);
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Adresse e-mail")).toBeFocused();
  await expect(page.getByLabel("Adresse e-mail")).toHaveAttribute("aria-describedby", "admin-email-error");
  await expect(page.locator("#admin-email-error")).toContainText(/adresse e-mail/i);
  await expect(page.locator("#admin-password-error")).toContainText(/mot de passe/i);
  await expectAccessibilityScans(page, testInfo, "admin-auth-invalid");

  await page.goto("/admin/connexion");
  await page.getByLabel("Adresse e-mail").fill("personne-inconnue@example.invalid");
  await page.getByLabel("Mot de passe").fill("mot-de-passe-incorrect");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.locator(".admin-auth-form").getByRole("alert")).toContainText(/connexion|identifiants|autorisé/i);
  await expectAccessibilityScans(page, testInfo, "admin-auth-refused");

  const admin = authFixture("ADMIN");
  await page.goto("/admin/connexion");
  await page.getByLabel("Adresse e-mail").fill(admin.email);
  await page.getByLabel("Mot de passe").fill(admin.password);
  let postCount = 0;
  await page.route("**/admin/connexion", async (route) => {
    if (route.request().method() === "POST") {
      postCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    await route.continue();
  });
  const login = page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByRole("status")).toContainText("Connexion en cours…", { timeout: 1_000 });
  await expect(page.getByRole("button", { name: "Connexion en cours…" })).toBeDisabled();
  await expectAccessibilityScans(page, testInfo, "admin-auth-pending");
  await login;
  await expectAdminHome(page);
  expect(postCount).toBe(1);
});

test("Prestations, catégories et galerie exposent formulaires, listes et dialogues accessibles", async ({
  page,
}, testInfo) => {
  const admin = authFixture("ADMIN");
  await page.goto("/admin/connexion");
  await submitLogin(page, admin.email, admin.password);
  await expectAdminHome(page);

  await page.goto("/admin/prestations");
  await expectPageContract(page);
  if (process.env.KN_SERVICE_E2E_SCENARIO === "admin-empty") {
    await expect(page.getByRole("heading", { name: "Aucune prestation" })).toBeVisible();
  } else if (process.env.KN_SERVICE_E2E_SCENARIO === "admin-unavailable") {
    await expect(page.getByRole("heading", { name: "Prestations indisponibles" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Réessayer" })).toBeVisible();
  } else {
    await expect(page.locator(".admin-service-item").first()).toBeVisible();
  }
  await expectAccessibilityScans(page, testInfo, "admin-services-list");

  const createService = page.getByRole("link", { name: "Nouvelle prestation" });
  if (await createService.count()) {
    await createService.click();
    await expect(page.getByLabel("Nom")).toBeFocused();
    await expectPageContract(page);
    await expectAccessibilityScans(page, testInfo, "admin-services-create-form");
    await expect(page.getByRole("link", { name: "Annuler" })).toHaveAttribute("href", "/admin/prestations");
    await page.goto("/admin/prestations");
  }

  const serviceDelete = page.locator(".admin-service-item").first().getByRole("button", { name: "Supprimer" });
  if (await serviceDelete.count()) {
    await serviceDelete.click();
    const dialog = page.getByRole("dialog", { name: "Supprimer la prestation ?" });
    await expect(dialog).toBeVisible();
    const cancel = dialog.getByRole("button", { name: "Annuler" });
    await expect(cancel).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(dialog.getByRole("button", { name: "Supprimer définitivement" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(cancel).toBeFocused();
    await expectAccessibilityScans(page, testInfo, "admin-services-delete-dialog");
    await page.keyboard.press("Escape");
    await expect(serviceDelete).toBeFocused();
  }

  await page.goto("/admin/prestations/categories");
  await expectPageContract(page);
  await expectAccessibilityScans(page, testInfo, "admin-categories-list");
  const createCategory = page.getByRole("link", { name: "Nouvelle catégorie" });
  await createCategory.click();
  await expect(page.getByLabel("Nom")).toBeFocused();
  await expectAccessibilityScans(page, testInfo, "admin-categories-create-form");
  await expect(page.getByRole("link", { name: "Annuler" })).toHaveAttribute("href", "/admin/prestations/categories");
  await page.goto("/admin/prestations/categories");

  const categoryDelete = page.locator(".admin-category-item").first().getByRole("button", { name: "Supprimer" });
  if (await categoryDelete.count()) {
    await categoryDelete.click();
    const dialog = page.getByRole("dialog", { name: "Supprimer la catégorie ?" });
    await expect(dialog.getByRole("button", { name: "Annuler" })).toBeFocused();
    await expectAccessibilityScans(page, testInfo, "admin-categories-delete-dialog");
    await page.keyboard.press("Escape");
    await expect(categoryDelete).toBeFocused();
  }

  await page.goto("/admin/galerie");
  await expectPageContract(page);
  if (process.env.KN_GALLERY_E2E_SCENARIO === "admin-empty") {
    await expect(page.getByRole("heading", { name: "Aucune photo" })).toBeVisible();
  } else if (process.env.KN_GALLERY_E2E_SCENARIO === "admin-unavailable") {
    await expect(page.getByRole("heading", { name: "Galerie indisponible" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Réessayer" })).toBeVisible();
  } else {
    await expect(page.locator(".admin-gallery-item").first().or(page.getByRole("heading", { name: "Aucune photo" }))).toBeVisible();
  }
  await expectAccessibilityScans(page, testInfo, "admin-gallery-list");

  for (const state of ["pending", "repair_required"] as const) {
    const item = page.locator(`.admin-gallery-item[data-file-state="${state}"]`).first();
    if (await item.count()) await expectAccessibilityScans(page, testInfo, `admin-gallery-${state}`);
  }
  const pagination = page.locator(".admin-pagination");
  if (await pagination.count()) await expectAccessibilityScans(page, testInfo, "admin-gallery-pagination");

  const newPhoto = page.getByRole("link", { name: /Nouvelle photo|Ajouter une photo/ });
  if (await newPhoto.count()) {
    await newPhoto.first().click();
    await expectPageContract(page);
    await expectAccessibilityScans(page, testInfo, "admin-gallery-create-form");
    await expect(page.getByRole("link", { name: "Annuler" })).toHaveAttribute("href", "/admin/galerie");
    await page.goto("/admin/galerie");
  }

  const galleryDelete = page.locator(".admin-gallery-item").first().getByRole("button", { name: "Supprimer" });
  if (await galleryDelete.count()) {
    await galleryDelete.click();
    const dialog = page.getByRole("dialog", { name: "Supprimer la photo ?" });
    await expect(dialog.getByRole("button", { name: "Annuler" })).toBeFocused();
    await expectAccessibilityScans(page, testInfo, "admin-gallery-delete-dialog");
    await page.keyboard.press("Escape");
    await expect(galleryDelete).toBeFocused();
  }
});

test("Galerie expose les états pending, réparation et pagination", async ({
  page,
  browserName,
}, testInfo) => {
  test.skip(Boolean(process.env.PLAYWRIGHT_BASE_URL), "Fixtures locales uniquement");
  test.skip(browserName !== "chromium" || page.viewportSize()?.width !== 1024, "État représentatif Chromium 1024");
  test.setTimeout(90_000);

  const runtime = getLocalSupabaseRuntime();
  const admin = authFixture("ADMIN");
  const client = createGalleryClient(runtime.apiUrl, runtime.publishableKey);
  expect((await client.auth.signInWithPassword({ email: admin.email, password: admin.password })).error).toBeNull();
  const existing = await client.from("photos_galerie").select("id", { count: "exact", head: true });
  expect(existing.error).toBeNull();
  const paddingCount = Math.max(0, 102 - (existing.count ?? 0) - 2);
  const now = Date.now();
  const pendingPath = `photos/${crypto.randomUUID()}.webp`;
  const rows = [
    ...Array.from({ length: paddingCount }, (_, index) => galleryFixture({
      alt_text: `Pagination accessibilité ${now}-${index}`,
      actif: false,
      variante_affichage: "featured",
      ordre_affichage: index % 10_000,
    })),
    galleryFixture({
      storage_path: pendingPath,
      pending_storage_path: pendingPath,
      alt_text: `Opération en attente ${now}`,
      actif: false,
      file_state: "pending",
      operation_kind: "create",
      operation_id: crypto.randomUUID(),
      pending_width: 1200,
      pending_height: 800,
      pending_size_bytes: 128_000,
      operation_started_at: new Date().toISOString(),
      variante_affichage: "social",
      ordre_affichage: 9_998,
    }),
    galleryFixture({
      alt_text: `Opération à réparer ${now}`,
      actif: false,
      file_state: "repair_required",
      operation_kind: "replace",
      operation_id: crypto.randomUUID(),
      operation_started_at: new Date().toISOString(),
      repair_code: "object_missing",
      variante_affichage: "social",
      ordre_affichage: 9_999,
    }),
  ];

  await insertGalleryFixtures(client, rows);
  try {
    const ordered = await client.from("photos_galerie").select("id")
      .order("variante_affichage").order("ordre_affichage").order("created_at").order("id");
    expect(ordered.error).toBeNull();
    const pageFor = (id: string) => {
      const index = ordered.data?.findIndex((row) => row.id === id) ?? -1;
      expect(index).toBeGreaterThanOrEqual(0);
      return Math.floor(index / 100) + 1;
    };
    const pendingPage = pageFor(rows.at(-2)!.id);
    const repairPage = pageFor(rows.at(-1)!.id);

    await page.goto("/admin/connexion");
    await submitLogin(page, admin.email, admin.password);
    await expectAdminHome(page);
    await page.goto(`/admin/galerie?page=${pendingPage}`);
    await expect(page.locator('[data-file-state="pending"]')).toContainText("En attente");
    if (repairPage !== pendingPage) await page.goto(`/admin/galerie?page=${repairPage}`);
    await expect(page.locator('[data-file-state="repair_required"]')).toContainText("À réparer");
    await expect(page.getByRole("navigation", { name: "Pagination de la galerie" })).toBeVisible();
    await expectPageContract(page);
    await expectAccessibilityScans(page, testInfo, "admin-gallery-pending-repair-pagination");
  } finally {
    await removeGalleryFixtures(client, rows);
  }
});
