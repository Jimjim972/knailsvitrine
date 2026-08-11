export const SERVICE_CATEGORIES = [
  { code: "onglerie_manucure", rank: 0, adminLabel: "Onglerie et manucure", publicLabel: "Onglerie & Manucure" },
  { code: "soins_corps", rank: 1, adminLabel: "Soins du corps", publicLabel: "Soins du Corps" },
  { code: "esthetique_visage", rank: 2, adminLabel: "Esthétique et visage", publicLabel: "Esthétique & Visage" },
] as const;

export const SERVICE_PRICE_TYPES = ["fixed", "starting_at", "quote"] as const;
export const SERVICES_CACHE_TAG = "prestations";

export type ServiceCategoryCode = (typeof SERVICE_CATEGORIES)[number]["code"];
export type ServicePriceType = (typeof SERVICE_PRICE_TYPES)[number];

export const SERVICE_CATEGORY_BY_CODE = Object.fromEntries(
  SERVICE_CATEGORIES.map((category) => [category.code, category]),
) as Record<ServiceCategoryCode, (typeof SERVICE_CATEGORIES)[number]>;
