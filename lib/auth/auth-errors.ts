export const AUTH_MESSAGES = {
  refused: "Connexion impossible. Vérifiez vos informations et réessayez.",
  rate_limited: "Trop de tentatives. Patientez quelques instants puis réessayez.",
  unavailable: "Le service est momentanément indisponible. Actualisez la page puis réessayez.",
  session_expired: "Votre session a expiré ou vos droits ont changé. Reconnectez-vous pour continuer.",
  logout_unavailable: "La déconnexion n'a pas pu être confirmée. Réessayez ou actualisez la page.",
} as const;

export type PublicAuthError = {
  status: "refused" | "rate_limited" | "unavailable";
  message: string;
};

const REFUSAL_CODES = new Set([
  "invalid_credentials",
  "email_not_confirmed",
  "user_banned",
  "user_not_found",
]);

function errorDetails(error: unknown) {
  if (!error || typeof error !== "object") return { code: "", status: 0 };
  const value = error as { code?: unknown; status?: unknown };
  return {
    code: typeof value.code === "string" ? value.code : "",
    status: typeof value.status === "number" ? value.status : 0,
  };
}

export function mapAuthError(error: unknown): PublicAuthError {
  const { code, status } = errorDetails(error);
  if (REFUSAL_CODES.has(code)) return { status: "refused", message: AUTH_MESSAGES.refused };
  if (status === 429 || code.includes("rate_limit")) {
    return { status: "rate_limited", message: AUTH_MESSAGES.rate_limited };
  }
  return { status: "unavailable", message: AUTH_MESSAGES.unavailable };
}
