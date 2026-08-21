import type { MetadataRoute } from "next";
import {
  CANONICAL_ORIGIN,
  resolveDeploymentContext,
  type NetlifyDeploymentContext,
} from "../lib/site/deployment-context.ts";
import { PAGE_SEO } from "../lib/site/metadata.ts";

export function buildSitemap(deployment: NetlifyDeploymentContext): MetadataRoute.Sitemap {
  if (!deployment.isIndexable) return [];

  return PAGE_SEO.map(({ path }) => ({
    url: `${CANONICAL_ORIGIN}${path}`,
    changeFrequency: "monthly" as const,
    priority: path === "/services" ? 1 : 0.8,
  }));
}

export default function sitemap(): MetadataRoute.Sitemap {
  return buildSitemap(resolveDeploymentContext());
}
