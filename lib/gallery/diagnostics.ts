import { randomUUID } from "node:crypto";

export type GalleryErrorCategory = "validation" | "session_expired" | "forbidden" | "not_found" | "conflict" | "network" | "quota" | "repair_required" | "internal";
export type GalleryDiagnosticStage = "authorization" | "validation" | "read" | "storage" | "mutation" | "invalidation" | "repair";
export type GalleryDiagnostic = Readonly<{ category: GalleryErrorCategory; stage: GalleryDiagnosticStage; correlationId: string }>;
export type GalleryDiagnosticLogger = (event: "gallery.read.failed" | "gallery.action.failed", diagnostic: GalleryDiagnostic) => void;

type ProviderLikeError = { status?: unknown; statusCode?: unknown; code?: unknown; message?: unknown };

export function classifyGalleryError(error: unknown, responseStatus?: number): GalleryErrorCategory {
  const provider = typeof error === "object" && error !== null ? error as ProviderLikeError : {};
  const status = responseStatus ?? Number(provider.status ?? provider.statusCode);
  const code = typeof provider.code === "string" ? provider.code.toLowerCase() : "";
  if (status === 401) return "session_expired";
  if (status === 403) return "forbidden";
  if (status === 404 || code === "pgrst116") return "not_found";
  if (status === 409 || code === "23505") return "conflict";
  if (status === 413 || status === 507 || status === 429 || code.includes("quota")) return "quota";
  if (status >= 500 || status === 0 || code.includes("timeout") || code.includes("network")) return "network";
  return "internal";
}

export function reportGalleryDiagnostic(
  event: "gallery.read.failed" | "gallery.action.failed",
  category: GalleryErrorCategory,
  stage: GalleryDiagnosticStage,
  options: { correlationId?: string; logger?: GalleryDiagnosticLogger } = {},
): GalleryDiagnostic {
  const diagnostic = { category, stage, correlationId: options.correlationId ?? randomUUID() } as const;
  (options.logger ?? ((safeEvent, safeDiagnostic) => console.error(safeEvent, safeDiagnostic)))(event, diagnostic);
  return diagnostic;
}

export class GalleryDataAccessError extends Error {
  readonly category: "network" | "internal";
  readonly correlationId: string;

  constructor(diagnostic: GalleryDiagnostic) {
    super("La galerie est momentanément indisponible.");
    this.name = "GalleryDataAccessError";
    this.category = diagnostic.category === "network" ? "network" : "internal";
    this.correlationId = diagnostic.correlationId;
  }
}

export function createGalleryReadFailure(error: unknown, responseStatus?: number) {
  const category = classifyGalleryError(error, responseStatus);
  return new GalleryDataAccessError(reportGalleryDiagnostic("gallery.read.failed", category, "read"));
}
