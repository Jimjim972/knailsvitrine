import { expect, test } from "@playwright/test";
import { expectAccessibilityScans } from "../helpers/accessibility";
import { authFixture, expectAdminHome, galleryFixture, removeGalleryFixtures, submitLogin } from "./fixtures";
import { createGalleryClient, getLocalSupabaseRuntime } from "./local-supabase";

for (const width of [320, 768, 1024]) {
  test(`gallery list is accessible and responsive at ${width}px`, async ({ page }, testInfo) => {
    test.skip(Boolean(process.env.KN_GALLERY_E2E_SCENARIO), "Real-data suite");
    await page.setViewportSize({ width, height: 900 });
    const admin = authFixture("ADMIN");
    const runtime = getLocalSupabaseRuntime();
    const client = createGalleryClient(runtime.apiUrl, runtime.publishableKey);
    expect((await client.auth.signInWithPassword({ email: admin.email, password: admin.password })).error).toBeNull();
    const row = galleryFixture({ actif: false, alt_text: `Photo accessibilité ${width}` });
    expect((await client.from("photos_galerie").insert(row)).error).toBeNull();
    try {
    await page.goto("/admin/connexion");
    await submitLogin(page, admin.email, admin.password);
    await expectAdminHome(page);
    await page.goto("/admin/galerie");
    await expect(page.locator(`.admin-gallery-item[data-photo-id="${row.id}"]`)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await expect(page.getByRole("status").filter({ hasText: /photo/i })).toBeVisible();
    await expectAccessibilityScans(page, testInfo, `gallery-list-${width}`);
    for (const link of await page.locator(".admin-nav a, .admin-pagination a").all()) {
      const box = await link.boundingBox();
      if (box) { expect.soft(box.width).toBeGreaterThanOrEqual(44); expect.soft(box.height).toBeGreaterThanOrEqual(44); }
    }
    const keyboardTarget = page.locator(".admin-nav a").first();
    await keyboardTarget.focus();
    await expect(keyboardTarget).toBeFocused();
    expect(await keyboardTarget.evaluate((active) => {
      const style = getComputedStyle(active);
      return style.outlineStyle !== "none" || style.boxShadow !== "none";
    })).toBe(true);
    } finally {
      await removeGalleryFixtures(client, [row]);
    }
  });
}
