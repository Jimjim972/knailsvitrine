"use server";

import { randomUUID } from "node:crypto";
import { updateTag } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdminAction } from "@/lib/auth/admin-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SERVICES_CACHE_TAG } from "@/lib/services/constants";
import { reportServiceDiagnostic } from "@/lib/services/diagnostics";
import { classifyServiceError, SERVICE_MESSAGES } from "@/lib/services/errors";
import {
  issueServiceSuccessFlash,
  requireServiceSuccessFlashSecret,
  SERVICE_SUCCESS_FLASH_COOKIE,
  SERVICE_SUCCESS_FLASH_GUARD_COOKIE,
  serviceSuccessCookieOptions,
  type ServiceSuccessKind,
} from "@/lib/services/success-flash";
import type { ServiceCategoryActionState, ServiceCategoryFormValues } from "@/lib/services/types";
import {
  serviceCategoryCodeSchema,
  serviceCategoryFormValues,
  validateServiceCategoryValues,
} from "@/lib/validations/service";

const CATEGORY_NOT_FOUND = "Cette catégorie n’existe plus ou n’est plus accessible.";
const CATEGORY_IN_USE = "Cette catégorie contient encore des prestations. Déplacez-les ou supprimez-les avant de supprimer la catégorie.";

function hasPostgresCode(error: unknown, code: string): boolean {
  return !!error && typeof error === "object" && "code" in error
    && (error as { code?: unknown }).code === code;
}

function failureState(
  category: "unavailable" | "internal",
  stage: "authorization" | "mutation" | "invalidation",
  values?: ServiceCategoryFormValues,
): ServiceCategoryActionState {
  const correlationId = randomUUID();
  reportServiceDiagnostic("services.action.failed", category, stage, { correlationId });
  return { status: category, message: SERVICE_MESSAGES[category], correlationId, values };
}

async function redirectWithSuccess(kind: ServiceSuccessKind): Promise<never> {
  const proof = issueServiceSuccessFlash(kind, requireServiceSuccessFlashSecret());
  const cookieStore = await cookies();
  cookieStore.set(SERVICE_SUCCESS_FLASH_COOKIE, proof.token, serviceSuccessCookieOptions());
  cookieStore.set(SERVICE_SUCCESS_FLASH_GUARD_COOKIE, proof.guard, serviceSuccessCookieOptions());
  redirect("/admin/prestations/categories");
}

async function authorizeCategoryAction(values?: ServiceCategoryFormValues): Promise<ServiceCategoryActionState | null> {
  const authorization = await requireAdminAction();
  if (authorization.authorized) return null;
  return authorization.state === "session_expired"
    ? { status: "session_expired", message: SERVICE_MESSAGES.session_expired, values }
    : failureState("unavailable", "authorization", values);
}

function invalidateCategories(values?: ServiceCategoryFormValues): ServiceCategoryActionState | null {
  try {
    updateTag(SERVICES_CACHE_TAG);
    return null;
  } catch {
    return failureState("internal", "invalidation", values);
  }
}

export async function createServiceCategoryAction(
  _previous: ServiceCategoryActionState,
  formData: FormData,
): Promise<ServiceCategoryActionState> {
  const values = serviceCategoryFormValues(formData);
  const authorizationFailure = await authorizeCategoryAction(values);
  if (authorizationFailure) return authorizationFailure;

  const validation = validateServiceCategoryValues(values);
  if (!validation.success) return { status: "validation", fieldErrors: validation.fieldErrors, values };

  const code = `category_${randomUUID().replaceAll("-", "")}`;
  const supabase = await createSupabaseServerClient();
  const result = await supabase.from("categories_prestations").insert({
    code,
    nom: validation.data.name,
    ordre_affichage: validation.data.displayOrder,
  }).select("code").maybeSingle();

  if (hasPostgresCode(result.error, "23505")) {
    return { status: "validation", fieldErrors: { name: ["Une catégorie portant ce nom existe déjà."] }, values };
  }
  if (result.error || !result.data?.code) {
    const category = classifyServiceError(result.error, result.status);
    return failureState(category === "unavailable" ? "unavailable" : "internal", "mutation", values);
  }

  const invalidationFailure = invalidateCategories(values);
  if (invalidationFailure) return invalidationFailure;
  return redirectWithSuccess("category-create");
}

export async function updateServiceCategoryAction(
  _previous: ServiceCategoryActionState,
  formData: FormData,
): Promise<ServiceCategoryActionState> {
  const values = serviceCategoryFormValues(formData);
  const authorizationFailure = await authorizeCategoryAction(values);
  if (authorizationFailure) return authorizationFailure;

  const code = serviceCategoryCodeSchema.safeParse(String(formData.get("categoryCode") ?? ""));
  if (!code.success) return { status: "not_found", message: CATEGORY_NOT_FOUND, values };
  const validation = validateServiceCategoryValues(values);
  if (!validation.success) return { status: "validation", fieldErrors: validation.fieldErrors, values };

  const supabase = await createSupabaseServerClient();
  const result = await supabase.from("categories_prestations").update({
    nom: validation.data.name,
    ordre_affichage: validation.data.displayOrder,
  }).eq("code", code.data).select("code").maybeSingle();

  if (hasPostgresCode(result.error, "23505")) {
    return { status: "validation", fieldErrors: { name: ["Une catégorie portant ce nom existe déjà."] }, values };
  }
  if (result.error) {
    const category = classifyServiceError(result.error, result.status);
    return failureState(category === "unavailable" ? "unavailable" : "internal", "mutation", values);
  }
  if (!result.data?.code) return { status: "not_found", message: CATEGORY_NOT_FOUND, values };

  const invalidationFailure = invalidateCategories(values);
  if (invalidationFailure) return invalidationFailure;
  return redirectWithSuccess("category-edit");
}

export async function deleteServiceCategoryAction(
  _previous: ServiceCategoryActionState,
  formData: FormData,
): Promise<ServiceCategoryActionState> {
  const authorizationFailure = await authorizeCategoryAction();
  if (authorizationFailure) return authorizationFailure;

  const code = serviceCategoryCodeSchema.safeParse(String(formData.get("categoryCode") ?? ""));
  if (!code.success) return { status: "not_found", message: CATEGORY_NOT_FOUND };

  const supabase = await createSupabaseServerClient();
  const result = await supabase.from("categories_prestations").delete()
    .eq("code", code.data).select("code").maybeSingle();
  if (hasPostgresCode(result.error, "23503")) return { status: "conflict", message: CATEGORY_IN_USE };
  if (result.error) {
    const category = classifyServiceError(result.error, result.status);
    return failureState(category === "unavailable" ? "unavailable" : "internal", "mutation");
  }
  if (!result.data?.code) return { status: "not_found", message: CATEGORY_NOT_FOUND };

  const invalidationFailure = invalidateCategories();
  if (invalidationFailure) return invalidationFailure;
  return redirectWithSuccess("category-delete");
}
