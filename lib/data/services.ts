import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createSupabaseServerClient } from "../supabase/server";
import { createPublicSupabaseClient } from "../supabase/public";
import { getServiceE2EScenario } from "../services/e2e-scenario";
import { groupPublicServices, mapAdminService, mapPublicService, sortServices, type ServiceRow } from "../services/mappers";
import { SERVICES_CACHE_TAG } from "../services/constants";
import { ADMIN_SERVICE_COLUMNS, PUBLIC_SERVICE_COLUMNS } from "../services/query-contract";
import { createServiceReadFailure } from "../services/diagnostics";
import { serviceIdSchema } from "../validations/service";
import type { AdminService, PublicServiceGroups } from "../services/types";

export async function getAdminServices(): Promise<AdminService[]> {
  const scenario = getServiceE2EScenario();
  if (scenario === "admin-empty") return [];
  if (scenario === "admin-unavailable") throw createServiceReadFailure({ code: "network_scenario", message: "KN_RAW_PROVIDER_DETAIL" });
  const supabase = await createSupabaseServerClient();
  const result = await supabase.from("prestations").select(ADMIN_SERVICE_COLUMNS)
    .order("categorie").order("ordre_affichage").order("created_at").order("id");
  if (result.error) throw createServiceReadFailure(result.error, { responseStatus: result.status });
  return sortServices((result.data as ServiceRow[]).map(mapAdminService));
}

export async function getAdminService(id: string): Promise<AdminService | null> {
  const parsedId = serviceIdSchema.safeParse(id);
  if (!parsedId.success) return null;
  const supabase = await createSupabaseServerClient();
  const result = await supabase.from("prestations").select(ADMIN_SERVICE_COLUMNS).eq("id", parsedId.data).maybeSingle();
  if (result.error) throw createServiceReadFailure(result.error, { responseStatus: result.status });
  return result.data ? mapAdminService(result.data as ServiceRow) : null;
}

export async function getPublicServices(): Promise<PublicServiceGroups> {
  "use cache";
  cacheLife("days");
  cacheTag(SERVICES_CACHE_TAG);
  if (getServiceE2EScenario() === "public-unavailable") throw createServiceReadFailure({ code: "network_scenario", message: "KN_RAW_PROVIDER_DETAIL" });
  const supabase = createPublicSupabaseClient();
  const result = await supabase.from("prestations").select(PUBLIC_SERVICE_COLUMNS).eq("actif", true)
    .order("categorie").order("ordre_affichage").order("created_at").order("id");
  if (result.error) throw createServiceReadFailure(result.error, { responseStatus: result.status });
  return groupPublicServices((result.data as ServiceRow[]).map(mapPublicService));
}
