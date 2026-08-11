import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { INITIAL_SERVICES, SERVICE_CATEGORIES } from "./fixtures";
import { authFixture, createAuthFixture, deleteAuthFixture, expectAdminHome, getLocalSupabaseRuntime, submitLogin } from "./local-supabase";

test("the migrated baseline preserves all three public universes and contact CTAs", async ({ page }) => {
  test.skip(Boolean(process.env.KN_SERVICE_E2E_SCENARIO), "Real-data suite");
  await page.goto("/services");
  for (const category of SERVICE_CATEGORIES) {
    await expect(page.getByRole("heading", { name: category.title })).toBeVisible();
    await expect(page.getByAltText(category.imageAlt)).toBeVisible();
  }
  for (const service of INITIAL_SERVICES) {
    const card = page.locator(".service-card", { hasText: service.name });
    await expect(card).toContainText(service.price);
    await expect(card.getByRole("link", { name: `Réserver ${service.name}` })).toHaveAttribute("href", "/contact");
  }
  await expect(page.locator(".service-card")).toHaveCount(8);
});

test("optional labels create no placeholders", async ({ page }) => {
  test.skip(Boolean(process.env.KN_SERVICE_E2E_SCENARIO), "Real-data suite");
  await page.goto("/services");
  const card = page.locator(".service-card", { hasText: "Manucure Russe" });
  await expect(card.locator(".badge")).toHaveCount(0);
  await expect(card).toContainText("45 min");
});

test("a category with no active service keeps its neutral public section", async ({ page }) => {
  test.skip(Boolean(process.env.KN_SERVICE_E2E_SCENARIO), "Real-data suite");
  const admin = authFixture("ADMIN");
  await page.goto("/admin/connexion");
  await submitLogin(page, admin.email, admin.password);
  await expectAdminHome(page);
  await page.goto("/admin/prestations");
  for (const name of ["Modelage Relaxant Sur-Mesure", "Gommage Corps Éclat"]) {
    const item = page.locator(".admin-service-item", { hasText: name });
    await item.getByRole("button", { name: "Masquer" }).click();
    await expect(item.getByText("La prestation est masquée.")).toBeVisible();
  }

  await page.goto("/services");
  const section = page.getByRole("heading", { name: "Soins du Corps", level: 2 }).locator("../..");
  await expect(section.getByText("Aucune prestation n’est disponible dans cette catégorie pour le moment.")).toBeVisible();
  await expect(section.locator(".service-card")).toHaveCount(0);

  await page.goto("/admin/prestations");
  for (const name of ["Modelage Relaxant Sur-Mesure", "Gommage Corps Éclat"]) {
    const item = page.locator(".admin-service-item", { hasText: name });
    await item.getByRole("button", { name: "Réactiver" }).click();
    await expect(item.getByText("La prestation est active.")).toBeVisible();
  }
});

test("forty services retain the same order across twenty public reloads", async ({ page }) => {
  test.skip(Boolean(process.env.KN_SERVICE_E2E_SCENARIO), "Real-data suite");
  test.setTimeout(90_000);
  const runtime = getLocalSupabaseRuntime();
  const fixture = await createAuthFixture(runtime, "services-scale", true);
  const adminClient = createClient(runtime.apiUrl, runtime.publishableKey, { auth: { persistSession: false } });
  const signIn = await adminClient.auth.signInWithPassword({ email: fixture.email, password: fixture.password });
  expect(signIn.error).toBeNull();
  const inserted = Array.from({ length: 32 }, (_, index) => ({
    id: randomUUID(),
    nom: `Charge ${String(index + 1).padStart(2, "0")}`,
    description: `Prestation de charge ${index + 1}`,
    categorie: ["onglerie_manucure", "soins_corps", "esthetique_visage"][index % 3],
    prix: index + 1.5,
    type_prix: "fixed",
    ordre_affichage: index % 5,
    actif: true,
  }));
  const insertResult = await adminClient.from("prestations").insert(inserted);
  expect(insertResult.error).toBeNull();

  await page.goto("/admin/connexion");
  await submitLogin(page, fixture.email, fixture.password);
  await expectAdminHome(page);
  await page.goto("/admin/prestations");
  const baseline = page.locator(".admin-service-item", { hasText: "Manucure Russe" });
  await baseline.getByRole("button", { name: "Masquer" }).click();
  await expect(baseline.getByText("La prestation est masquée.")).toBeVisible();
  await page.reload();
  await baseline.getByRole("button", { name: "Réactiver" }).click();
  await expect(baseline.getByText("La prestation est active.")).toBeVisible();

  let expected: string[] | undefined;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await page.goto("/services");
    await expect(page.locator(".service-card")).toHaveCount(40);
    const names = await page.locator(".service-card h3").allTextContents();
    expected ??= names;
    expect(names).toEqual(expected);
  }

  const cleanup = await adminClient.from("prestations").delete().in("id", inserted.map(({ id }) => id));
  expect(cleanup.error).toBeNull();
  await page.goto("/admin/prestations");
  await baseline.getByRole("button", { name: "Masquer" }).click();
  await expect(baseline.getByText("La prestation est masquée.")).toBeVisible();
  await page.reload();
  await baseline.getByRole("button", { name: "Réactiver" }).click();
  await expect(baseline.getByText("La prestation est active.")).toBeVisible();
  await deleteAuthFixture(runtime, fixture);
});
