import { randomUUID } from "node:crypto";
import { classifyServiceError, SERVICE_MESSAGES } from "./errors.ts";
import { reportServiceDiagnostic, type ServiceDiagnosticLogger, type ServiceDiagnosticStage } from "./diagnostics.ts";
import type { ServiceActionState, ServiceFormValues } from "./types.ts";

type Authorization = { authorized: true } | { authorized: false; state: "session_expired" | "unavailable" };
type Validation<T> = { success: true; data: T } | { success: false; fieldErrors: Record<string, string[]> };
type MutationResult = { id: string | null; error?: unknown; status?: number };

export type ServiceActionDependencies<T> = {
  authorize: () => Promise<Authorization>;
  validate: () => Validation<T> | Promise<Validation<T>>;
  mutate: (value: T) => Promise<MutationResult>;
  invalidate: () => void;
  values?: ServiceFormValues;
  successMessage: string;
  createCorrelationId?: () => string;
  logger?: ServiceDiagnosticLogger;
};

export async function executeServiceAction<T>(dependencies: ServiceActionDependencies<T>): Promise<ServiceActionState> {
  const authorization = await dependencies.authorize();
  if (!authorization.authorized) {
    if (authorization.state === "session_expired") return { status: "session_expired", message: SERVICE_MESSAGES.session_expired, values: dependencies.values };
    return failureState("unavailable", "authorization", dependencies);
  }
  let validation: Validation<T>;
  try {
    validation = await dependencies.validate();
  } catch (error) {
    return failureState(classifyServiceError(error), "validation", dependencies);
  }
  if (!validation.success) return { status: "validation", fieldErrors: validation.fieldErrors, values: dependencies.values ?? emptyValues() };
  let result: MutationResult;
  try { result = await dependencies.mutate(validation.data); } catch (error) { result = { id: null, error }; }
  if (result.error) {
    return failureState(classifyServiceError(result.error, result.status), "mutation", dependencies);
  }
  if (!result.id) return { status: "not_found", message: SERVICE_MESSAGES.not_found };
  try {
    dependencies.invalidate();
  } catch (error) {
    return failureState(classifyServiceError(error), "invalidation", dependencies);
  }
  return { status: "success", message: dependencies.successMessage, serviceId: result.id };
}

function failureState<T>(
  category: "unavailable" | "internal",
  stage: ServiceDiagnosticStage,
  dependencies: ServiceActionDependencies<T>,
): ServiceActionState {
  const correlationId = (dependencies.createCorrelationId ?? randomUUID)();
  reportServiceDiagnostic("services.action.failed", category, stage, {
    correlationId,
    logger: dependencies.logger,
  });
  return { status: category, message: SERVICE_MESSAGES[category], correlationId, values: dependencies.values };
}

function emptyValues(): ServiceFormValues {
  return { name: "", description: "", category: "", priceType: "", price: "", durationMinutes: "", badge: "", displayOrder: "0", active: "" };
}
