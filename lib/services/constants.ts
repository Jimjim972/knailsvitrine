export const SERVICE_PRICE_TYPES = ["fixed", "starting_at", "quote"] as const;
export const SERVICES_CACHE_TAG = "prestations";

export type ServiceCategoryCode = string;
export type ServicePriceType = (typeof SERVICE_PRICE_TYPES)[number];

export type ServiceCategoryPresentation = {
  eyebrow: string;
  image: string;
  imageAlt: string;
  imageTitle: string;
  imageCaption: string;
};

const INITIAL_CATEGORY_PRESENTATIONS: Readonly<Record<string, ServiceCategoryPresentation>> = {
  onglerie_manucure: {
    eyebrow: "L'Art de la Perfection",
    image: "/images/nails-signature.jpg",
    imageAlt: "Manucure rose poudré avec détails dorés",
    imageTitle: "Signature K'nails",
    imageCaption: "L'élégance jusqu'au bout des ongles.",
  },
  soins_corps: {
    eyebrow: "Détente Absolue",
    image: "/images/spa-massage.jpg",
    imageAlt: "Soin relaxant des mains dans un spa",
    imageTitle: "Rituels Corps",
    imageCaption: "Une parenthèse de bien-être.",
  },
  esthetique_visage: {
    eyebrow: "Soins Premium",
    image: "/images/skincare.jpg",
    imageAlt: "Produits cosmétiques premium sur un décor rose",
    imageTitle: "Soins Visage",
    imageCaption: "Des protocoles experts pour sublimer votre peau.",
  },
};

export function getServiceCategoryPresentation(code: string, name: string): ServiceCategoryPresentation {
  return INITIAL_CATEGORY_PRESENTATIONS[code] ?? {
    eyebrow: "Notre savoir-faire",
    image: "/images/salon-interior.jpg",
    imageAlt: "Intérieur élégant de l’institut K'nails",
    imageTitle: name,
    imageCaption: "Des soins pensés pour vous.",
  };
}
