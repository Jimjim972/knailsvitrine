import type { MetadataRoute } from "next";
import {
  CANONICAL_ORIGIN,
  resolveDeploymentContext,
  type NetlifyDeploymentContext,
} from "../lib/site/deployment-context.ts";

export function buildRobots(deployment: NetlifyDeploymentContext): MetadataRoute.Robots {
  if (!deployment.isIndexable) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: { userAgent: "*", allow: "/", disallow: "/admin" },
    sitemap: `${CANONICAL_ORIGIN}/sitemap.xml`,
    host: CANONICAL_ORIGIN,
  };
}

export default function robots(): MetadataRoute.Robots {
  return buildRobots(resolveDeploymentContext());
}
