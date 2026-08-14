import { resolve } from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { authFixture, expectAdminHome, submitLogin } from "./fixtures";
import { galleryFixture, insertGalleryFixtures, removeGalleryFixtures } from "./fixtures";
import { createGalleryClient, getLocalSupabaseRuntime } from "./local-supabase";
import { ALPHA_REFERENCE_MANIFEST } from "../unit/gallery/alpha-reference-manifest";
import { ciede2000, COLOR_REFERENCE_MANIFEST, percentile95, srgb8ToLabD65 } from "../unit/gallery/color-reference-manifest";
import { GALLERY_BROWSER_FIXTURES, losslessWebp } from "../unit/gallery/image-fixtures";

type SampleCoordinate = { u: number; v: number };

async function sampleImage(locator: Locator, coordinates: readonly SampleCoordinate[]) {
  await expect(locator).toBeVisible();
  await expect.poll(() => locator.evaluate((image) => (image as HTMLImageElement).complete)).toBe(true);
  return locator.evaluate((image, points) => {
    const source = image as HTMLImageElement; const canvas = document.createElement("canvas"); canvas.width = source.naturalWidth; canvas.height = source.naturalHeight;
    const context = canvas.getContext("2d", { willReadFrequently: true }); if (!context) throw new Error("Canvas unavailable"); context.drawImage(source, 0, 0);
    return points.map(({ u, v }) => { const x = Math.min(canvas.width - 1, Math.max(0, Math.floor(u * (canvas.width - 1) + 0.5))); const y = Math.min(canvas.height - 1, Math.max(0, Math.floor(v * (canvas.height - 1) + 0.5))); return [...context.getImageData(x, y, 1, 1).data]; });
  }, [...coordinates]);
}

async function sampleAuthenticatedImage(page: Page, url: string, coordinates: readonly SampleCoordinate[]) {
  return page.evaluate(async ({ sourceUrl, points }) => {
    const response = await fetch(sourceUrl, { cache: "no-store" }); if (!response.ok) throw new Error(`Image request failed: ${response.status}`); const bitmap = await createImageBitmap(await response.blob());
    try { const canvas = document.createElement("canvas"); canvas.width = bitmap.width; canvas.height = bitmap.height; const context = canvas.getContext("2d", { willReadFrequently: true }); if (!context) throw new Error("Canvas unavailable"); context.drawImage(bitmap, 0, 0); return points.map(({ u, v }) => { const x = Math.min(canvas.width - 1, Math.max(0, Math.floor(u * (canvas.width - 1) + 0.5))); const y = Math.min(canvas.height - 1, Math.max(0, Math.floor(v * (canvas.height - 1) + 0.5))); return [...context.getImageData(x, y, 1, 1).data]; }); } finally { bitmap.close(); }
  }, { sourceUrl: url, points: [...coordinates] });
}

function createPixelOracle(page: Page) {
  return {
    async prepare(path: string, coordinates: readonly SampleCoordinate[]) {
      await page.goto("/admin/galerie/nouvelle");
      const preview = page.getByAltText("Aperçu exact de l’image préparée");
      await page.getByLabel("Image").setInputFiles(resolve(path));
      await expect(page.getByRole("status").filter({ hasText: "Image prête" })).toBeVisible({ timeout: 30_000 });
      const outputSource = await preview.getAttribute("src"); expect(outputSource).toBeTruthy();
      const previewPixels = await sampleImage(preview, coordinates);
      const caption = await page.locator(".admin-image-preview figcaption").textContent();
      const finalPixels = await sampleAuthenticatedImage(page, outputSource!, coordinates);
      const dimensions = await preview.evaluate((image) => ({ width: (image as HTMLImageElement).naturalWidth, height: (image as HTMLImageElement).naturalHeight }));
      return { previewPixels, finalPixels, caption, ...dimensions };
    },
  };
}

