import { expect, test } from "@playwright/test";

const CANONICAL_ORIGIN = "https://knailsbeauty.fr";
const REDIRECT_PROBE = "/contact?source=production-smoke&campaign=canonical";

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`missing_smoke_environment:${name}`);
  return value;
}

function productionOrigin(): string {
  const value = requiredEnvironment("PLAYWRIGHT_BASE_URL");
  if (value !== CANONICAL_ORIGIN) throw new Error("production_smoke_requires_canonical_origin");
  return value;
}

test("01 HTTPS et toutes les origines convergent définitivement sans perte", async ({ request }) => {
  productionOrigin();
  const technicalOrigin = requiredEnvironment("KN_PRODUCTION_TECHNICAL_ORIGIN");
  const sources = [
    "http://knailsbeauty.fr",
    "http://www.knailsbeauty.fr",
    "https://www.knailsbeauty.fr",
    "http://knailsbeauty.com",
    "https://knailsbeauty.com",
    "http://www.knailsbeauty.com",
    "https://www.knailsbeauty.com",
    technicalOrigin.replace("https://", "http://"),
    technicalOrigin,
  ];
  const canonical = await request.get(`${CANONICAL_ORIGIN}${REDIRECT_PROBE}`, { maxRedirects: 0 });
  expect(canonical.ok()).toBe(true);
  expect(canonical.url()).toBe(`${CANONICAL_ORIGIN}${REDIRECT_PROBE}`);
  for (const source of sources) {
    const response = await request.get(`${source}${REDIRECT_PROBE}`, { maxRedirects: 0 });
    expect([301, 308], source).toContain(response.status());
    expect(response.headers().location, source).toBe(`${CANONICAL_ORIGIN}${REDIRECT_PROBE}`);
  }
});

test("02 Services répond et expose son parcours public", async ({ page }) => {
  const response = await page.goto("/services");
  expect(response?.ok()).toBe(true);
  await expect(page.getByRole("heading", { level: 1, name: "Nos Prestations" })).toBeVisible();
});

test("03 Galerie répond et expose son parcours public", async ({ page }) => {
  const response = await page.goto("/galerie");
  expect(response?.ok()).toBe(true);
  await expect(page.getByRole("heading", { level: 1, name: "L'Art Sublimé" })).toBeVisible();
});

test("04 Contact répond et expose le formulaire réel", async ({ page }) => {
  const response = await page.goto("/contact");
  expect(response?.ok()).toBe(true);
  await expect(page.getByRole("button", { name: "Envoyer le message" })).toBeVisible();
});

test("05 une soumission Contact contrôlée reçoit un succès réel", async ({ page }) => {
  expect(process.env.KN_PRODUCTION_CONTACT_SMOKE_AUTHORIZED).toBe("true");
  await page.goto("/contact");
  await page.getByLabel("Prénom & nom").fill("Contrôle lancement K'nails");
  await page.getByLabel("E-mail").fill(requiredEnvironment("KN_PRODUCTION_CONTACT_SMOKE_EMAIL"));
  await page.getByLabel("Message").fill(`Contrôle de lancement autorisé ${requiredEnvironment("KN_PRODUCTION_EXPECTED_SHA").slice(0, 12)}`);
  await page.getByRole("button", { name: "Envoyer le message" }).click();
  await expect(page.getByRole("status")).toContainText("Merci, votre message a bien été envoyé.", { timeout: 30_000 });
});

test("06 la connexion administrateur réelle réussit puis la session est fermée", async ({ page }) => {
  await page.goto("/admin/connexion");
  await page.getByLabel("Adresse e-mail").fill(requiredEnvironment("KN_PRODUCTION_ADMIN_EMAIL"));
  await page.getByLabel("Mot de passe").fill(requiredEnvironment("KN_PRODUCTION_ADMIN_PASSWORD"));
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { level: 1, name: "Administration" })).toBeVisible();
  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await expect(page).toHaveURL(/\/admin\/connexion/);
});

test("07 une prestation publique active est réellement livrée", async ({ page }) => {
  await page.goto("/services");
  await expect(page.locator(".service-card").first()).toBeVisible();
  expect(await page.locator(".service-card").count()).toBeGreaterThan(0);
});

test("08 une image publique de galerie est réellement livrée", async ({ page, request }) => {
  await page.goto("/galerie");
  const image = page.locator(".gallery-card img").first();
  await expect(image).toBeVisible();
  const source = await image.getAttribute("src");
  expect(source).toBeTruthy();
  const response = await request.get(new URL(source!, CANONICAL_ORIGIN).href);
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toMatch(/^image\//);
});

test("09 le sitemap contient exactement les trois URLs publiques", async ({ request }) => {
  const response = await request.get("/sitemap.xml");
  expect(response.ok()).toBe(true);
  const body = await response.text();
  expect(body.match(/<loc>/g)).toHaveLength(3);
  for (const path of ["/services", "/galerie", "/contact"]) {
    expect(body).toContain(`<loc>${CANONICAL_ORIGIN}${path}</loc>`);
  }
  expect(body).not.toContain("/admin");
});

test("10 robots autorise le public, refuse admin et référence le sitemap", async ({ request }) => {
  const response = await request.get("/robots.txt");
  expect(response.ok()).toBe(true);
  const body = await response.text();
  expect(body).toContain("Allow: /");
  expect(body).toContain("Disallow: /admin");
  expect(body).toContain(`Sitemap: ${CANONICAL_ORIGIN}/sitemap.xml`);
});

test("11 l'administration refuse l'anonyme et reste noindex", async ({ page }) => {
  const response = await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/connexion/);
  expect(response?.headers()["cache-control"]).toContain("private");
  expect(response?.headers()["cache-control"]).toContain("no-store");
  const robots = await page.locator('meta[name="robots"]').getAttribute("content");
  expect(robots).toContain("noindex");
  expect(robots).toContain("nofollow");
});
