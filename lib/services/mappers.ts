import { SERVICE_CATEGORY_BY_CODE, SERVICE_PRICE_TYPES, type ServiceCategoryCode, type ServicePriceType } from "./constants.ts";
import { decimalToMinorUnits, formatPrice } from "./price.ts";
import type { AdminService, PublicService, PublicServiceGroups } from "./types.ts";

export type ServiceRow = {
  id: string; nom: string; description: string; categorie: string; prix: string | null;
  type_prix: string; duree_minutes: number | null; badge: string | null; ordre_affichage: number;
  actif?: boolean; created_at: string; updated_at?: string;
};

function category(value: string): ServiceCategoryCode {
  if (!(value in SERVICE_CATEGORY_BY_CODE)) throw new Error("Unknown service category");
  return value as ServiceCategoryCode;
}

function priceType(value: string): ServicePriceType {
  if (!SERVICE_PRICE_TYPES.includes(value as ServicePriceType)) throw new Error("Unknown price type");
  return value as ServicePriceType;
}

export function compareServices(a: Pick<AdminService, "category" | "displayOrder" | "createdAt" | "id">, b: Pick<AdminService, "category" | "displayOrder" | "createdAt" | "id">) {
  return SERVICE_CATEGORY_BY_CODE[a.category].rank - SERVICE_CATEGORY_BY_CODE[b.category].rank
    || a.displayOrder - b.displayOrder
    || a.createdAt.localeCompare(b.createdAt)
    || a.id.localeCompare(b.id);
}

export function mapAdminService(row: ServiceRow): AdminService {
  const code = category(row.categorie);
  return {
    id: row.id, name: row.nom, description: row.description, category: code,
    categoryLabel: SERVICE_CATEGORY_BY_CODE[code].adminLabel,
    priceType: priceType(row.type_prix), priceMinorUnits: decimalToMinorUnits(row.prix),
    durationMinutes: row.duree_minutes, badge: row.badge, displayOrder: row.ordre_affichage,
    active: row.actif === true, createdAt: row.created_at, updatedAt: row.updated_at ?? row.created_at,
  };
}

export function mapPublicService(row: ServiceRow): PublicService {
  const code = category(row.categorie);
  const type = priceType(row.type_prix);
  const minorUnits = decimalToMinorUnits(row.prix);
  return { id: row.id, name: row.nom, description: row.description, category: code,
    priceLabel: formatPrice(minorUnits, type), durationLabel: row.duree_minutes === null ? null : `${row.duree_minutes} min`,
    badge: row.badge, displayOrder: row.ordre_affichage, createdAt: row.created_at };
}

export function sortServices<T extends Pick<AdminService, "category" | "displayOrder" | "createdAt" | "id">>(services: T[]): T[] {
  return [...services].sort(compareServices);
}

export function groupPublicServices(services: PublicService[]): PublicServiceGroups {
  const groups: PublicServiceGroups = {
    onglerie_manucure: [],
    soins_corps: [],
    esthetique_visage: [],
  };
  for (const service of sortServices(services)) groups[service.category].push(service);
  return groups;
}
