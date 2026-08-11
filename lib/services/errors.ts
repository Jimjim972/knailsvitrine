export const SERVICE_MESSAGES = {
  session_expired: "Votre session a expiré. Reconnectez-vous puis réessayez.",
  unavailable: "Le service est momentanément indisponible. Réessayez.",
  not_found: "Cette prestation n’existe plus ou n’est plus accessible.",
  internal: "L’opération n’a pas pu être terminée. Réessayez.",
} as const;

export type ServiceErrorCategory = "validation" | "session_expired" | "unavailable" | "not_found" | "internal";

export function classifyServiceError(error: unknown, responseStatus?: number): "unavailable" | "internal" {
  if (!error || typeof error !== "object") return "internal";
  const value = error as { status?: unknown; code?: unknown; name?: unknown };
  const status = typeof responseStatus === "number" ? responseStatus : value.status;
  const code = typeof value.code === "string" ? value.code.toLowerCase() : "";
  const name = typeof value.name === "string" ? value.name.toLowerCase() : "";
  return status === 0 || status === 429 || status === 502 || status === 503 || status === 504
    || code.includes("timeout") || code.includes("network") || code === "abort_err" || name === "aborterror"
    ? "unavailable"
    : "internal";
}
