import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createServiceSuccessConsumedMarker } from "../../lib/services/success-flash";
import { createAuthFixture, deleteAuthFixture, expectAdminHome, getLocalSupabaseRuntime, submitLogin } from "./local-supabase";

test("admin creates, edits, masks, reactivates and deletes one service", async ({ page, context }) => {
  test.skip(Boolean(process.env.KN_SERVICE_E2E_SCENARIO), "Real-data suite");
  const runtime = getLocalSupabaseRuntime(); const name = `E2E prestation ${Date.now()}`;
  const admin = await createAuthFixture(runtime, "services-crud", true); test.info().annotations.push({ type: "fixture", description: admin.userId });
  const publicPage = await context.newPage();
  const expectPublicService = async (serviceName: string, visible: boolean, price?: string) => {
    await publicPage.goto("/services");
    await expect(publicPage.getByRole("heading", { name: "Esthétique & Visage", level: 2 })).toBeVisible();
    const card = publicPage.locator(".service-card", {
      has: publicPage.getByRole("heading", { name: serviceName, exact: true }),
    });
    await expect(card).toHaveCount(visible ? 1 : 0, { timeout: 5_000 });
    if (visible && price) await expect(card).toContainText(price);
  };
  await page.goto("/admin/connexion"); await submitLogin(page, admin.email, admin.password); await expectAdminHome(page);
  await page.goto("/admin/prestations/nouvelle");
  await page.getByLabel("Nom").fill(name); await page.getByLabel("Description").fill("Description E2E");
  await page.getByLabel("Catégorie").selectOption("soins_corps"); await page.getByLabel("Type de tarif").selectOption("starting_at");
  await page.getByLabel("Montant (€)").fill("45,50"); await page.getByLabel("Durée (minutes), facultative").fill("30");
  await page.getByRole("button", { name: "Créer la prestation" }).click();
  await expect(page).toHaveURL(/\/admin\/prestations$/);
  await expect(page.getByText("La prestation a été créée.")).toBeFocused();
  const item = page.locator(".admin-service-item", { hasText: name }); await expect(item).toHaveCount(1);
  const serviceId = new URL(await item.getByRole("link", { name: "Modifier" }).getAttribute("href") ?? "", "http://local").pathname.split("/").at(-2);
  expect(serviceId).toMatch(/^[0-9a-f-]{36}$/);
  await expectPublicService(name, true, "À partir de 45,50 €");
  await item.getByRole("link", { name: "Modifier" }).click(); await expect(page).toHaveURL(/\/modifier$/);
  await page.locator("input#name:visible").fill(`${name} modifiée`);
  await page.getByLabel("Description").fill("Description E2E modifiée");
  await page.getByLabel("Catégorie").selectOption("esthetique_visage");
  await page.getByLabel("Type de tarif").selectOption("quote");
  await expect(page.getByLabel("Montant (€)")).toBeDisabled();
  await expect(page.getByLabel("Montant (€)")).toHaveValue("");
  await page.getByLabel("Type de tarif").selectOption("fixed");
  await expect(page.getByLabel("Montant (€)")).toBeEnabled();
  await expect(page.getByLabel("Montant (€)")).toHaveValue("");
  await expect(page.getByLabel("Montant (€)")).toHaveAttribute("required", "");
  await page.getByLabel("Type de tarif").selectOption("quote");
  await expect(page.getByLabel("Montant (€)")).toBeDisabled();
  await page.getByLabel("Durée (minutes), facultative").fill("60");
  await page.getByLabel("Badge, facultatif").fill("Nouveau test");
  await page.locator("input#displayOrder:visible").fill("1");
  await page.getByRole("button", { name: "Enregistrer" }).click(); await expect(page).toHaveURL(/\/admin\/prestations$/);
  await expect(page.getByText("La prestation a été modifiée.")).toBeFocused();
  const updated = page.locator(".admin-service-item", { hasText: `${name} modifiée` }); await expect(updated).toHaveCount(1);
  await expect(updated).toContainText("Esthétique et visage"); await expect(updated).toContainText("Nouveau test");
  expect(await updated.getByRole("link", { name: "Modifier" }).getAttribute("href")).toContain(serviceId);
  await expectPublicService(name, false);
  await expectPublicService(`${name} modifiée`, true, "Sur devis");
  await updated.getByRole("button", { name: "Masquer" }).click(); await expect(updated.getByText("La prestation est masquée.")).toBeVisible();
  await page.reload(); const hidden = page.locator(".admin-service-item", { hasText: `${name} modifiée` }); await expect(hidden.getByText("Masquée", { exact: true })).toBeVisible();
  await expectPublicService(`${name} modifiée`, false);
  await hidden.getByRole("button", { name: "Réactiver" }).click(); await page.reload();
  const active = page.locator(".admin-service-item", { hasText: `${name} modifiée` }); await active.getByRole("button", { name: "Supprimer" }).click();
  await expectPublicService(`${name} modifiée`, true, "Sur devis");
  const dialog = page.getByRole("dialog", { name: "Supprimer la prestation ?" }); await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Annuler" })).toBeFocused();
  await page.keyboard.press("Escape"); await expect(dialog).not.toBeVisible(); await expect(active.getByRole("button", { name: "Supprimer" })).toBeFocused();
  await active.getByRole("button", { name: "Supprimer" }).click(); await dialog.getByRole("button", { name: "Annuler" }).click(); await expect(dialog).not.toBeVisible(); await expect(active.getByRole("button", { name: "Supprimer" })).toBeFocused();
  await active.getByRole("button", { name: "Supprimer" }).click(); await dialog.getByRole("button", { name: "Supprimer définitivement" }).click(); await expect(active).toHaveCount(0);
  await expect(page.getByText("La prestation a été supprimée.")).toBeFocused();
  await expectPublicService(`${name} modifiée`, false);
  const anon = createClient(runtime.apiUrl, runtime.publishableKey, { auth: { persistSession: false } });
  const { data, error } = await anon.from("prestations").select("id").eq("nom", `${name} modifiée`); expect(error).toBeNull(); expect(data).toEqual([]); await deleteAuthFixture(runtime, admin);
});