test("an administrator prepares, previews, uploads and finalizes one WebP", async ({ page, browserName }) => {
  test.skip(browserName === "webkit", "Playwright WebKit has no Canvas WebP encoder; real Safari remains a manual acceptance gate");
  test.skip(Boolean(process.env.KN_GALLERY_E2E_SCENARIO), "Real-data suite");
  const runtime = getLocalSupabaseRuntime();
  const admin = authFixture("ADMIN");
  const client = createGalleryClient(runtime.apiUrl, runtime.publishableKey);
  expect((await client.auth.signInWithPassword({ email: admin.email, password: admin.password })).error).toBeNull();
  const altText = `Création galerie ${Date.now()}`;
  let createdId: string | null = null;
  let createdPath: string | null = null;
  try {
    await page.goto("/admin/connexion"); await submitLogin(page, admin.email, admin.password); await expectAdminHome(page);
    await page.goto("/admin/galerie/nouvelle");
    await page.getByLabel("Image").setInputFiles(resolve("public/images/nails-signature.jpg"));
    await expect(page.getByRole("status").filter({ hasText: "Image prête" })).toBeVisible();
    await expect(page.getByAltText("Aperçu exact de l’image préparée")).toBeVisible();
    await page.getByLabel("Variante").selectOption("wide_large");
    await expect(page.locator(".admin-image-preview-frame")).toHaveAttribute("data-variant", "wide_large");
    await page.getByLabel("Texte alternatif").fill(altText);
    await page.getByRole("button", { name: "Ajouter la photo" }).click();
    await expect(page).toHaveURL(/\/admin\/galerie$/, { timeout: 30_000 });
    await expect(page.getByRole("status").filter({ hasText: "La photo a été ajoutée." })).toBeVisible();
    const item = page.locator(".admin-gallery-item", { hasText: altText });
    await expect(item).toHaveCount(1);
    await expect(item.getByText("Active", { exact: true })).toBeVisible();
    const database = await client.from("photos_galerie").select("id,storage_path,file_state,mime_type,size_bytes").eq("alt_text", altText).single();
    expect(database.error).toBeNull();
    expect(database.data?.file_state).toBe("ready"); expect(database.data?.mime_type).toBe("image/webp");
    expect(database.data?.size_bytes).toBeLessThanOrEqual(1_048_576);
    createdId = database.data?.id ?? null; createdPath = database.data?.storage_path ?? null;
  } finally {
    if (!createdId) {
      const residue = await client.from("photos_galerie").select("id,storage_path").eq("alt_text", altText).maybeSingle();
      createdId = residue.data?.id ?? null; createdPath = residue.data?.storage_path ?? null;
    }
    if (createdPath) await client.storage.from("galerie").remove([createdPath]);
    if (createdId) await client.from("photos_galerie").delete().eq("id", createdId);
  }
});

test("Chromium preserves orientation and alpha through the exact preview and final WebP output", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "Pixel oracles run in Chromium; real Safari is the manual acceptance gate");
  test.skip(Boolean(process.env.KN_GALLERY_E2E_SCENARIO), "Real-data suite");
  test.setTimeout(180_000);
  const admin = authFixture("ADMIN"); await page.goto("/admin/connexion"); await submitLogin(page, admin.email, admin.password); await expectAdminHome(page);
  const oracle = createPixelOracle(page);
  const orientation = await oracle.prepare(GALLERY_BROWSER_FIXTURES.orientation, [{ u: 0.5, v: 0.5 }]); expect(orientation.caption).toContain("40 × 80"); expect([orientation.width, orientation.height]).toEqual([40, 80]);
    for (const fixture of [ALPHA_REFERENCE_MANIFEST.unchanged, ALPHA_REFERENCE_MANIFEST.resized]) {
      const output = await oracle.prepare(fixture.path, fixture.coordinates); expect([output.width, output.height]).toEqual([fixture.outputWidth, fixture.outputHeight]);
      for (const pixels of [output.previewPixels, output.finalPixels]) fixture.coordinates.forEach(({ expected }, index) => { const actual = pixels[index][3]; if (expected === 0 || expected === 255) expect(actual).toBe(expected); else expect(Math.abs(actual - expected)).toBeLessThanOrEqual(fixture.tolerance); });
    }
});

