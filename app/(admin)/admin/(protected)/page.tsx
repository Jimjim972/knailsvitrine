import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPage } from "../../../../lib/auth/admin-session";

export const metadata: Metadata = {
  title: "Administration",
  description: "Accueil protégé de l'administration K'nails Beauty Institut.",
};

export default async function AdminHomePage() {
  const authorization = await requireAdminPage("/admin");
  if (authorization.status === "unavailable") return null;

  return (
    <main className="admin-main content-shell">
      <section className="admin-welcome-card" aria-labelledby="admin-home-title">
        <p className="admin-eyebrow">Espace protégé</p>
        <h1 className="admin-title" id="admin-home-title">
          Administration
        </h1>
        <p>Votre session est autorisée. Gérez le catalogue visible sur le site public.</p>
        <div className="admin-dashboard-grid">
          <Link className="admin-dashboard-card" href="/admin/prestations"><strong>Prestations</strong><span>Consulter et mettre à jour le catalogue</span></Link>
          <Link className="admin-dashboard-card" href="/admin/galerie"><strong>Galerie</strong><span>Consulter les photos et leur état de publication</span></Link>
        </div>
      </section>
    </main>
  );
}
