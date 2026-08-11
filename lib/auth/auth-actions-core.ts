import type { LoginState, LogoutState } from "./auth-state.ts";
import { AUTH_MESSAGES, mapAuthError } from "./auth-errors.ts";
import { sanitizeAdminReturnPath } from "./return-path.ts";
import { parseAdminCredentials } from "../validations/admin-auth.ts";

type OperationResult = { error: unknown | null };
type AdminCheckResult = { data: unknown; error: unknown | null };

export type AuthActionDependencies = {
  signInWithPassword: (credentials: {
    email: string;
    password: string;
  }) => Promise<OperationResult>;
  isCurrentAdmin: () => Promise<AdminCheckResult>;
  signOutLocal: () => Promise<OperationResult>;
};

export type LoginAttemptResult =
  | { kind: "state"; state: LoginState }
  | { kind: "redirect"; path: string };

export type LogoutAttemptResult =
  | { kind: "state"; state: LogoutState }
  | { kind: "redirect"; path: "/admin/connexion" };

function publicState(
  status: "refused" | "rate_limited" | "unavailable",
  email: string,
  message: string,
): LoginAttemptResult {
  return { kind: "state", state: { status, email, message, fieldErrors: {} } };
}

export async function runLoginAttempt(
  formData: FormData,
  dependencies: AuthActionDependencies,
): Promise<LoginAttemptResult> {
  const parsed = parseAdminCredentials({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      kind: "state",
      state: {
        status: "validation",
        email: parsed.email,
        fieldErrors: parsed.fieldErrors,
      },
    };
  }

  let signInResult: OperationResult;
  try {
    signInResult = await dependencies.signInWithPassword(parsed.data);
  } catch {
    return publicState("unavailable", parsed.data.email, AUTH_MESSAGES.unavailable);
  }

  if (signInResult.error) {
    const mapped = mapAuthError(signInResult.error);
    return publicState(mapped.status, parsed.data.email, mapped.message);
  }

  let adminCheck: AdminCheckResult;
  try {
    adminCheck = await dependencies.isCurrentAdmin();
  } catch {
    adminCheck = { data: null, error: true };
  }

  if (adminCheck.error || adminCheck.data !== true) {
    let cleanupConfirmed = false;
    try {
      cleanupConfirmed = (await dependencies.signOutLocal()).error === null;
    } catch {
      cleanupConfirmed = false;
    }

    if (!adminCheck.error && adminCheck.data === false && cleanupConfirmed) {
      return publicState("refused", parsed.data.email, AUTH_MESSAGES.refused);
    }
    return publicState("unavailable", parsed.data.email, AUTH_MESSAGES.unavailable);
  }

  return {
    kind: "redirect",
    path: sanitizeAdminReturnPath(formData.get("returnTo")),
  };
}

export async function runLogoutAttempt(
  signOutLocal: () => Promise<OperationResult>,
): Promise<LogoutAttemptResult> {
  try {
    if ((await signOutLocal()).error === null) {
      return { kind: "redirect", path: "/admin/connexion" };
    }
  } catch {
    // The public state below intentionally contains no provider detail.
  }
  return {
    kind: "state",
    state: { status: "unavailable", message: AUTH_MESSAGES.logout_unavailable },
  };
}
