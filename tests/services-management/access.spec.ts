import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { authFixture, createAuthFixture, deleteAuthFixture, expectAdminHome, getLocalSupabaseRuntime, revokeSessionsForFixture, submitLogin } from "./local-supabase";

test("visitors are redirected from every services administration deep link", async ({ page }) => {
  for (const path of ["/admin/prestations", "/admin/prestations/nouvelle", "/admin/prestations/31000000-0000-4000-8000-000000000001/modifier"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/admin\/connexion\?returnTo=/);
  }
});

test("a current admin sees active and hidden services in deterministic product order", async ({ page }) => {
  test.skip(Boolean(process.env.KN_SERVICE_E2E_SCENARIO), "Real-data suite");
  const runtime = getLocalSupabaseRuntime();
  const hiddenId = randomUUID();
  const hiddenName = `Masquée accès ${Date.now()}`;
  const admin = authFixture("REVOCABLE_ADMIN");
  const adminClient = createClient(runtime.apiUrl, runtime.publishableKey, { auth: { persistSession: false } });
  expect((await adminClient.auth.signInWithPassword({ email: admin.email, password: admin.password })).error).toBeNull();
  const inserted = await adminClient.from("prestations").insert({ id: hiddenId, nom: hiddenName, description: "Contrôle d’accès", categorie: "onglerie_manucure", prix: 1, type_prix: "fixed", ordre_affichage: 99, actif: false });
  expect(inserted.error).toBeNull();
  try {
    await page.goto("/admin/connexion"); await submitLogin(page, admin.email, admin.password);
    await page.getByRole("link", { name: "Prestations" }).first().click();
    await expect(page.getByRole("heading", { name: "Prestations", exact: true })).toBeVisible();
    const names = await page.locator(".admin-service-copy h2").allTextContents();
    expect(names.slice(0, 3)).toEqual(["Manucure Russe", "Pose Vernis Semi-Permanent", "Pose Complète Gel (Chablons)"]);
    const hiddenItem = page.locator(".admin-service-item", { hasText: hiddenName });
    await expect(hiddenItem).toHaveCount(1);
    await expect(hiddenItem.getByText("Masquée", { exact: true })).toBeVisible();

    const member = authFixture("NON_ADMIN");
    const memberClient = createClient(runtime.apiUrl, runtime.publishableKey, { auth: { persistSession: false } });
    expect((await memberClient.auth.signInWithPassword({ email: member.email, password: member.password })).error).toBeNull();
    const hiddenRead = await memberClient.from("prestations").select("id").eq("id", hiddenId);
    expect(hiddenRead.error).toBeNull();
    expect(hiddenRead.data).toEqual([]);
  } finally {
    const cleanup = await adminClient.from("prestations").delete().eq("id", hiddenId);
    expect(cleanup.error).toBeNull();
  }
});

test("the dashboard exposes the real services and gallery entries", async ({ page }) => {
  test.skip(Boolean(process.env.KN_SERVICE_E2E_SCENARIO), "Real-data suite");
  const admin = authFixture("ADMIN"); await page.goto("/admin/connexion"); await submitLogin(page, admin.email, admin.password);
  await expect(page.getByRole("link", { name: "Prestations", exact: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /galerie/i }).first()).toHaveAttribute("href", "/admin/galerie");
});

test("a revoked session during editing refuses save and gives reconnect guidance", async ({ page }) => {
  test.skip(Boolean(process.env.KN_SERVICE_E2E_SCENARIO), "Real-data suite");
  const runtime = getLocalSupabaseRuntime();
  const admin = await createAuthFixture(runtime, "services-revoked-edit", true);
  try {
    await page.goto("/admin/connexion");
    await submitLogin(page, admin.email, admin.password);
    await expectAdminHome(page);
    await page.goto("/admin/prestations/31000000-0000-4000-8000-000000000001/modifier");
    const originalName = await page.getByLabel("Nom").inputValue();
    await page.getByLabel("Nom").fill(`${originalName} refusée`);
    revokeSessionsForFixture(admin.userId);
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.locator(".admin-service-form [role=alert]")).toContainText("session");
    await expect(page).toHaveURL(/\/modifier$/);
    const anon = createClient(runtime.apiUrl, runtime.publishableKey, { auth: { persistSession: false } });
    const persisted = await anon.from("prestations").select("nom").eq("id", "31000000-0000-4000-8000-000000000001").single();
    expect(persisted.error).toBeNull();
    expect(persisted.data?.nom).toBe(originalName);

    await page.goto("/admin/prestations");
    await expect(page).toHaveURL(/\/admin\/connexion\?.*session=expired/);
    await expect(page.locator("form[data-auth-status=session_expired]").getByRole("alert")).toContainText("Reconnectez-vous");
    await expect(page.locator(".admin-service-list, .admin-service-form")).toHaveCount(0);
  } finally {
    await deleteAuthFixture(runtime, admin);
  }
});

test("role removal during editing refuses save and logout history restores no command", async ({ page }) => {
  test.skip(Boolean(process.env.KN_SERVICE_E2E_SCENARIO), "Real-data suite");
  const runtime = getLocalSupabaseRuntime();
  const admin = authFixture("ROLE_REMOVABLE_ADMIN");
  await page.goto("/admin/connexion");
  await submitLogin(page, admin.email, admin.password);
  await expectAdminHome(page);
  await page.goto("/admin/prestations/31000000-0000-4000-8000-000000000002/modifier");
  const originalName = await page.getByLabel("Nom").inputValue();
  const removed = await runtime.admin.auth.admin.updateUserById(admin.userId, { app_metadata: { role: null } });
  expect(removed.error).toBeNull();
  try {
    await page.getByLabel("Nom").fill(`${originalName} refusée`);
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.locator(".admin-service-form [role=alert]")).toContainText("session");
    const anon = createClient(runtime.apiUrl, runtime.publishableKey, { auth: { persistSession: false } });
    const persisted = await anon.from("prestations").select("nom").eq("id", "31000000-0000-4000-8000-000000000002").single();
    expect(persisted.data?.nom).toBe(originalName);
  } finally {
    const restored = await runtime.admin.auth.admin.updateUserById(admin.userId, { app_metadata: { role: "admin" } });
    expect(restored.error).toBeNull();
  }

  await page.goto("/admin/prestations");
  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await expect(page).toHaveURL(/\/admin\/connexion$/);
  await page.goBack();
  await expect(page.locator(".admin-service-list, .admin-service-form, .admin-logout-button")).toHaveCount(0);
});
