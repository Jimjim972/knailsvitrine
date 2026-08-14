"use server";

import { updateTag } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdminAction } from "@/lib/auth/admin-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { executeServiceAction } from "@/lib/services/action-core";
import { SERVICES_CACHE_TAG } from "@/lib/services/constants";
import {
  issueServiceSuccessFlash,
  requireServiceSuccessFlashSecret,
  SERVICE_SUCCESS_FLASH_COOKIE,
  SERVICE_SUCCESS_FLASH_GUARD_COOKIE,
  serviceSuccessCookieOptions,
  type ServiceSuccessKind,
} from "@/lib/services/success-flash";
import type { ServiceActionState } from "@/lib/services/types";
import type { Database } from "@/lib/supabase/database.types";
import { serviceFormValues, serviceIdSchema, validateServiceValues, validateVisibilityValues, type NormalizedServiceInput } from "@/lib/validations/service";

type ServiceInsert = Database["public"]["Tables"]["prestations"]["Insert"];
type ExactServicePayload = Omit<ServiceInsert, "prix"> & { prix: string | null };

function payload(value: NormalizedServiceInput): ExactServicePayload {
  return { nom: value.name, description: value.description, categorie: value.category,
    prix: value.databasePrice, type_prix: value.priceType,
    duree_minutes: value.durationMinutes, badge: value.badge, ordre_affichage: value.displayOrder, actif: value.active };
}

function supabasePayload(value: NormalizedServiceInput): ServiceInsert {
  return payload(value) as unknown as ServiceInsert;
}

async function validateServiceWithCurrentCategory(values: ReturnType<typeof serviceFormValues>) {
  const validation = validateServiceValues(values);
  if (!validation.success) return validation;
  const supabase = await createSupabaseServerClient();
  const result = await supabase.from("categories_prestations").select("code").eq("code", validation.data.category).maybeSingle();
  if (result.error) throw Object.assign(result.error, { status: result.status });
  return result.data
    ? validation
    : { success: false as const, fieldErrors: { category: ["Choisissez une catégorie existante."] } };
}

async function attachConfirmedSuccess(state: ServiceActionState, kind: ServiceSuccessKind): Promise<ServiceActionState> {
  if (state.status !== "success") return state;
  const proof = issueServiceSuccessFlash(kind, requireServiceSuccessFlashSecret());
  const cookieStore = await cookies();
  cookieStore.set(SERVICE_SUCCESS_FLASH_COOKIE, proof.token, serviceSuccessCookieOptions());
  cookieStore.set(SERVICE_SUCCESS_FLASH_GUARD_COOKIE, proof.guard, serviceSuccessCookieOptions());
  redirect("/admin/prestations");
}

export async function createServiceAction(_previous: ServiceActionState, formData: FormData): Promise<ServiceActionState> {
  const values = serviceFormValues(formData);
  const state = await executeServiceAction({ authorize: requireAdminAction, values, validate: () => validateServiceWithCurrentCategory(values),
    mutate: async (value) => { const supabase = await createSupabaseServerClient(); const result = await supabase.from("prestations").insert(supabasePayload(value)).select("id").maybeSingle(); return { id: result.data?.id ?? null, error: result.error, status: result.status }; },
    invalidate: () => updateTag(SERVICES_CACHE_TAG), successMessage: "La prestation a été créée." });
  return attachConfirmedSuccess(state, "create");
}

export async function updateServiceAction(_previous: ServiceActionState, formData: FormData): Promise<ServiceActionState> {
  const values = serviceFormValues(formData, { mode: "update" });
  const id = String(formData.get("serviceId") ?? "");
  const state = await executeServiceAction({ authorize: requireAdminAction, values,
    validate: async () => { const serviceId = serviceIdSchema.safeParse(id); if (!serviceId.success) return { success: false as const, fieldErrors: { serviceId: ["Identifiant de prestation invalide."] } }; return validateServiceWithCurrentCategory(values); },
    mutate: async (value) => { const supabase = await createSupabaseServerClient(); const result = await supabase.from("prestations").update(supabasePayload(value)).eq("id", id).select("id").maybeSingle(); return { id: result.data?.id ?? null, error: result.error, status: result.status }; },
    invalidate: () => updateTag(SERVICES_CACHE_TAG), successMessage: "La prestation a été modifiée." });
  return attachConfirmedSuccess(state, "edit");
}

export async function setServiceVisibilityAction(_previous: ServiceActionState, formData: FormData): Promise<ServiceActionState> {
  const id = String(formData.get("serviceId") ?? "");
  const active = String(formData.get("active") ?? "");
  return executeServiceAction({ authorize: requireAdminAction,
    validate: () => validateVisibilityValues(id, active),
    mutate: async (value) => { const supabase = await createSupabaseServerClient(); const result = await supabase.from("prestations").update({ actif: value.active }).eq("id", value.id).select("id").maybeSingle(); return { id: result.data?.id ?? null, error: result.error, status: result.status }; },
    invalidate: () => updateTag(SERVICES_CACHE_TAG), successMessage: active === "true" ? "La prestation est active." : "La prestation est masquée." });
}

export async function deleteServiceAction(_previous: ServiceActionState, formData: FormData): Promise<ServiceActionState> {
  const id = String(formData.get("serviceId") ?? "");
  const state = await executeServiceAction({ authorize: requireAdminAction,
    validate: () => { const parsed = serviceIdSchema.safeParse(id); return parsed.success ? { success: true, data: parsed.data } : { success: false, fieldErrors: { serviceId: ["Identifiant invalide."] } }; },
    mutate: async (serviceId) => { const supabase = await createSupabaseServerClient(); const result = await supabase.from("prestations").delete().eq("id", serviceId).select("id").maybeSingle(); return { id: result.data?.id ?? null, error: result.error, status: result.status }; },
    invalidate: () => updateTag(SERVICES_CACHE_TAG), successMessage: "La prestation a été supprimée." });
  return attachConfirmedSuccess(state, "delete");
}
