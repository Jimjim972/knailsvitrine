import { classifyGalleryError, reportGalleryDiagnostic, type GalleryDiagnosticLogger, type GalleryDiagnosticStage } from "./diagnostics.ts";
import type { GalleryActionState, GalleryFormValues } from "./types.ts";

export type GalleryAuthorization =
  | { authorized: true }
  | { authorized: false; state: "session_expired" | "forbidden" | "network" };

export type GalleryValidation<T> = { success: true; data: T } | { success: false; fieldErrors: Record<string, string[]> };
export type GalleryMutationResult = { photoId?: string; operationId?: string; error?: unknown; status?: number; repairRequired?: boolean };

export async function executeGalleryAction<T>(dependencies: {
  authorize: () => Promise<GalleryAuthorization>;
  validate: () => GalleryValidation<T>;
  mutate: (value: T) => Promise<GalleryMutationResult>;
  invalidate?: () => void;
  values?: GalleryFormValues;
  successMessage: string;
  logger?: GalleryDiagnosticLogger;
}): Promise<GalleryActionState> {
  const authorization = await dependencies.authorize();
  if (!authorization.authorized) return { status: authorization.state, message: messageFor(authorization.state), values: dependencies.values };
  const validation = dependencies.validate();
  if (!validation.success) return { status: "validation", fieldErrors: validation.fieldErrors, values: dependencies.values };
  try {
    const result = await dependencies.mutate(validation.data);
    if (result.error) return failureState(result.error, "mutation", result.status, dependencies.values, dependencies.logger);
    if (!result.photoId) return failureState(new Error("Missing confirmed photo id"), "mutation", undefined, dependencies.values, dependencies.logger);
    if (result.repairRequired) {
      if (!result.operationId) return failureState(new Error("Missing repair operation id"), "repair", undefined, dependencies.values, dependencies.logger);
      return { status: "repair_required", message: messageFor("repair_required"), photoId: result.photoId, operationId: result.operationId };
    }
    dependencies.invalidate?.();
    return { status: "success", message: dependencies.successMessage, photoId: result.photoId };
  } catch (error) {
    return failureState(error, "mutation", undefined, dependencies.values, dependencies.logger);
  }
}

function messageFor(category: Exclude<GalleryActionState["status"], "idle" | "validation" | "pending" | "success" | "internal">): string {
  const messages = {
    session_expired: "Votre session a expiré. Reconnectez-vous.",
    forbidden: "Vous n’êtes pas autorisé à effectuer cette action.",
    not_found: "Cette photo ou cette opération n’existe plus.",
    conflict: "La photo a été modifiée. Actualisez avant de réessayer.",
    network: "Le service est temporairement indisponible. Réessayez.",
    quota: "Le stockage ne peut pas accepter ce fichier actuellement.",
    repair_required: "L’opération doit être reprise avant publication.",
  } as const;
  return messages[category];
}

function failureState(
  error: unknown,
  stage: GalleryDiagnosticStage,
  status?: number,
  values?: GalleryFormValues,
  logger?: GalleryDiagnosticLogger,
): GalleryActionState {
  const category = classifyGalleryError(error, status);
  const diagnostic = reportGalleryDiagnostic("gallery.action.failed", category, stage, { logger });
  if (category === "internal") return { status: "internal", message: "Une erreur interne est survenue.", correlationId: diagnostic.correlationId, values };
  if (category === "repair_required" || category === "validation") {
    return { status: "internal", message: "Une erreur interne est survenue.", correlationId: diagnostic.correlationId, values };
  }
  return { status: category, message: messageFor(category), values };
}
