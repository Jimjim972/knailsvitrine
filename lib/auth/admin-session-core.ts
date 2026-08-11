import { randomUUID } from "node:crypto";
import type {
  AdminActionAuthorization,
  AdminAuthorization,
} from "./auth-state.ts";

export type ClaimsResult = {
  subject: string | null;
  error: unknown | null;
};

export type CurrentAdminResult = {
  data: unknown;
  error: unknown | null;
};

export type AdminAuthorizationDependencies = {
  getClaims: () => Promise<ClaimsResult>;
  isCurrentAdmin: () => Promise<CurrentAdminResult>;
  createCorrelationId?: () => string;
};

export async function getAdminAuthorizationWith(
  dependencies: AdminAuthorizationDependencies,
): Promise<AdminAuthorization> {
  let claims: ClaimsResult;
  try {
    claims = await dependencies.getClaims();
  } catch {
    claims = { subject: null, error: true };
  }

  if (claims.error) {
    return {
      status: "unavailable",
      correlationId: (dependencies.createCorrelationId ?? randomUUID)(),
    };
  }
  if (typeof claims.subject !== "string" || claims.subject.length === 0) {
    return { status: "denied", reason: "missing_identity" };
  }

  let adminCheck: CurrentAdminResult;
  try {
    adminCheck = await dependencies.isCurrentAdmin();
  } catch {
    adminCheck = { data: null, error: true };
  }

  if (adminCheck.error) {
    return {
      status: "unavailable",
      correlationId: (dependencies.createCorrelationId ?? randomUUID)(),
    };
  }
  if (adminCheck.data !== true) {
    return { status: "denied", reason: "not_current_admin" };
  }

  return { status: "authorized", userId: claims.subject };
}

export function createRequireAdminAction(
  getAuthorization: () => Promise<AdminAuthorization>,
): () => Promise<AdminActionAuthorization> {
  return async () => {
    const authorization = await getAuthorization();
    if (authorization.status === "authorized") {
      return { authorized: true, userId: authorization.userId };
    }
    return {
      authorized: false,
      state: authorization.status === "unavailable" ? "unavailable" : "session_expired",
    };
  };
}
