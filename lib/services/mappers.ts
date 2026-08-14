import { SERVICE_PRICE_TYPES, type ServicePriceType } from "./constants.ts";
import { decimalToMinorUnits, formatPrice } from "./price.ts";
import type { AdminService, PublicService, PublicServiceSection, ServiceCategory } from "./types.ts";

export type ServiceRow = {
  id: string; nom: string; description: string; categorie: string; prix: string | null;
  type_prix: string; duree_minutes: number | null; badge: string | null; ordre_affichage: number;
  actif?: boolean; created_at: string; updated_at?: string;
};

export type ServiceCategoryRow = {
  code: string; nom: string; ordre_affichage: number; created_at: string; updated_at: string;
};

function priceType(value: string): ServicePriceType {
  if (!SERVICE_PRICE_TYPES.includes(value as ServicePriceType)) throw new Error("Unknown price type");
  return value as ServicePriceType;
}

function categoryRank(categories: readonly ServiceCategory[]): Map<string, number> {
  return new Map(categories.map((category, index) => [category.code, index]));
}

export function mapServiceCategory(row: ServiceCategoryRow): ServiceCategory {
  return { code: row.code, name: row.nom, displayOrder: row.ordre_affichage, createdAt: row.created_at, updatedAt: row.updated_at };
}

export function sortServiceCategories(categories: readonly ServiceCategory[]): ServiceCategory[] {
  return [...categories].sort((a, b) => a.displayOrder - b.displayOrder || a.createdAt.localeCompare(b.createdAt) || a.code.localeCompare(b.code));
}

export function compareServices(a: Pick<AdminService, "category" | "displayOrder" | "createdAt" | "id">, b: Pick<AdminService, "category" | "displayOrder" | "createdAt" | "id">, ranks: ReadonlyMap<string, number>) {
  return (ranks.get(a.category) ?? Number.MAX_SAFE_INTEGER) - (ranks.get(b.category) ?? Number.MAX_SAFE_INTEGER)
    || a.displayOrder - b.displayOrder
    || a.createdAt.localeCompare(b.createdAt)
    || a.id.localeCompare(b.id);
}

export function mapAdminService(row: ServiceRow, categoriesByCode: ReadonlyMap<string, ServiceCategory>): AdminService {
  const category = categoriesByCode.get(row.categorie);
  if (!category) throw new Error("Unknown service category");
  return {
    id: row.id, name: row.nom, description: row.description, category: category.code,
    categoryLabel: category.name,
    priceType: priceType(row.type_prix), priceMinorUnits: decimalToMinorUnits(row.prix),
    durationMinutes: row.duree_minutes, badge: row.badge, displayOrder: row.ordre_affichage,
    active: row.actif === true, createdAt: row.created_at, updatedAt: row.updated_at ?? row.created_at,
  };
}

export function mapPublicService(row: ServiceRow): PublicService {
  const type = priceType(row.type_prix);
  const minorUnits = decimalToMinorUnits(row.prix);
  return { id: row.id, name: row.nom, description: row.description, category: row.categorie,
    priceLabel: formatPrice(minorUnits, type), durationLabel: row.duree_minutes === null ? null : `${row.duree_minutes} min`,
    badge: row.badge, displayOrder: row.ordre_affichage, createdAt: row.created_at };
}

export function sortServices<T extends Pick<AdminService, "category" | "displayOrder" | "createdAt" | "id">>(services: T[], categories: readonly ServiceCategory[]): T[] {
  const ranks = categoryRank(sortServiceCategories(categories));
  return [...services].sort((a, b) => compareServices(a, b, ranks));
}

export function buildPublicServiceSections(categories: readonly ServiceCategory[], services: readonly PublicService[]): PublicServiceSection[] {
  const orderedCategories = sortServiceCategories(categories);
  const groups = new Map(orderedCategories.map((category) => [category.code, [] as PublicService[]]));
  for (const service of sortServices([...services], orderedCategories)) groups.get(service.category)?.push(service);
  return orderedCategories.map((category) => ({ category, services: groups.get(category.code) ?? [] }));
}
