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
} from "@/lib/services/success-flash";
import type { ServiceCategoryActionState, ServiceCategoryFormValues } from "@/lib/services/types";
import { serviceCategoryFormValues, validateServiceCategoryValues } from "@/lib/validations/service";

function isUniqueViolation(error: unknown): boolean {
  return !!error && typeof error === "object" && "code" in error && (error as { code?: unknown }).code === "23505";
}

function failureState(
  category: "unavailable" | "internal",
  stage: "authorization" | "mutation" | "invalidation",
  values: ServiceCategoryFormValues,
): ServiceCategoryActionState {
  const correlationId = randomUUID();
  reportServiceDiagnostic("services.action.failed", category, stage, { correlationId });
  return { status: category, message: SERVICE_MESSAGES[category], correlationId, values };
}

export async function createServiceCategoryAction(
  _previous: ServiceCategoryActionState,
  formData: FormData,
): Promise<ServiceCategoryActionState> {
  const values = serviceCategoryFormValues(formData);
  const authorization = await requireAdminAction();
  if (!authorization.authorized) {
    return authorization.state === "session_expired"
      ? { status: "session_expired", message: SERVICE_MESSAGES.session_expired, values }
      : failureState("unavailable", "authorization", values);
  }

  const validation = validateServiceCategoryValues(values);
  if (!validation.success) return { status: "validation", fieldErrors: validation.fieldErrors, values };

  const code = `category_${randomUUID().replaceAll("-", "")}`;
  const supabase = await createSupabaseServerClient();
  const result = await supabase.from("categories_prestations").insert({
    code,
    nom: validation.data.name,
    ordre_affichage: validation.data.displayOrder,
  }).select("code").maybeSingle();

  if (isUniqueViolation(result.error)) {
    return { status: "validation", fieldErrors: { name: ["Une catégorie portant ce nom existe déjà."] }, values };
  }
  if (result.error || !result.data?.code) {
    const category = classifyServiceError(result.error, result.status);
    return failureState(category === "unavailable" ? "unavailable" : "internal", "mutation", values);
  }

  try {
    updateTag(SERVICES_CACHE_TAG);
  } catch {
    return failureState("internal", "invalidation", values);
  }

  const proof = issueServiceSuccessFlash("category-create", requireServiceSuccessFlashSecret());
  const cookieStore = await cookies();
  cookieStore.set(SERVICE_SUCCESS_FLASH_COOKIE, proof.token, serviceSuccessCookieOptions());
  cookieStore.set(SERVICE_SUCCESS_FLASH_GUARD_COOKIE, proof.guard, serviceSuccessCookieOptions());
  redirect("/admin/prestations");
}