test("Chromium preserves sRGB color through the exact preview and final WebP output", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "Pixel oracles run in Chromium; real Safari is the manual acceptance gate");
  test.skip(Boolean(process.env.KN_GALLERY_E2E_SCENARIO), "Real-data suite");
  test.setTimeout(360_000);
  const admin = authFixture("ADMIN"); await page.goto("/admin/connexion"); await submitLogin(page, admin.email, admin.password); await expectAdminHome(page);
  const oracle = createPixelOracle(page);
    const previewDeltas: number[] = []; const finalDeltas: number[] = [];
    for (const fixture of COLOR_REFERENCE_MANIFEST) {
      const output = await oracle.prepare(fixture.path, fixture.samples); fixture.samples.forEach(({ rgb }, index) => { const expected = srgb8ToLabD65(rgb); previewDeltas.push(ciede2000(expected, srgb8ToLabD65(output.previewPixels[index].slice(0, 3) as [number, number, number]))); finalDeltas.push(ciede2000(expected, srgb8ToLabD65(output.finalPixels[index].slice(0, 3) as [number, number, number]))); });
    }
    const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
    expect(median(previewDeltas)).toBeLessThanOrEqual(2); expect(percentile95(previewDeltas)).toBeLessThanOrEqual(5); expect(median(finalDeltas)).toBeLessThanOrEqual(2); expect(percentile95(finalDeltas)).toBeLessThanOrEqual(5);
});

