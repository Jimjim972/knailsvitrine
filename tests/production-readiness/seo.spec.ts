import { expect, test, type Page } from "@playwright/test";

const CANONICAL_ORIGIN = "https://knailsbeauty.fr";
const PUBLIC_PAGES = [
  {
    path: "/services",
    title: "Prestations beauté et onglerie | K'nails Beauty Institut",
    description: "Découvrez les prestations de K'nails Beauty Institut : onglerie, manucure, soins du corps, esthétique et soins du visage.",
  },
  {
    path: "/galerie",
    title: "Galerie des réalisations | K'nails Beauty Institut",
    description: "Explorez les réalisations actives de K'nails Beauty Institut et l'univers de l'institut à Saint-Joseph en Martinique.",
  },
  {
    path: "/contact",
    title: "Contact et rendez-vous | K'nails Beauty Institut",
    description: "Contactez K'nails Beauty Institut à Saint-Joseph en Martinique et consultez l'adresse ainsi que les horaires d'ouverture.",
  },
] as const;

function configuredOrigin(): URL {
  const raw = process.env.PLAYWRIGHT_BASE_URL;
  if (!raw) throw new Error("PLAYWRIGHT_BASE_URL is required for SEO verification");
  return new URL(raw);
}

function expectedProfile(): "production" | "preview" {
  if (process.env.KN_SEO_PROFILE === "production" || process.env.KN_SEO_PROFILE === "preview") {
    return process.env.KN_SEO_PROFILE;
  }
  return configuredOrigin().hostname.includes("deploy-preview-") ? "preview" : "production";
}

async function metaContent(page: Page, selector: string): Promise<string | null> {
  return page.locator(selector).getAttribute("content");
}

for (const expected of PUBLIC_PAGES) {
  test(`${expected.path} expose un HTML initial canonique et Open Graph cohérent`, async ({ page }) => {
    const response = await page.goto(expected.path);
    expect(response?.ok()).toBe(true);
    await expect(page).toHaveTitle(expected.title);
    expect(await metaContent(page, 'meta[name="description"]')).toBe(expected.description);
    expect(await page.locator('link[rel="canonical"]').getAttribute("href"))
      .toBe(`${CANONICAL_ORIGIN}${expected.path}`);
    expect(await metaContent(page, 'meta[property="og:title"]')).toBe(expected.title.replace(" | K'nails Beauty Institut", ""));
    expect(await metaContent(page, 'meta[property="og:description"]')).toBe(expected.description);
    expect(await metaContent(page, 'meta[property="og:url"]')).toBe(`${CANONICAL_ORIGIN}${expected.path}`);
    expect(await metaContent(page, 'meta[property="og:image"]')).toBe(`${CANONICAL_ORIGIN}/opengraph-image.png`);
    expect(await metaContent(page, 'meta[property="og:image:alt"]')).toBe("K'nails Beauty Institut — élégance, beauté et bien-être en Martinique");

    const robots = await metaContent(page, 'meta[name="robots"]');
    if (expectedProfile() === "production") {
      expect(robots).toContain("index");
      expect(robots).toContain("follow");
      expect(robots).not.toContain("noindex");
    } else {
      expect(robots).toContain("noindex");
      expect(robots).toContain("nofollow");
    }
  });
}

test("robots et sitemap suivent le profil fermé du contexte", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  const sitemap = await request.get("/sitemap.xml");
  expect(robots.ok()).toBe(true);
  expect(sitemap.ok()).toBe(true);
  const robotsText = await robots.text();
  const sitemapText = await sitemap.text();

  if (expectedProfile() === "production") {
    expect(robotsText).toContain("Allow: /");
    expect(robotsText).toContain("Disallow: /admin");
    expect(robotsText).toContain(`Sitemap: ${CANONICAL_ORIGIN}/sitemap.xml`);
    for (const { path } of PUBLIC_PAGES) expect(sitemapText).toContain(`<loc>${CANONICAL_ORIGIN}${path}</loc>`);
    expect((sitemapText.match(/<loc>/g) ?? []).length).toBe(3);
  } else {
    expect(robotsText).toContain("Disallow: /");
    expect(robotsText).not.toContain("Sitemap:");
    expect(sitemapText).not.toContain("<loc>");
  }
  expect(sitemapText).not.toContain("/admin");
  expect(sitemapText).not.toContain("netlify.app");
});

test("connexion et administration restent noindex, nofollow dans tous les contextes", async ({ page }) => {
  await page.goto("/admin/connexion");
  const robots = await metaContent(page, 'meta[name="robots"]');
  expect(robots).toContain("noindex");
  expect(robots).toContain("nofollow");
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
});

test("le JSON-LD local utilise uniquement les coordonnées confirmées et visibles", async ({ page }) => {
  await page.goto("/contact");
  const nodes = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(nodes).toHaveLength(1);
  const payload = JSON.parse(nodes[0]) as Record<string, unknown>;
  expect(payload["@context"]).toBe("https://schema.org");
  expect(payload["@type"]).toBe("BeautySalon");
  expect(payload.name).toBe("K'nails Beauty Institut");
  expect(payload.url).toBe(CANONICAL_ORIGIN);
  expect(payload).not.toHaveProperty("telephone");
  expect(payload).not.toHaveProperty("sameAs");
  expect(payload).not.toHaveProperty("image");
  await expect(page.getByRole("main").getByText("N°371, Chemin La Hubert, Saint-Joseph 97212, Martinique"))
    .toBeVisible();
  await expect(page.getByText("+33 1 23 45 67 89")).toHaveCount(0);
});

test("le validateur public Schema.org retourne un graphe sans erreur", async ({ page }) => {
  const target = configuredOrigin();
  test.skip(["127.0.0.1", "localhost", "[::1]"].includes(target.hostname),
    "Schema.org ne peut pas récupérer une cible loopback");
  const validationUrl = "https://validator.schema.org/?hl=en-US#url=" +
    encodeURIComponent(new URL("/contact", target).href);

  try {
    const response = await page.goto(validationUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
    if (!response?.ok()) throw new Error("validator_http_unavailable");
    await expect(page.locator("#right-busy-cell")).toBeHidden({ timeout: 30_000 });
    const result = (await page.locator("#results-cell").innerText()).replaceAll(/\s+/g, " ");
    if (!result || /unable|could not|failed to fetch|impossible|indisponible/i.test(result)) {
      throw new Error("schema_org_validator_blocked");
    }
    expect(result).not.toMatch(/no items detected|aucun élément détecté/i);
    expect(result).toMatch(/0\s+errors?|0\s+erreurs?/i);
  } catch (error) {
    throw new Error("schema_org_validator_blocked", { cause: error });
  }
});
