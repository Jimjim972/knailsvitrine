import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import { authFixture, expectAdminHome, galleryFixture, removeGalleryFixtures, submitLogin } from "./fixtures";
import { createGalleryClient, getLocalSupabaseRuntime } from "./local-supabase";

test("metadata, visibility and file replacement keep one logical photo", async ({ page, browserName }) => {
  test.skip(browserName === "webkit", "Fixture creation needs Canvas WebP encoding unavailable in Playwright WebKit");
  const runtime = getLocalSupabaseRuntime(); const admin = authFixture("ADMIN"); const client = createGalleryClient(runtime.apiUrl, runtime.publishableKey);
  expect((await client.auth.signInWithPassword({ email: admin.email, password: admin.password })).error).toBeNull();
  const initialAlt = `Photo modifiable ${Date.now()}`; const updatedAlt = `${initialAlt} corrigée`; let photoId: string | null = null; let path: string | null = null;
  try {
    await page.goto("/admin/connexion"); await submitLogin(page, admin.email, admin.password); await expectAdminHome(page);
    await page.goto("/admin/galerie/nouvelle"); await page.getByLabel("Image").setInputFiles(resolve("public/images/nails-signature.jpg"));
    await expect(page.getByRole("status").filter({ hasText: "Image prête" })).toBeVisible(); await page.getByLabel("Texte alternatif").fill(initialAlt); await page.getByRole("button", { name: "Ajouter la photo" }).click(); await expect(page).toHaveURL(/\/admin\/galerie$/);
    const created = await client.from("photos_galerie").select("id,storage_path").eq("alt_text", initialAlt).single(); expect(created.error).toBeNull(); photoId = created.data?.id ?? null; path = created.data?.storage_path ?? null; expect(photoId).not.toBeNull();
    const item = page.locator(".admin-gallery-item", { hasText: initialAlt }); await item.getByRole("link", { name: "Modifier" }).click(); await expect(page).toHaveURL(/\/modifier$/); await expect(page.getByRole("heading", { name: "Modifier la photo" })).toBeVisible();
    const metadataForm = page.locator("form.admin-gallery-form:visible"); await metadataForm.getByLabel("Texte alternatif").fill(updatedAlt); await metadataForm.getByLabel("Ordre d’affichage").fill("17"); await metadataForm.getByLabel("Variante").selectOption("wide_large"); await metadataForm.getByRole("button", { name: "Enregistrer" }).click(); await expect(page).toHaveURL(/\/admin\/galerie$/);
    await expect(page.getByRole("status").filter({ hasText: "La photo a été modifiée." })).toBeVisible();
    const updatedItem = page.locator(".admin-gallery-item", { hasText: updatedAlt }); await expect(updatedItem.getByText("17", { exact: true })).toBeVisible(); await expect(updatedItem.getByText("Grande carte large", { exact: true })).toBeVisible();
    await updatedItem.getByRole("button", { name: "Masquer" }).click(); await expect(page.getByRole("status").filter({ hasText: "La photo est masquée." })).toBeVisible(); await expect(updatedItem.getByText("Masquée", { exact: true })).toBeVisible();
    await updatedItem.getByRole("button", { name: "Réactiver" }).click(); await expect(page.getByRole("status").filter({ hasText: "La photo est active." })).toBeVisible(); await expect(updatedItem.getByText("Active", { exact: true })).toBeVisible();
    await page.goto(`/admin/galerie/${photoId}/modifier`); await expect(page.getByRole("heading", { name: "Modifier la photo" })).toBeVisible(); const replacementForm = page.locator("form.admin-service-form:visible").filter({ hasText: "Remplacer le fichier" }); await replacementForm.getByLabel("Image").setInputFiles(resolve("public/images/french-manucure.jpg")); await expect(replacementForm.getByRole("status").filter({ hasText: "Image prête" })).toBeVisible(); await expect(replacementForm.locator(".admin-image-preview-frame")).toHaveAttribute("data-variant", "wide_large");
    await page.getByRole("button", { name: "Remplacer l’image" }).click(); await expect(page).toHaveURL(/\/admin\/galerie$/, { timeout: 30_000 }); await expect(page.getByRole("status").filter({ hasText: "La photo a été remplacée." })).toBeVisible();
    const replaced = await client.from("photos_galerie").select("id,storage_path,file_state").eq("id", photoId!).single(); expect(replaced.error).toBeNull(); expect(replaced.data?.id).toBe(photoId); expect(replaced.data?.storage_path).not.toBe(path); expect(replaced.data?.file_state).toBe("ready"); path = replaced.data?.storage_path ?? path;
  } finally {
    if (path) await client.storage.from("galerie").remove([path]); if (photoId) await client.from("photos_galerie").delete().eq("id", photoId);
  }
});

test("a missing administrative thumbnail becomes a targeted object_missing repair", async ({ page }) => {
  const runtime = getLocalSupabaseRuntime(); const admin = authFixture("ADMIN"); const client = createGalleryClient(runtime.apiUrl, runtime.publishableKey); expect((await client.auth.signInWithPassword({ email: admin.email, password: admin.password })).error).toBeNull();
  const row = galleryFixture({ alt_text: `Fichier absent ${Date.now()}`, actif: true }); expect((await client.from("photos_galerie").insert(row)).error).toBeNull();
  try {
    await page.goto("/admin/connexion"); await submitLogin(page, admin.email, admin.password); await expectAdminHome(page); await page.goto("/admin/galerie");
    const item = page.locator(".admin-gallery-item", { hasText: row.alt_text }); await expect(item.getByText("Fichier indisponible")).toBeVisible(); await item.getByRole("button", { name: "Vérifier le fichier" }).click(); await expect(item.getByText("À réparer", { exact: true })).toBeVisible();
    const repaired = await client.from("photos_galerie").select("file_state,operation_kind,repair_code,pending_storage_path").eq("id", row.id).single(); expect(repaired.error).toBeNull(); expect(repaired.data).toMatchObject({ file_state: "repair_required", operation_kind: "replace", repair_code: "object_missing", pending_storage_path: null });
  } finally { await removeGalleryFixtures(client, [row]); }
});

test("a session revoked during editing cannot mutate gallery metadata", async ({ page }) => {
  const runtime = getLocalSupabaseRuntime(); const admin = authFixture("ADMIN"); const client = createGalleryClient(runtime.apiUrl, runtime.publishableKey);
  expect((await client.auth.signInWithPassword({ email: admin.email, password: admin.password })).error).toBeNull();
  const target = await client.from("photos_galerie").select("id,alt_text").eq("file_state", "ready").limit(1).single(); expect(target.error).toBeNull();
  await page.goto("/admin/connexion"); await submitLogin(page, admin.email, admin.password); await expectAdminHome(page); await page.goto(`/admin/galerie/${target.data!.id}/modifier`);
  const form = page.locator("form.admin-gallery-form:visible"); const attempted = `${target.data!.alt_text} refusée`; await form.getByLabel("Texte alternatif").fill(attempted);
  expect((await client.auth.signOut({ scope: "global" })).error).toBeNull(); await form.getByRole("button", { name: "Enregistrer" }).click();
  await expect(form.getByRole("alert")).toContainText(/session a expiré/i); const verifier = createGalleryClient(runtime.apiUrl, runtime.publishableKey); expect((await verifier.auth.signInWithPassword({ email: admin.email, password: admin.password })).error).toBeNull();
  const unchanged = await verifier.from("photos_galerie").select("alt_text").eq("id", target.data!.id).single(); expect(unchanged.data?.alt_text).toBe(target.data!.alt_text);
});
