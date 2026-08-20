import type { Metadata } from "next";
import {
  CANONICAL_ORIGIN,
  resolveDeploymentContext,
  type NetlifyDeploymentContext,
} from "./deployment-context.ts";

export const SITE_NAME = "K'nails Beauty Institut";

export const PAGE_SEO = [
  {
    path: "/services",
    title: "Prestations beauté et onglerie",
    description:
      "Découvrez les prestations de K'nails Beauty Institut : onglerie, manucure, soins du corps, esthétique et soins du visage.",
  },
  {
    path: "/galerie",
    title: "Galerie des réalisations",
    description:
      "Explorez les réalisations actives de K'nails Beauty Institut et l'univers de l'institut à Saint-Joseph en Martinique.",
  },
  {
    path: "/contact",
    title: "Contact et rendez-vous",
    description:
      "Contactez K'nails Beauty Institut à Saint-Joseph en Martinique et consultez l'adresse ainsi que les horaires d'ouverture.",
  },
] as const;

export type SeoPagePath = (typeof PAGE_SEO)[number]["path"];

export const SOCIAL_IMAGE = {
  url: `${CANONICAL_ORIGIN}/opengraph-image.png`,
  width: 1200,
  height: 630,
  alt: "K'nails Beauty Institut — élégance, beauté et bien-être en Martinique",
} as const;

const INDEXABLE_ROBOTS: NonNullable<Metadata["robots"]> = {
  index: true,
  follow: true,
};

const CLOSED_ROBOTS: NonNullable<Metadata["robots"]> = {
  index: false,
  follow: false,
  noarchive: true,
};

export function buildRootMetadata(
  deployment: NetlifyDeploymentContext = resolveDeploymentContext(),
): Metadata {
  return {
    metadataBase: new URL(CANONICAL_ORIGIN),
    title: {
      default: SITE_NAME,
      template: `%s | ${SITE_NAME}`,
    },
    description:
      "Institut de beauté et onglerie à Saint-Joseph en Martinique : manucure, soins du corps, esthétique et soins du visage.",
    applicationName: SITE_NAME,
    robots: deployment.isIndexable ? INDEXABLE_ROBOTS : CLOSED_ROBOTS,
    openGraph: {
      title: SITE_NAME,
      description:
        "Institut de beauté et onglerie à Saint-Joseph en Martinique.",
      url: CANONICAL_ORIGIN,
      siteName: SITE_NAME,
      locale: "fr_FR",
      type: "website",
      images: [SOCIAL_IMAGE],
    },
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
  };
}

export function buildPageMetadata(
  path: SeoPagePath,
  deployment: NetlifyDeploymentContext = resolveDeploymentContext(),
): Metadata {
  const record = PAGE_SEO.find((candidate) => candidate.path === path);
  if (!record) throw new Error(`Unknown SEO page: ${path}`);
  const canonicalUrl = `${CANONICAL_ORIGIN}${record.path}`;

  return {
    title: record.title,
    description: record.description,
    alternates: { canonical: canonicalUrl },
    robots: deployment.isIndexable ? INDEXABLE_ROBOTS : CLOSED_ROBOTS,
    openGraph: {
      title: record.title,
      description: record.description,
      url: canonicalUrl,
      siteName: SITE_NAME,
      locale: "fr_FR",
      type: "website",
      images: [SOCIAL_IMAGE],
    },
  };
}
