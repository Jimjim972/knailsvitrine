import { pathToFileURL } from "node:url";

const CANONICAL_ORIGIN = "https://knailsbeauty.fr";
const PROFILES = new Set(["local", "preview", "production"]);
const PUBLIC_PAGES = [
  {
    path: "/services",
    title: "Prestations beauté et onglerie | K'nails Beauty Institut",
    openGraphTitle: "Prestations beauté et onglerie",
    description: "Découvrez les prestations de K'nails Beauty Institut : onglerie, manucure, soins du corps, esthétique et soins du visage.",
  },
  {
    path: "/galerie",
    title: "Galerie des réalisations | K'nails Beauty Institut",
    openGraphTitle: "Galerie des réalisations",
    description: "Explorez les réalisations actives de K'nails Beauty Institut et l'univers de l'institut à Saint-Joseph en Martinique.",
  },
  {
    path: "/contact",
    title: "Contact et rendez-vous | K'nails Beauty Institut",
    openGraphTitle: "Contact et rendez-vous",
    description: "Contactez K'nails Beauty Institut à Saint-Joseph en Martinique et consultez l'adresse ainsi que les horaires d'ouverture.",
  },
];

function result(checkId, status, summary) {
  return { checkId, status, summary };
}

function parseArguments(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith("--") || !argv[index + 1] || argv[index + 1].startsWith("--")) {
      throw new Error("invalid_seo_arguments");
    }
    values.set(argument.slice(2), argv[++index]);
  }
  return values;
}

function validatedBaseUrl(profile, rawUrl) {
  const url = new URL(rawUrl);
  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("invalid_seo_base_url");
  }
  const loopback = new Set(["127.0.0.1", "localhost", "[::1]"]);
  if (profile === "local") {
    if (url.protocol !== "http:" || !loopback.has(url.hostname)) throw new Error("local_seo_target_invalid");
  } else if (url.protocol !== "https:") {
    throw new Error("hosted_seo_target_requires_https");
  }
  if (profile === "production" && url.origin !== CANONICAL_ORIGIN) {
    throw new Error("production_seo_target_not_canonical");
  }
  if (profile === "preview" && url.origin === CANONICAL_ORIGIN) {
    throw new Error("preview_seo_target_is_production");
  }
  return url;
}

function decodeHtml(value) {
  return String(value)
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function attribute(tag, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = tag.match(new RegExp(`\\s${escaped}=["']([^"']*)["']`, "i"));
  return match ? decodeHtml(match[1]) : null;
}

function tags(html, name) {
  return html.match(new RegExp(`<${name}\\b[^>]*>`, "gi")) ?? [];
}

function metaContent(html, key, value) {
  const tag = tags(html, "meta").find((candidate) => attribute(candidate, key) === value);
  return tag ? attribute(tag, "content") : null;
}

function linkHref(html, rel) {
  const tag = tags(html, "link").find((candidate) => attribute(candidate, "rel") === rel);
  return tag ? attribute(tag, "href") : null;
}

function titleText(html) {
  const match = html.match(/<title>([\s\S]*?)<\/title>/i);
  return match ? decodeHtml(match[1]) : null;
}

function structuredData(html) {
  const matches = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  return matches.map((match) => JSON.parse(decodeHtml(match[1])));
}

async function get(url) {
  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(20_000),
    headers: { "User-Agent": "KnailsProductionReadiness/1.0" },
  });
  return { response, body: await response.text() };
}

function publicPageChecks(expected, html, indexable) {
  const canonical = `${CANONICAL_ORIGIN}${expected.path}`;
  const robots = metaContent(html, "name", "robots") ?? "";
  const checks = [
    ["title", titleText(html) === expected.title],
    ["description", metaContent(html, "name", "description") === expected.description],
    ["canonical", linkHref(html, "canonical") === canonical],
    ["og_title", metaContent(html, "property", "og:title") === expected.openGraphTitle],
    ["og_description", metaContent(html, "property", "og:description") === expected.description],
    ["og_url", metaContent(html, "property", "og:url") === canonical],
    ["og_image", metaContent(html, "property", "og:image") === `${CANONICAL_ORIGIN}/opengraph-image.png`],
    ["og_image_alt", metaContent(html, "property", "og:image:alt") === "K'nails Beauty Institut — élégance, beauté et bien-être en Martinique"],
    ["robots", indexable
      ? /(?:^|,\s*)index(?:,|$)/.test(robots) && /(?:^|,\s*)follow(?:,|$)/.test(robots) && !robots.includes("noindex")
      : robots.includes("noindex") && robots.includes("nofollow")],
  ];
  return checks.map(([name, passed]) => result(
    `seo.page.${expected.path.slice(1)}.${name}`,
    passed ? "passed" : "failed",
    passed ? `${expected.path} ${name} is valid` : `${expected.path} ${name} is invalid`,
  ));
}

function jsonLdChecks(payloads) {
  const payload = payloads.length === 1 ? payloads[0] : null;
  const address = payload?.address;
  const openingHours = payload?.openingHoursSpecification;
  const valid = payload !== null
    && payload?.["@context"] === "https://schema.org"
    && payload?.["@type"] === "BeautySalon"
    && payload?.name === "K'nails Beauty Institut"
    && payload?.url === CANONICAL_ORIGIN
    && address?.streetAddress === "N°371, Chemin La Hubert"
    && address?.addressLocality === "Saint-Joseph"
    && address?.postalCode === "97212"
    && address?.addressRegion === "Martinique"
    && address?.addressCountry === "FR"
    && Array.isArray(openingHours) && openingHours.length === 3
    && !("telephone" in payload) && !("sameAs" in payload) && !("image" in payload);
  return result(
    "seo.structured_data.local",
    valid ? "passed" : "failed",
    valid ? "BeautySalon JSON-LD uses only confirmed visible data" : "BeautySalon JSON-LD is absent, duplicated or inconsistent",
  );
}