test("invalid creation retains values, links errors and performs no mutation", async ({ page }) => {
  test.skip(Boolean(process.env.KN_SERVICE_E2E_SCENARIO), "Real-data suite");
  const runtime = getLocalSupabaseRuntime(); const admin = await createAuthFixture(runtime, "services-invalid", true); await page.goto("/admin/connexion"); await submitLogin(page, admin.email, admin.password); await expectAdminHome(page); await page.goto("/admin/prestations/nouvelle");
  await page.getByLabel("Nom").fill("A"); await page.getByLabel("Description").fill("Conservée"); await page.getByLabel("Montant (€)").fill("1,005");
  await page.getByRole("button", { name: "Créer la prestation" }).click();
  await expect(page.getByLabel("Nom")).toHaveValue("A"); await expect(page.getByLabel("Description")).toHaveValue("Conservée");
  await expect(page.getByLabel("Nom")).toHaveAttribute("aria-invalid", "true"); await expect(page.getByLabel("Montant (€)")).toHaveAttribute("aria-invalid", "true"); await deleteAuthFixture(runtime, admin);
});

test("admin creates fixed and quote prices with active/order defaults", async ({ page }) => {
  test.skip(Boolean(process.env.KN_SERVICE_E2E_SCENARIO), "Real-data suite");
  const runtime = getLocalSupabaseRuntime();
  const admin = await createAuthFixture(runtime, "services-price-types", true);
  const names = {
    fixed: `Prix fixe E2E ${Date.now()}`,
    quote: `Devis E2E ${Date.now()}`,
  };
  await page.goto("/admin/connexion");
  await submitLogin(page, admin.email, admin.password);
  await expectAdminHome(page);

  for (const [priceType, name] of Object.entries(names)) {
    await page.goto("/admin/prestations/nouvelle");
    await page.getByLabel("Nom").fill(name);
    await page.getByLabel("Description").fill(`Description ${priceType}`);
    await page.getByLabel("Type de tarif").selectOption(priceType);
    if (priceType === "fixed") await page.getByLabel("Montant (€)").fill("12.34");
    else await expect(page.getByLabel("Montant (€)")).toBeDisabled();
    await page.getByRole("button", { name: "Créer la prestation" }).click();
    await expect(page).toHaveURL(/\/admin\/prestations$/);
    await expect(page.locator(".admin-service-item", { hasText: name })).toHaveCount(1);
  }

  const anon = createClient(runtime.apiUrl, runtime.publishableKey, { auth: { persistSession: false } });
  const { data, error } = await anon.from("prestations")
    .select("nom,type_prix,prix,ordre_affichage,actif")
    .in("nom", Object.values(names))
    .order("nom");
  expect(error).toBeNull();
  expect(data).toHaveLength(2);
  expect(data?.find(({ nom }) => nom === names.fixed)).toMatchObject({ type_prix: "fixed", prix: 12.34, ordre_affichage: 0, actif: true });
  expect(data?.find(({ nom }) => nom === names.quote)).toMatchObject({ type_prix: "quote", prix: null, ordre_affichage: 0, actif: true });

  for (const name of Object.values(names)) {
    const item = page.locator(".admin-service-item", { hasText: name });
    await item.getByRole("button", { name: "Supprimer" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Supprimer définitivement" }).click();
    await expect(item).toHaveCount(0);
  }
  await deleteAuthFixture(runtime, admin);
});

test("a delayed double activation exposes pending and creates one row", async ({ page }) => {
  test.skip(Boolean(process.env.KN_SERVICE_E2E_SCENARIO), "Real-data suite");
  const runtime = getLocalSupabaseRuntime(); const admin = await createAuthFixture(runtime, "services-pending", true); const name = `Pending E2E ${Date.now()}`;
  await page.goto("/admin/connexion"); await submitLogin(page, admin.email, admin.password); await expectAdminHome(page); await page.goto("/admin/prestations/nouvelle");
  await page.getByLabel("Nom").fill(name); await page.getByLabel("Description").fill("Pending"); await page.getByLabel("Montant (€)").fill("10");
  let actionPosts = 0;
  await page.route("**/*", async (route) => {
    if (route.request().method() === "POST") { actionPosts += 1; await new Promise((resolve) => setTimeout(resolve, 350)); }
    await route.continue();
  });
  const submit = page.getByRole("button", { name: "Créer la prestation" }); await submit.dblclick();
  await expect(page.getByText("Enregistrement en cours…", { exact: true })).toBeVisible({ timeout: 1000 }); await expect(page.locator("form.admin-service-form button[type=submit]:visible")).toBeDisabled();
  await expect(page).toHaveURL(/\/admin\/prestations$/); expect(actionPosts).toBe(1);
  const item = page.locator(".admin-service-item", { hasText: name }); await expect(item).toHaveCount(1); await item.getByRole("button", { name: "Supprimer" }).click(); await page.getByRole("dialog").getByRole("button", { name: "Supprimer définitivement" }).click(); await expect(item).toHaveCount(0); await deleteAuthFixture(runtime, admin);
});

test("an out-of-band deletion never produces a false success", async ({ page }) => {
  test.skip(Boolean(process.env.KN_SERVICE_E2E_SCENARIO), "Real-data suite");
  const runtime = getLocalSupabaseRuntime();
  const admin = await createAuthFixture(runtime, "services-delete-race", true);
  const concurrentAdmin = createClient(runtime.apiUrl, runtime.publishableKey, { auth: { persistSession: false } });
  const signIn = await concurrentAdmin.auth.signInWithPassword({ email: admin.email, password: admin.password });
  expect(signIn.error).toBeNull();
  const name = `Suppression concurrente ${Date.now()}`;
  const { data, error } = await concurrentAdmin.from("prestations").insert({
    nom: name,
    description: "Cible supprimée hors bande",
    categorie: "onglerie_manucure",
    prix: 20,
    type_prix: "fixed",
    ordre_affichage: 0,
    actif: true,
  }).select("id").single();
  expect(error).toBeNull();

  await page.goto("/admin/connexion");
  await submitLogin(page, admin.email, admin.password);
  await expectAdminHome(page);
  await page.goto("/admin/prestations");
  const item = page.locator(".admin-service-item", { hasText: name });
  await item.getByRole("button", { name: "Supprimer" }).click();
  const deleteResult = await concurrentAdmin.from("prestations").delete().eq("id", data?.id ?? "");
  expect(deleteResult.error).toBeNull();
  const dialog = page.getByRole("dialog", { name: "Supprimer la prestation ?" });
  await dialog.getByRole("button", { name: "Supprimer définitivement" }).click();
  await expect(dialog.getByRole("alert")).toContainText("n’existe plus");
  await expect(page.getByText("La prestation a été supprimée.")).toHaveCount(0);
  await expect(item).toHaveCount(1);
  await deleteAuthFixture(runtime, admin);
});

test("success is authenticated, browser-bound and consumed after one document", async ({ page, context }) => {
  test.skip(Boolean(process.env.KN_SERVICE_E2E_SCENARIO), "Real-data suite");
  const runtime = getLocalSupabaseRuntime();
  const admin = await createAuthFixture(runtime, "services-success-flash", true);
  const name = `Succès ponctuel ${Date.now()}`;
  const flashSecret = process.env.SERVICE_SUCCESS_FLASH_SECRET ?? "";
  expect(flashSecret.length).toBeGreaterThanOrEqual(32);
  const cookieFromHeaders = (headers: { name: string; value: string }[], cookieName: string) => headers
    .find(({ name: headerName, value }) => headerName.toLowerCase() === "set-cookie" && value.startsWith(`${cookieName}=`))
    ?.value.slice(cookieName.length + 1).split(";", 1)[0];
  const preserveSecureConsumptionOnHttpLoopback = async (consumedMarker: string) => {
    if (new URL(page.url()).protocol !== "http:") return;
    const cookieUrl = new URL(page.url());
    await context.addCookies([{
      name: "kn-service-success-consumed",
      value: consumedMarker,
      domain: cookieUrl.hostname,
      path: "/admin/prestations",
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
    }]);
  };
  try {
    await page.goto("/admin/connexion");
    await submitLogin(page, admin.email, admin.password);
    await expectAdminHome(page);

    await page.goto("/admin/prestations?success=delete");
    await expect(page.getByText("La prestation a été supprimée.")).toHaveCount(0);
    await page.goto("/admin/prestations?success=valeur-inconnue");
    await expect(page.locator(".admin-status.success")).toHaveCount(0);
    await page.evaluate(() => {
      document.cookie = "kn-service-success=delete; Path=/admin/prestations; Max-Age=60; SameSite=Lax";
      document.cookie = "kn-service-success-guard=forged-browser-guard; Path=/admin/prestations; Max-Age=60; SameSite=Lax";
    });
    await page.goto("/admin/prestations");
    await expect(page.getByText("La prestation a été supprimée.")).toHaveCount(0);

    await page.goto("/admin/prestations/nouvelle");
    await page.getByLabel("Nom").fill(name);
    await page.getByLabel("Description").fill("Vérification du succès serveur");
    await page.getByLabel("Montant (€)").fill("10.01");
    const actionResponsePromise = page.waitForResponse((response) => response.request().method() === "POST");
    await page.getByRole("button", { name: "Créer la prestation" }).click();
    const actionHeaders = await (await actionResponsePromise).headersArray();
    const issuedToken = cookieFromHeaders(actionHeaders, "kn-service-success");
    const issuedGuard = cookieFromHeaders(actionHeaders, "kn-service-success-guard");
    expect(issuedToken).toBeTruthy();
    expect(issuedGuard).toBeTruthy();
    await expect(page.getByText("La prestation a été créée.")).toBeFocused();
    const consumedAfterCreate = createServiceSuccessConsumedMarker(issuedGuard ?? "", flashSecret);
    await preserveSecureConsumptionOnHttpLoopback(consumedAfterCreate);
    await page.reload();
    await expect(page.getByText("La prestation a été créée.")).toHaveCount(0);
    await page.evaluate(({ token, guard }) => {
      document.cookie = `kn-service-success=${token}; Path=/admin/prestations; Max-Age=60; SameSite=Lax`;
      document.cookie = `kn-service-success-guard=${guard}; Path=/admin/prestations; Max-Age=60; SameSite=Lax`;
    }, { token: issuedToken ?? "", guard: issuedGuard ?? "" });
    await page.goto("/admin/prestations");
    await expect(page.getByText("La prestation a été créée.")).toHaveCount(0);

    const item = page.locator(".admin-service-item", { hasText: name });
    await item.getByRole("button", { name: "Supprimer" }).click();
    const deleteActionResponsePromise = page.waitForResponse((response) => response.request().method() === "POST");
    await page.getByRole("dialog").getByRole("button", { name: "Supprimer définitivement" }).click();
    const deleteActionHeaders = await (await deleteActionResponsePromise).headersArray();
    const deleteGuard = cookieFromHeaders(deleteActionHeaders, "kn-service-success-guard");
    expect(deleteGuard).toBeTruthy();
    await expect(page.getByText("La prestation a été supprimée.")).toBeFocused();
    const consumedAfterDelete = createServiceSuccessConsumedMarker(deleteGuard ?? "", flashSecret, {
      consumedMarker: consumedAfterCreate,
    });
    await preserveSecureConsumptionOnHttpLoopback(consumedAfterDelete);

    const cookieUrl = new URL(page.url());
    await page.context().addCookies([
      {
        name: "kn-service-success",
        value: issuedToken ?? "",
        domain: cookieUrl.hostname,
        path: "/admin/prestations",
        httpOnly: true,
        sameSite: "Lax",
        secure: cookieUrl.protocol === "https:",
      },
      {
        name: "kn-service-success-guard",
        value: issuedGuard ?? "",
        domain: cookieUrl.hostname,
        path: "/admin/prestations",
        httpOnly: true,
        sameSite: "Lax",
        secure: cookieUrl.protocol === "https:",
      },
    ]);
    await page.goto("/admin/prestations");
    await expect(page.getByText("La prestation a été créée.")).toHaveCount(0);
  } finally {
    await deleteAuthFixture(runtime, admin);
  }
});
