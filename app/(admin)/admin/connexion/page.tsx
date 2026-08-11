import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "../_components/login-form";
import { AUTH_MESSAGES } from "../../../../lib/auth/auth-errors";
import { getAdminAuthorization } from "../../../../lib/auth/admin-session";
import {
  INITIAL_LOGIN_STATE,
  type LoginState,
} from "../../../../lib/auth/auth-state";
import { sanitizeAdminReturnPath } from "../../../../lib/auth/return-path";

export const metadata: Metadata = {
  title: "Connexion administration",
  description: "Accès réservé à l'administration de K'nails Beauty Institut.",
};

export const instant = false;

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  const query = await searchParams;
  const authorization = await getAdminAuthorization();
  if (authorization.status === "authorized") redirect("/admin");

  const returnTo = sanitizeAdminReturnPath(query.returnTo);
  const initialState: LoginState =
    authorization.status === "unavailable" || query.indisponible === "1"
      ? {
          status: "unavailable",
          email: "",
          message: AUTH_MESSAGES.unavailable,
          fieldErrors: {},
        }
      : query.session === "expired"
        ? {
            status: "session_expired",
            email: "",
            message: AUTH_MESSAGES.session_expired,
            fieldErrors: {},
          }
        : INITIAL_LOGIN_STATE;

  return (
    <main className="admin-login-page">
      <section className="admin-login-card" aria-labelledby="admin-login-title">
        <p className="admin-eyebrow">K&apos;nails Beauty Institut</p>
        <h1 className="admin-title" id="admin-login-title">
          Administration
        </h1>
        <p className="admin-login-intro">
          Connectez-vous avec le compte administrateur autorisé pour accéder à cet espace.
        </p>
        <LoginForm returnTo={returnTo} initialState={initialState} />
      </section>
    </main>
  );
}