async function validateWithSchemaOrg(targetUrl) {
  let browser;
  try {
    const { chromium } = await import("@playwright/test");
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const validatorUrl = "https://validator.schema.org/?hl=en-US#url=" + encodeURIComponent(targetUrl);
    const response = await page.goto(validatorUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
    if (!response?.ok()) return result("seo.structured_data.schema_org", "blocked", "Schema.org validator is unavailable");
    await page.waitForFunction(
      () => (document.querySelector("#results-cell")?.textContent?.trim().length ?? 0) > 0,
      undefined,
      { timeout: 30_000 },
    );
    const output = (await page.locator("#results-cell").innerText()).replaceAll(/\s+/g, " ");
    if (!output || /unable|could not|failed to fetch|impossible|indisponible/i.test(output)) {
      return result("seo.structured_data.schema_org", "blocked", "Schema.org validator did not return a verifiable result");
    }
    if (/no items detected|aucun élément détecté/i.test(output) || /[1-9][0-9]*\s+(?:errors?|erreurs?)/i.test(output)) {
      return result("seo.structured_data.schema_org", "failed", "Schema.org validator reported missing data or errors");
    }
    return /0\s+(?:errors?|erreurs?)/i.test(output)
      ? result("seo.structured_data.schema_org", "passed", "Schema.org validator reports zero errors")
      : result("seo.structured_data.schema_org", "blocked", "Schema.org validator result could not be classified");
  } catch {
    return result("seo.structured_data.schema_org", "blocked", "Schema.org validator could not be reached or automated");
  } finally {
    await browser?.close();
  }
}

export async function checkSeo({ profile, baseUrl }) {
  if (!PROFILES.has(profile)) throw new Error("invalid_seo_profile");
  const target = validatedBaseUrl(profile, baseUrl);
  const indexable = profile !== "preview";
  const results = [];
  let contactHtml = "";

  for (const expected of PUBLIC_PAGES) {
    const { response, body } = await get(new URL(expected.path, target));
    results.push(result(
      `seo.page.${expected.path.slice(1)}.http`,
      response.ok ? "passed" : "failed",
      response.ok ? `${expected.path} returns a successful response` : `${expected.path} did not return a successful response`,
    ));
    results.push(...publicPageChecks(expected, body, indexable));
    if (expected.path === "/contact") contactHtml = body;
    if (profile === "preview") {
      const xRobotsTag = response.headers.get("x-robots-tag") ?? "";
      results.push(result(
        `seo.page.${expected.path.slice(1)}.x_robots_tag`,
        xRobotsTag.toLowerCase().includes("noindex") ? "passed" : "failed",
        xRobotsTag.toLowerCase().includes("noindex")
          ? `${expected.path} has Netlify noindex defense`
          : `${expected.path} is missing Netlify noindex defense`,
      ));
    }
  }

  let payloads = [];
  try {
    payloads = structuredData(contactHtml);
  } catch {
    payloads = [];
  }
  results.push(jsonLdChecks(payloads));

  const { response: robotsResponse, body: robots } = await get(new URL("/robots.txt", target));
  const { response: sitemapResponse, body: sitemap } = await get(new URL("/sitemap.xml", target));
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => decodeHtml(match[1]));
  const expectedLocs = PUBLIC_PAGES.map(({ path }) => `${CANONICAL_ORIGIN}${path}`);
  const robotsValid = indexable
    ? robots.includes("Allow: /") && robots.includes("Disallow: /admin") && robots.includes(`Sitemap: ${CANONICAL_ORIGIN}/sitemap.xml`)
    : robots.includes("Disallow: /") && !robots.includes("Sitemap:");
  const sitemapValid = indexable
    ? JSON.stringify(locs) === JSON.stringify(expectedLocs)
    : locs.length === 0;
  results.push(result("seo.robots", robotsResponse.ok && robotsValid ? "passed" : "failed",
    robotsValid ? "robots.txt matches the deployment profile" : "robots.txt violates the deployment profile"));
  results.push(result("seo.sitemap", sitemapResponse.ok && sitemapValid ? "passed" : "failed",
    sitemapValid ? "sitemap.xml contains the exact allowed URL set" : "sitemap.xml contains a missing or forbidden URL"));

  const { response: adminResponse, body: adminHtml } = await get(new URL("/admin/connexion", target));
  const adminRobots = metaContent(adminHtml, "name", "robots") ?? "";
  const adminValid = adminResponse.ok && adminRobots.includes("noindex") && adminRobots.includes("nofollow")
    && !linkHref(adminHtml, "canonical");
  results.push(result("seo.admin.noindex", adminValid ? "passed" : "failed",
    adminValid ? "Administration is noindex, nofollow without canonical" : "Administration indexing metadata is unsafe"));

  if (profile !== "local") {
    results.push(await validateWithSchemaOrg(new URL("/contact", target).href));
  }
  return results;
}

async function main() {
  let results;
  try {
    const argumentsMap = parseArguments(process.argv.slice(2));
    const profile = argumentsMap.get("profile") ?? process.env.KN_SEO_PROFILE ?? "local";
    const baseUrl = argumentsMap.get("base-url") ?? process.env.PLAYWRIGHT_BASE_URL;
    if (!baseUrl) throw new Error("seo_base_url_missing");
    results = await checkSeo({ profile, baseUrl });
  } catch {
    results = [result("seo.orchestrator", "failed", "SEO verification could not start")];
  }
  for (const entry of results) process.stdout.write(`${JSON.stringify(entry)}\n`);
  process.exitCode = results.some(({ status }) => status !== "passed") ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
