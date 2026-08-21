import assert from "node:assert/strict";
import test from "node:test";
import { buildRobots } from "../../../app/robots.ts";
import { buildSitemap } from "../../../app/sitemap.ts";
import {
  PAGE_SEO,
  SOCIAL_IMAGE,
  buildPageMetadata,
  buildRootMetadata,
} from "../../../lib/site/metadata.ts";
import {
  CANONICAL_ORIGIN,
  resolveDeploymentContext,
} from "../../../lib/site/deployment-context.ts";

const SHA = "a".repeat(40);
const production = resolveDeploymentContext({
  CONTEXT: "production",
  URL: CANONICAL_ORIGIN,
  DEPLOY_PRIME_URL: "https://main--friendly-cactus-227b77.netlify.app",
  COMMIT_REF: SHA,
});
const preview = resolveDeploymentContext({
  CONTEXT: "deploy-preview",
  URL: CANONICAL_ORIGIN,
  DEPLOY_PRIME_URL: "https://deploy-preview-1--friendly-cactus-227b77.netlify.app",
  COMMIT_REF: SHA,
});
const local = resolveDeploymentContext({});

function robotsDirectives(value: unknown): { index?: boolean; follow?: boolean } {
  assert.equal(typeof value, "object");
  assert.notEqual(value, null);
  return value as { index?: boolean; follow?: boolean };
}

test("l'origine SEO reste canonique quel que soit l'hôte de déploiement", () => {
  assert.equal(CANONICAL_ORIGIN, "https://knailsbeauty.fr");
  assert.equal(production.isIndexable, true);
  assert.equal(preview.isIndexable, false);
  assert.equal(local.isIndexable, false);

  for (const deployment of [production, preview, local]) {
    const metadata = buildRootMetadata(deployment);
    assert.equal(new URL(String(metadata.metadataBase)).href, `${CANONICAL_ORIGIN}/`);
  }
});

test("les trois pages possèdent titres, descriptions, canonicals et Open Graph uniques", () => {
  const titles = new Set<string>();
  const descriptions = new Set<string>();
  const canonicals = new Set<string>();

  for (const record of PAGE_SEO) {
    const metadata = buildPageMetadata(record.path, production);
    assert.equal(metadata.title, record.title);
    assert.equal(metadata.description, record.description);
    assert.equal(metadata.alternates?.canonical, `${CANONICAL_ORIGIN}${record.path}`);
    assert.equal(metadata.openGraph?.title, record.title);
    assert.equal(metadata.openGraph?.description, record.description);
    assert.equal(metadata.openGraph?.url, `${CANONICAL_ORIGIN}${record.path}`);
    assert.equal(metadata.openGraph?.locale, "fr_FR");
    assert.equal(metadata.openGraph?.siteName, "K'nails Beauty Institut");
    assert.deepEqual(metadata.openGraph?.images, [SOCIAL_IMAGE]);
    titles.add(record.title);
    descriptions.add(record.description);
    canonicals.add(String(metadata.alternates?.canonical));
  }

  assert.equal(PAGE_SEO.length, 3);
  assert.equal(titles.size, 3);
  assert.equal(descriptions.size, 3);
  assert.equal(canonicals.size, 3);
});

test("production indexe les pages publiques tandis que preview et local restent fermés", () => {
  for (const record of PAGE_SEO) {
    assert.deepEqual(robotsDirectives(buildPageMetadata(record.path, production).robots), {
      index: true,
      follow: true,
    });
    for (const deployment of [preview, local]) {
      assert.deepEqual(robotsDirectives(buildPageMetadata(record.path, deployment).robots), {
        index: false,
        follow: false,
        noarchive: true,
      });
    }
  }
});

test("le sitemap contient exactement les trois URLs canoniques en production et reste vide ailleurs", () => {
  assert.deepEqual(buildSitemap(production), PAGE_SEO.map(({ path }) => ({
    url: `${CANONICAL_ORIGIN}${path}`,
    changeFrequency: "monthly" as const,
    priority: path === "/services" ? 1 : 0.8,
  })));
  assert.deepEqual(buildSitemap(preview), []);
  assert.deepEqual(buildSitemap(local), []);
});

test("robots autorise le public et exclut admin uniquement sur la production canonique", () => {
  assert.deepEqual(buildRobots(production), {
    rules: { userAgent: "*", allow: "/", disallow: "/admin" },
    sitemap: `${CANONICAL_ORIGIN}/sitemap.xml`,
    host: CANONICAL_ORIGIN,
  });
  for (const deployment of [preview, local]) {
    assert.deepEqual(buildRobots(deployment), {
      rules: { userAgent: "*", disallow: "/" },
    });
  }
});
