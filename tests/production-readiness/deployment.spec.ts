import { expect, test } from "@playwright/test";

const PUBLIC_ROUTES = ["/services", "/galerie", "/contact"] as const;
const CANONICAL_ORIGIN = "https://knailsbeauty.fr";
const TECHNICAL_ORIGIN = "https://friendly-cactus-227b77.netlify.app";
const REDIRECT_SOURCE_ORIGINS = [
  "http://knailsbeauty.fr",
  "http://www.knailsbeauty.fr",
  "https://www.knailsbeauty.fr",
  "http://knailsbeauty.com",
  "https://knailsbeauty.com",
  "http://www.knailsbeauty.com",
  "https://www.knailsbeauty.com",
  TECHNICAL_ORIGIN.replace("https://", "http://"),
  TECHNICAL_ORIGIN,
] as const;
const REDIRECT_PROBE = "/contact?source=deployment-check&campaign=canonical";

function configuredOrigin(): URL {
  const raw = process.env.PLAYWRIGHT_BASE_URL;
  if (!raw) throw new Error("PLAYWRIGHT_BASE_URL is required for deployment verification");
  return new URL(raw);
}

test("la cible hébergée présente un certificat accepté et sert les trois pages publiques", async ({ page }) => {
  const origin = configuredOrigin();
  if (origin.hostname !== "127.0.0.1" && origin.hostname !== "localhost" && origin.hostname !== "[::1]") {
    expect(origin.protocol).toBe("https:");
  }
  for (const route of PUBLIC_ROUTES) {
    const response = await page.goto(route);
    expect(response?.ok(), route).toBe(true);
    await expect(page.locator("main")).toBeVisible();
  }
});

test("/admin refuse une session absente et toutes ses réponses restent privées", async ({ page }) => {
  const response = await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/connexion(?:\?.*)?$/);
  const cacheControl = response?.headers()["cache-control"] ?? "";
  expect(cacheControl).toContain("private");
  expect(cacheControl).toContain("no-store");
  await expect(page.locator(".admin-shell, .admin-welcome-card")).toHaveCount(0);
});

test("le domaine canonique HTTPS présente un certificat valide et ne redirige pas", async ({ request }) => {
  const response = await request.get(`${CANONICAL_ORIGIN}${REDIRECT_PROBE}`, { maxRedirects: 0 });
  expect(response.ok()).toBe(true);
  expect(response.url()).toBe(`${CANONICAL_ORIGIN}${REDIRECT_PROBE}`);
});

for (const sourceOrigin of REDIRECT_SOURCE_ORIGINS) {
  test(`${sourceOrigin} redirige définitivement vers le domaine canonique sans perdre chemin ni query`, async ({ request }) => {
    const expectedDestination = `${CANONICAL_ORIGIN}${REDIRECT_PROBE}`;
    const firstResponse = await request.get(`${sourceOrigin}${REDIRECT_PROBE}`, { maxRedirects: 0 });

    expect([301, 308]).toContain(firstResponse.status());
    expect(firstResponse.headers().location).toBe(expectedDestination);

    const finalResponse = await request.get(`${sourceOrigin}${REDIRECT_PROBE}`, { maxRedirects: 8 });
    expect(finalResponse.ok()).toBe(true);
    expect(finalResponse.url()).toBe(expectedDestination);
  });
}
