export type LoginFieldErrors = {
  email?: string[];
  password?: string[];
};

export type LoginState =
  | { status: "idle"; email: ""; fieldErrors: Record<string, never> }
  | { status: "validation"; email: string; fieldErrors: LoginFieldErrors }
  | {
      status: "refused" | "rate_limited" | "unavailable" | "session_expired";
      email: string;
      message: string;
      fieldErrors: Record<string, never>;
    };

export const INITIAL_LOGIN_STATE: LoginState = {
  status: "idle",
  email: "",
  fieldErrors: {},
};

export type LogoutState =
  | { status: "idle" }
  | { status: "unavailable"; message: string };

export const INITIAL_LOGOUT_STATE: LogoutState = { status: "idle" };

export type AdminAuthorization =
  | { status: "authorized"; userId: string }
  | { status: "denied"; reason: "missing_identity" | "not_current_admin" }
  | { status: "unavailable"; correlationId: string };

export type AdminActionAuthorization =
  | { authorized: true; userId: string }
  | { authorized: false; state: "session_expired" | "unavailable" };

export type AuthDiagnosticCategory =
  | "validation"
  | "authentication_refused"
  | "authorization_refused"
  | "rate_limited"
  | "identity_unavailable"
  | "authorization_unavailable"
  | "logout_unavailable";

export type AuthDiagnosticStage =
  | "input"
  | "sign_in"
  | "admin_check"
  | "cleanup"
  | "sign_out";

export type AuthDiagnostic = {
  category: AuthDiagnosticCategory;
  stage: AuthDiagnosticStage;
  correlationId: string;
};
