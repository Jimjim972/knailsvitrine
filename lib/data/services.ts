import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createSupabaseServerClient } from "../supabase/server";
import { createPublicSupabaseClient } from "../supabase/public";
import { getServiceE2EScenario } from "../services/e2e-scenario";
import { buildPublicServiceSections, mapAdminService, mapPublicService, mapServiceCategory, sortServiceCategories, sortServices, type ServiceCategoryRow, type ServiceRow } from "../services/mappers";
import { SERVICES_CACHE_TAG } from "../services/constants";
import { ADMIN_SERVICE_COLUMNS, PUBLIC_SERVICE_COLUMNS, SERVICE_CATEGORY_COLUMNS } from "../services/query-contract";
import { createServiceReadFailure } from "../services/diagnostics";
import { serviceIdSchema } from "../validations/service";
import type { AdminService, PublicServiceSection, ServiceCategory } from "../services/types";

function mapCategories(data: unknown): ServiceCategory[] {
  return sortServiceCategories(((data ?? []) as ServiceCategoryRow[]).map(mapServiceCategory));
}

function categoryMap(categories: readonly ServiceCategory[]): Map<string, ServiceCategory> {
  return new Map(categories.map((category) => [category.code, category]));
}

export async function getAdminServiceCategories(): Promise<ServiceCategory[]> {
  const supabase = await createSupabaseServerClient();
  const result = await supabase.from("categories_prestations").select(SERVICE_CATEGORY_COLUMNS)
    .order("ordre_affichage").order("created_at").order("code");
  if (result.error) throw createServiceReadFailure(result.error, { responseStatus: result.status });
  return mapCategories(result.data);
}

export async function getAdminServices(): Promise<AdminService[]> {
  const scenario = getServiceE2EScenario();
  if (scenario === "admin-empty") return [];
  if (scenario === "admin-unavailable") throw createServiceReadFailure({ code: "network_scenario", message: "KN_RAW_PROVIDER_DETAIL" });
  const supabase = await createSupabaseServerClient();
  const [categoryResult, serviceResult] = await Promise.all([
    supabase.from("categories_prestations").select(SERVICE_CATEGORY_COLUMNS).order("ordre_affichage").order("created_at").order("code"),
    supabase.from("prestations").select(ADMIN_SERVICE_COLUMNS).order("categorie").order("ordre_affichage").order("created_at").order("id"),
  ]);
  if (categoryResult.error) throw createServiceReadFailure(categoryResult.error, { responseStatus: categoryResult.status });
  if (serviceResult.error) throw createServiceReadFailure(serviceResult.error, { responseStatus: serviceResult.status });
  const categories = mapCategories(categoryResult.data);
  const categoriesByCode = categoryMap(categories);
  return sortServices((serviceResult.data as ServiceRow[]).map((row) => mapAdminService(row, categoriesByCode)), categories);
}

export async function getAdminService(id: string): Promise<AdminService | null> {
  const parsedId = serviceIdSchema.safeParse(id);
  if (!parsedId.success) return null;
  const supabase = await createSupabaseServerClient();
  const [categoryResult, serviceResult] = await Promise.all([
    supabase.from("categories_prestations").select(SERVICE_CATEGORY_COLUMNS).order("ordre_affichage").order("created_at").order("code"),
    supabase.from("prestations").select(ADMIN_SERVICE_COLUMNS).eq("id", parsedId.data).maybeSingle(),
  ]);
  if (categoryResult.error) throw createServiceReadFailure(categoryResult.error, { responseStatus: categoryResult.status });
  if (serviceResult.error) throw createServiceReadFailure(serviceResult.error, { responseStatus: serviceResult.status });
  const categories = mapCategories(categoryResult.data);
  return serviceResult.data ? mapAdminService(serviceResult.data as ServiceRow, categoryMap(categories)) : null;
}

export async function getPublicServices(): Promise<PublicServiceSection[]> {
  "use cache";
  cacheLife("days");
  cacheTag(SERVICES_CACHE_TAG);
  if (getServiceE2EScenario() === "public-unavailable") throw createServiceReadFailure({ code: "network_scenario", message: "KN_RAW_PROVIDER_DETAIL" });
  const supabase = createPublicSupabaseClient();
  const [categoryResult, serviceResult] = await Promise.all([
    supabase.from("categories_prestations").select(SERVICE_CATEGORY_COLUMNS).order("ordre_affichage").order("created_at").order("code"),
    supabase.from("prestations").select(PUBLIC_SERVICE_COLUMNS).eq("actif", true).order("categorie").order("ordre_affichage").order("created_at").order("id"),
  ]);
  if (categoryResult.error) throw createServiceReadFailure(categoryResult.error, { responseStatus: categoryResult.status });
  if (serviceResult.error) throw createServiceReadFailure(serviceResult.error, { responseStatus: serviceResult.status });
  return buildPublicServiceSections(mapCategories(categoryResult.data), (serviceResult.data as ServiceRow[]).map(mapPublicService));
}
