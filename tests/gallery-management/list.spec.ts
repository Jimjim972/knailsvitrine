import { expect, test } from "@playwright/test";
import { authFixture, expectAdminHome, galleryFixture, removeGalleryFixtures, submitLogin } from "./fixtures";
import { createGalleryClient, getLocalSupabaseRuntime } from "./local-supabase";

test("100 photos keep the same unique stable order through 20 reloads", async ({ page }) => {
  test.skip(Boolean(process.env.KN_GALLERY_E2E_SCENARIO), "Real-data suite");
  const runtime = getLocalSupabaseRuntime();
  const admin = authFixture("ADMIN");
  const client = createGalleryClient(runtime.apiUrl, runtime.publishableKey);
  expect((await client.auth.signInWithPassword({ email: admin.email, password: admin.password })).error).toBeNull();
  const existing = await client.from("photos_galerie").select("id", { count: "exact", head: true });
  expect(existing.error).toBeNull();
  const rows = Array.from({ length: Math.max(0, 100 - (existing.count ?? 0)) }, (_, index) => galleryFixture({ alt_text: `Photo stable ${index}`, ordre_affichage: index % 7, actif: false }));
  expect((await client.from("photos_galerie").insert(rows)).error).toBeNull();
  try {
    await page.goto("/admin/connexion");
    await submitLogin(page, admin.email, admin.password);
    await expectAdminHome(page);
    await page.goto("/admin/galerie");
    const expected = await page.locator(".admin-gallery-item").evaluateAll((items) => items.map((item) => item.getAttribute("data-photo-id")));
    expect(expected).toHaveLength(100);
    expect(new Set(expected).size).toBe(100);
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await page.reload();
      expect(await page.locator(".admin-gallery-item").evaluateAll((items) => items.map((item) => item.getAttribute("data-photo-id")))).toEqual(expected);
    }
  } finally {
    await removeGalleryFixtures(client, rows);
  }
});

test("201 photos paginate as 100, 100 and 1 without duplicate IDs", async ({ page }) => {
  test.skip(Boolean(process.env.KN_GALLERY_E2E_SCENARIO), "Real-data suite");
  const runtime = getLocalSupabaseRuntime();
  const admin = authFixture("ADMIN");
  const client = createGalleryClient(runtime.apiUrl, runtime.publishableKey);
  expect((await client.auth.signInWithPassword({ email: admin.email, password: admin.password })).error).toBeNull();
  const existing = await client.from("photos_galerie").select("id", { count: "exact", head: true });
  expect(existing.error).toBeNull();
  expect(existing.count ?? 0).toBeLessThanOrEqual(201);
  const rows = Array.from({ length: 201 - (existing.count ?? 0) }, (_, index) => galleryFixture({ alt_text: `Photo paginée ${index}`, ordre_affichage: index, actif: false }));
  expect((await client.from("photos_galerie").insert(rows)).error).toBeNull();
  try {
    await page.goto("/admin/connexion");
    await submitLogin(page, admin.email, admin.password);
    await expectAdminHome(page);
    const seen = new Set<string>();
    for (const [number, expectedCount] of [[1, 100], [2, 100], [3, 1]] as const) {
      await page.goto(`/admin/galerie?page=${number}`);
      await expect(page.getByText(`Page ${number} sur 3`)).toBeVisible();
      const ids = await page.locator(".admin-gallery-item").evaluateAll((items) => items.map((item) => item.getAttribute("data-photo-id") ?? ""));
      expect(ids).toHaveLength(expectedCount);
      for (const id of ids) { expect(seen.has(id)).toBe(false); seen.add(id); }
    }
    expect(seen.size).toBe(201);
  } finally {
    await removeGalleryFixtures(client, rows);
  }
});
