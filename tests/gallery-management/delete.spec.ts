import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import { authFixture, expectAdminHome, galleryFixture, removeGalleryFixtures, submitLogin } from "./fixtures";
import { createGalleryClient, getLocalSupabaseRuntime } from "./local-supabase";

test("delete cancellation is inert and confirmation removes the exact row and object", async ({ page, browserName }) => {
  test.skip(browserName === "webkit", "Fixture creation needs Canvas WebP encoding unavailable in Playwright WebKit");
  const runtime = getLocalSupabaseRuntime(); const admin = authFixture("ADMIN"); const client = createGalleryClient(runtime.apiUrl, runtime.publishableKey); expect((await client.auth.signInWithPassword({ email: admin.email, password: admin.password })).error).toBeNull();
  const alt = `Photo supprimable ${Date.now()}`; let id: string | null = null; let path: string | null = null;
  try {
    await page.goto("/admin/connexion"); await submitLogin(page, admin.email, admin.password); await expectAdminHome(page); await page.goto("/admin/galerie/nouvelle");
    await page.getByLabel("Image").setInputFiles(resolve("public/images/nails-signature.jpg")); await expect(page.getByRole("status").filter({ hasText: "Image prête" })).toBeVisible(); await page.getByLabel("Texte alternatif").fill(alt); await page.getByRole("button", { name: "Ajouter la photo" }).click(); await expect(page).toHaveURL(/\/admin\/galerie$/);
    const created = await client.from("photos_galerie").select("id,storage_path").eq("alt_text", alt).single(); id = created.data?.id ?? null; path = created.data?.storage_path ?? null; expect(id).not.toBeNull();
    const item = page.locator(".admin-gallery-item", { hasText: alt }); const trigger = item.getByRole("button", { name: "Supprimer", exact: true }); await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Supprimer la photo ?" }); await expect(dialog.getByRole("button", { name: "Annuler" })).toBeFocused(); await page.keyboard.press("Escape"); await expect(trigger).toBeFocused(); expect((await client.from("photos_galerie").select("id").eq("id", id!).single()).error).toBeNull();
    await trigger.click(); await dialog.getByRole("button", { name: "Supprimer définitivement" }).click(); await expect(page.getByRole("status").filter({ hasText: "La photo a été supprimée." })).toBeVisible(); await expect(item).toHaveCount(0); expect((await client.from("photos_galerie").select("id").eq("id", id!).maybeSingle()).data).toBeNull(); id = null; path = null;
  } finally { if (path) await client.storage.from("galerie").remove([path]); if (id) await client.from("photos_galerie").delete().eq("id", id); }
});

test("a partial delete with an already absent object removes only its repair row", async ({ page }) => {
  const runtime = getLocalSupabaseRuntime(); const admin = authFixture("ADMIN"); const client = createGalleryClient(runtime.apiUrl, runtime.publishableKey); expect((await client.auth.signInWithPassword({ email: admin.email, password: admin.password })).error).toBeNull();
  const path = `photos/${crypto.randomUUID()}.webp`; const row = galleryFixture({ storage_path: path, alt_text: `Suppression partielle ${Date.now()}`, actif: true, file_state: "repair_required", operation_kind: "delete", operation_id: crypto.randomUUID(), cleanup_storage_path: path, operation_started_at: new Date().toISOString(), repair_code: "row_delete_unconfirmed" });
  expect((await client.from("photos_galerie").insert(row)).error).toBeNull();
  try {
    await page.goto("/admin/connexion"); await submitLogin(page, admin.email, admin.password); await expectAdminHome(page); await page.goto("/admin/galerie");
    const item = page.locator(".admin-gallery-item", { hasText: row.alt_text }); await expect(item.getByText("À réparer", { exact: true })).toBeVisible(); await item.getByRole("button", { name: "Réparer" }).click(); await expect(item).toHaveCount(0);
    expect((await client.from("photos_galerie").select("id").eq("id", row.id).maybeSingle()).data).toBeNull();
  } finally { await removeGalleryFixtures(client, [row]); }
});