test("create form reports field and file errors without reserving a row", async ({ page }) => {
  const admin = authFixture("ADMIN");
  await page.goto("/admin/connexion"); await submitLogin(page, admin.email, admin.password); await expectAdminHome(page);
  await page.goto("/admin/galerie/nouvelle");
  await page.getByLabel("Image").setInputFiles({ name: "attaque.svg", mimeType: "image/svg+xml", buffer: Buffer.from("<svg></svg>") });
  await expect(page.getByRole("status").filter({ hasText: "Choisissez une image fixe JPEG, PNG ou WebP." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ajouter la photo" })).toBeDisabled();
});

test("server validation links recoverable field errors and preserves entered values", async ({ page, browserName }) => {
  test.skip(browserName === "webkit", "Playwright WebKit has no Canvas WebP encoder");
  const admin = authFixture("ADMIN"); await page.goto("/admin/connexion"); await submitLogin(page, admin.email, admin.password); await expectAdminHome(page); await page.goto("/admin/galerie/nouvelle");
  await page.getByLabel("Image").setInputFiles(resolve("public/images/nails-signature.jpg")); await expect(page.getByRole("status").filter({ hasText: "Image prête" })).toBeVisible(); await page.getByLabel("Texte alternatif").fill("Valeur conservée"); await page.getByLabel("Lien HTTPS, facultatif").fill("http://example.com"); await page.getByLabel("Ordre d’affichage").fill("-1"); await page.getByRole("button", { name: "Ajouter la photo" }).click();
  await expect(page).toHaveURL(/\/admin\/galerie\/nouvelle$/); await expect(page.getByLabel("Lien HTTPS, facultatif")).toHaveAttribute("aria-invalid", "true"); await expect(page.getByLabel("Ordre d’affichage")).toHaveAttribute("aria-invalid", "true"); await expect(page.getByText("Saisissez une URL HTTPS valide.")).toBeVisible(); await expect(page.getByText("L’ordre doit être un entier positif ou nul.")).toBeVisible(); await expect(page.getByLabel("Texte alternatif")).toHaveValue("Valeur conservée");
});

test("an abandoned create reservation is exposed for repair and converges without an object", async ({ page }) => {
  const runtime = getLocalSupabaseRuntime(); const admin = authFixture("ADMIN");
  const client = createGalleryClient(runtime.apiUrl, runtime.publishableKey);
  expect((await client.auth.signInWithPassword({ email: admin.email, password: admin.password })).error).toBeNull();
  const operationId = crypto.randomUUID(); const path = `photos/${crypto.randomUUID()}.webp`;
  const row = galleryFixture({
    storage_path: path, pending_storage_path: path, alt_text: `Réservation abandonnée ${Date.now()}`,
    file_state: "pending", operation_kind: "create", operation_id: operationId,
    pending_width: 1200, pending_height: 800, pending_size_bytes: 128_000,
    operation_started_at: new Date(Date.now() - 11 * 60_000).toISOString(),
  });
  expect((await client.from("photos_galerie").insert(row)).error).toBeNull();
  try {
    await page.goto("/admin/connexion"); await submitLogin(page, admin.email, admin.password); await expectAdminHome(page);
    await page.goto("/admin/galerie");
    const item = page.locator(".admin-gallery-item", { hasText: row.alt_text });
    await expect(item.getByText("À réparer", { exact: true })).toBeVisible();
    await item.getByRole("button", { name: "Réparer" }).click();
    await expect(item).toHaveCount(0);
    expect((await client.from("photos_galerie").select("id").eq("id", row.id).maybeSingle()).data).toBeNull();
  } finally { await removeGalleryFixtures(client, [row]); }
});

test("the administrative entry reconciles pending operations at the exact ten-minute boundary", async ({ page }) => {
  test.skip(Boolean(process.env.KN_GALLERY_E2E_SCENARIO), "Real-data suite");
  const runtime = getLocalSupabaseRuntime(); const admin = authFixture("ADMIN"); const client = createGalleryClient(runtime.apiUrl, runtime.publishableKey);
  expect((await client.auth.signInWithPassword({ email: admin.email, password: admin.password })).error).toBeNull();
  await page.goto("/admin/connexion"); await submitLogin(page, admin.email, admin.password); await expectAdminHome(page);
  const objectBytes = losslessWebp(10, 20); const now = Date.now();
  const pendingRow = (ageSeconds: number, label: string) => {
    const path = `photos/${crypto.randomUUID()}.webp`;
    return galleryFixture({ storage_path: path, pending_storage_path: path, alt_text: label, file_state: "pending", operation_kind: "create", operation_id: crypto.randomUUID(), pending_width: 10, pending_height: 20, pending_size_bytes: objectBytes.byteLength, operation_started_at: new Date(now - ageSeconds * 1_000).toISOString() });
  };
  const younger = pendingRow(599, `Pending 9 min 59 s ${now}`); const boundary = pendingRow(600, `Pending 10 min ${now}`); const older = pendingRow(660, `Pending 11 min ${now}`); const control = galleryFixture({ alt_text: `Contrôle ready ${now}`, actif: false }); const rows = [younger, boundary, older, control];
  await insertGalleryFixtures(client, rows);
  expect((await client.storage.from("galerie").upload(boundary.pending_storage_path!, objectBytes, { contentType: "image/webp", upsert: false })).error).toBeNull();
  try {
    await page.goto("/admin/galerie");
    await expect.poll(async () => {
      const result = await client.from("photos_galerie").select("id,file_state,repair_code").in("id", rows.map(({ id }) => id));
      return Object.fromEntries((result.data ?? []).map((row) => [row.id, [row.file_state, row.repair_code]]));
    }).toMatchObject({
      [younger.id]: ["pending", null],
      [boundary.id]: ["repair_required", "stale_pending_object_present"],
      [older.id]: ["repair_required", "stale_pending_no_object"],
      [control.id]: ["ready", null],
    });
    await expect(page.locator(".admin-gallery-item", { hasText: younger.alt_text }).getByText("En attente", { exact: true })).toBeVisible();
    await expect(page.locator(".admin-gallery-item", { hasText: boundary.alt_text }).getByText("À réparer", { exact: true })).toBeVisible();
    await expect(page.locator(".admin-gallery-item", { hasText: older.alt_text }).getByText("À réparer", { exact: true })).toBeVisible();
    expect((await client.storage.from("galerie").info(boundary.pending_storage_path!)).error).toBeNull();
  } finally { await removeGalleryFixtures(client, rows); }
});
