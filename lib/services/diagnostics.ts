import { randomUUID } from "node:crypto";
import { classifyServiceError, type ServiceErrorCategory } from "./errors.ts";

export type ServiceDiagnosticStage = "authorization" | "validation" | "read" | "mutation" | "invalidation";
export type ServiceDiagnostic = Readonly<{
  category: ServiceErrorCategory;
  stage: ServiceDiagnosticStage;
  correlationId: string;
}>;
export type ServiceDiagnosticEvent = "services.read.failed" | "services.action.failed";
export type ServiceDiagnosticLogger = (event: ServiceDiagnosticEvent, diagnostic: ServiceDiagnostic) => void;

export function createServiceDiagnostic(category: ServiceErrorCategory, stage: ServiceDiagnosticStage, correlationId: string = randomUUID()): ServiceDiagnostic {
  return { category, stage, correlationId } as const;
}

export class ServiceDataAccessError extends Error {
  readonly category: "unavailable" | "internal";
  readonly correlationId: string;

  constructor(diagnostic: ServiceDiagnostic) {
    super("Les prestations sont momentanément indisponibles.");
    this.name = "ServiceDataAccessError";
    this.category = diagnostic.category === "unavailable" ? "unavailable" : "internal";
    this.correlationId = diagnostic.correlationId;
  }
}

type ReadFailureOptions = {
  correlationId?: string;
  logger?: ServiceDiagnosticLogger;
  responseStatus?: number;
};

const defaultLogger: ServiceDiagnosticLogger = (event, diagnostic) => {
  console.error(event, diagnostic);
};

type ReportOptions = {
  correlationId?: string;
  logger?: ServiceDiagnosticLogger;
};

export function reportServiceDiagnostic(
  event: ServiceDiagnosticEvent,
  category: ServiceErrorCategory,
  stage: ServiceDiagnosticStage,
  options: ReportOptions = {},
): ServiceDiagnostic {
  const diagnostic = createServiceDiagnostic(category, stage, options.correlationId);
  (options.logger ?? defaultLogger)(event, diagnostic);
  return diagnostic;
}

export function createServiceReadFailure(error: unknown, options: ReadFailureOptions = {}): ServiceDataAccessError {
  const diagnostic = reportServiceDiagnostic(
    "services.read.failed",
    classifyServiceError(error, options.responseStatus),
    "read",
    options,
  );
  return new ServiceDataAccessError(diagnostic);
}
