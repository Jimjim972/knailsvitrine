import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import { authFixture, expectAdminHome, submitLogin } from "./fixtures";
import { createGalleryClient, getLocalSupabaseRuntime } from "./local-supabase";

function exactOneMebibyteWebp(base: Uint8Array) {
  if (base.byteLength > 1_048_576) throw new Error("WebP fixture exceeds the network budget"); const output = Buffer.alloc(1_048_576); output.set(base); return output;
}

test("the public gallery exposes only active ready rows and revokes the same image URL immediately", async ({ page, browserName }) => {
  test.skip(browserName === "webkit", "Fixture creation needs Canvas WebP encoding unavailable in Playwright WebKit");
  const runtime = getLocalSupabaseRuntime(); const admin = authFixture("ADMIN"); const client = createGalleryClient(runtime.apiUrl, runtime.publishableKey); expect((await client.auth.signInWithPassword({ email: admin.email, password: admin.password })).error).toBeNull();
  const alt = `Galerie publique ${Date.now()}`; let id: string | null = null; let path: string | null = null;
  try {
    const anonymous = createGalleryClient(runtime.apiUrl, runtime.publishableKey);
    const anonymousListing = await anonymous.storage.from("galerie").list("photos", { limit: 1 });
    expect(anonymousListing.data ?? []).toHaveLength(0);
    await page.goto("/admin/connexion"); await submitLogin(page, admin.email, admin.password); await expectAdminHome(page); await page.goto("/admin/galerie/nouvelle");
    await page.getByLabel("Image").setInputFiles(resolve("public/images/nails-signature.jpg")); await expect(page.getByRole("status").filter({ hasText: "Image prête" })).toBeVisible(); await page.getByLabel("Texte alternatif").fill(alt); await page.getByLabel("Titre, facultatif").fill("Destination galerie"); await page.getByLabel("Lien HTTPS, facultatif").fill("https://example.com/realisation"); await page.getByLabel("Variante").selectOption("featured"); await page.getByRole("button", { name: "Ajouter la photo" }).click(); await expect(page).toHaveURL(/\/admin\/galerie$/);
    const created = await client.from("photos_galerie").select("id,storage_path").eq("alt_text", alt).single(); id = created.data?.id ?? null; path = created.data?.storage_path ?? null; expect(id).not.toBeNull();
    await page.goto("/galerie"); await expect(page.getByAltText(alt)).toBeVisible(); await expect(page.getByRole("link", { name: "Ouvrir Destination galerie" })).toHaveAttribute("href", "https://example.com/realisation"); const imageUrl = `/api/gallery-images/${id}`; const allowed = await page.request.get(imageUrl); expect(allowed.status()).toBe(200); expect(allowed.headers()["cache-control"]).toBe("private, no-store");
    expect((await client.from("photos_galerie").update({ actif: false }).eq("id", id!).select("id").single()).error).toBeNull();
    const denied = await page.request.get(imageUrl); expect(denied.status()).toBe(404); expect(await denied.text()).not.toContain("photos/");
    const operationId = crypto.randomUUID(); const pendingPath = `photos/${crypto.randomUUID()}.webp`;
    expect((await client.from("photos_galerie").update({ actif: true, file_state: "pending", operation_kind: "replace", operation_id: operationId, operation_started_at: new Date().toISOString(), pending_storage_path: pendingPath, pending_width: 1200, pending_height: 800, pending_size_bytes: 100_000 }).eq("id", id!).select("id").single()).error).toBeNull();
    expect((await page.request.get(imageUrl)).status()).toBe(404);
    expect((await client.from("photos_galerie").update({ file_state: "repair_required", pending_storage_path: null, pending_width: null, pending_height: null, pending_size_bytes: null, repair_code: "object_missing" }).eq("id", id!).select("id").single()).error).toBeNull();
    expect((await page.request.get(imageUrl)).status()).toBe(404);
    expect((await client.from("photos_galerie").update({ file_state: "ready", operation_kind: null, operation_id: null, operation_started_at: null, repair_code: null }).eq("id", id!).select("id").single()).error).toBeNull();
    const updatedTitle = `Destination actualisée ${Date.now()}`;
    await page.goto(`/admin/galerie/${id}/modifier`); const metadataForm = page.locator("form.admin-gallery-form:visible"); await metadataForm.getByLabel("Titre, facultatif").fill(updatedTitle); const updateStarted = Date.now(); await metadataForm.getByRole("button", { name: "Enregistrer" }).click(); await expect(page).toHaveURL(/\/admin\/galerie$/); await page.goto("/galerie"); await expect(page.getByRole("link", { name: `Ouvrir ${updatedTitle}` })).toBeVisible(); expect(Date.now() - updateStarted).toBeLessThan(5_000);
    expect((await client.storage.from("galerie").remove([path!])).error).toBeNull(); path = null;
    await page.reload(); await expect(page.getByAltText(alt)).toHaveCount(0); await expect(page.getByText(/photos\//)).toHaveCount(0);
    await page.goto("/admin/galerie"); const item = page.locator(".admin-gallery-item", { hasText: alt }); await expect(item.getByText("Fichier indisponible")).toBeVisible(); await item.getByRole("button", { name: "Vérifier le fichier" }).click(); await expect(item.getByText("À réparer", { exact: true })).toBeVisible();
    const repaired = await client.from("photos_galerie").select("file_state,repair_code").eq("id", id!).single(); expect(repaired.data).toMatchObject({ file_state: "repair_required", repair_code: "object_missing" });
    await page.goto("/galerie"); await expect(page.getByAltText(alt)).toHaveCount(0);
    await page.goto("/admin/galerie"); const repairItem = page.locator(".admin-gallery-item", { hasText: alt }); await repairItem.getByRole("button", { name: "Supprimer", exact: true }).click(); await page.getByRole("dialog", { name: "Supprimer la photo ?" }).getByRole("button", { name: "Supprimer définitivement" }).click(); await expect(repairItem).toHaveCount(0); id = null;
    expect((await page.request.get(imageUrl)).status()).toBe(404);
  } finally {
    if (!id) { const residue = await client.from("photos_galerie").select("id,storage_path").eq("alt_text", alt).maybeSingle(); id = residue.data?.id ?? null; path = residue.data?.storage_path ?? null; }
    if (path) await client.storage.from("galerie").remove([path]); if (id) await client.from("photos_galerie").delete().eq("id", id);
  }
});

test("cold mobile rendering has zero gallery layout shift and a two-request initial image budget", async ({ page }) => {
  test.skip(Boolean(process.env.KN_GALLERY_E2E_SCENARIO), "Real-data suite");
  const runtime = getLocalSupabaseRuntime(); const source = await createGalleryClient(runtime.apiUrl, runtime.publishableKey).storage.from("galerie").download("photos/9bb12188-b38b-4d25-bc96-def3eb132329.webp"); expect(source.error).toBeNull();
  const oneMebibyte = exactOneMebibyteWebp(new Uint8Array(await source.data!.arrayBuffer())); const requested: string[] = []; let deliveredBytes = 0;
  await page.addInitScript(() => {
    Object.defineProperty(window, "__galleryLayoutShift", { value: { total: 0 }, configurable: true });
    new PerformanceObserver((list) => { for (const entry of list.getEntries()) { const shift = entry as PerformanceEntry & { hadRecentInput: boolean; value: number; sources?: Array<{ node?: Node | null }> }; const galleryShift = shift.sources?.some(({ node }) => node instanceof Element && Boolean(node.closest(".gallery-card, .social-card"))); if (!shift.hadRecentInput && galleryShift) (window as typeof window & { __galleryLayoutShift: { total: number } }).__galleryLayoutShift.total += shift.value; } }).observe({ type: "layout-shift", buffered: true });
  });
  await page.route("**/api/gallery-images/*", async (route) => { requested.push(route.request().url()); deliveredBytes += oneMebibyte.byteLength; await route.fulfill({ status: 200, contentType: "image/webp", headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" }, body: oneMebibyte }); });
  await page.setViewportSize({ width: 320, height: 800 }); await page.goto("/galerie", { waitUntil: "load" }); await page.waitForTimeout(5_000);
  expect(new Set(requested).size).toBe(requested.length); expect(requested.length).toBeLessThanOrEqual(2); expect(deliveredBytes).toBeLessThanOrEqual(2 * 1_048_576);
  const shifts = await page.evaluate(() => (window as typeof window & { __galleryLayoutShift: { total: number } }).__galleryLayoutShift.total); expect(shifts).toBe(0);
  const cards = page.locator(".gallery-card, .social-card"); await expect(cards).toHaveCount(9); await expect(page.locator(".gallery-card img, .social-card img")).toHaveCount(2); for (const image of await page.locator(".gallery-card img, .social-card img").all()) expect(await image.getAttribute("loading")).toBe("eager");
  for (const card of await cards.all()) await card.scrollIntoViewIfNeeded(); await expect.poll(() => requested.length, { timeout: 2_000 }).toBe(9); await expect(page.locator(".gallery-card img, .social-card img")).toHaveCount(9);
  const allImages = await page.locator(".gallery-card img, .social-card img").all(); for (const [index, image] of allImages.entries()) { expect(await image.getAttribute("alt")).not.toBe(""); expect(await image.getAttribute("loading")).toBe(index < 2 ? "eager" : "lazy"); } expect(new Set(requested).size).toBe(requested.length); expect(requested.length).toBeLessThanOrEqual(9);
});
