import type { ReactNode } from "react";
import Link from "next/link";
import { requireAdminPage } from "../../../../lib/auth/admin-session";
import { AUTH_MESSAGES } from "../../../../lib/auth/auth-errors";
import { LogoutForm } from "../_components/logout-form";

export const instant = false;

export default async function ProtectedAdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  const authorization = await requireAdminPage("/admin");

  if (authorization.status === "unavailable") {
    return (
      <main className="admin-login-page" data-admin-state="unavailable">
        <section className="admin-login-card" aria-labelledby="admin-unavailable-title">
          <p className="admin-eyebrow">K&apos;nails Beauty Institut</p>
          <h1 className="admin-title" id="admin-unavailable-title">
            Session indisponible
          </h1>
          <p className="admin-login-intro">
            L&apos;accès à l&apos;administration ne peut pas être vérifié pour le moment.
          </p>
          <LogoutForm
            initialState={{ status: "unavailable", message: AUTH_MESSAGES.logout_unavailable }}
          />
        </section>
      </main>
    );
  }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div className="admin-header-inner">
          <div className="admin-context">
            <span className="admin-brand">K&apos;nails Beauty Institut</span>
            <span aria-hidden="true">·</span>
            <span>Administration</span>
          </div>
          <LogoutForm />
        </div>
      </header>
      <nav className="admin-nav" aria-label="Navigation administration">
        <div className="content-shell admin-nav-inner"><Link href="/admin">Dashboard</Link><Link href="/admin/prestations">Prestations</Link></div>
      </nav>
      {children}
    </div>
  );
}
