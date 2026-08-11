"use client";

import { useEffect } from "react";

export default function AdminLogoutTransitionPage() {
  useEffect(() => {
    const timeout = window.setTimeout(() => window.location.replace("/admin/connexion"), 50);
    return () => window.clearTimeout(timeout);
  }, []);
  return <main className="admin-login-page"><section className="admin-login-card" aria-labelledby="logout-transition-title"><p className="admin-eyebrow">K&apos;nails Beauty Institut</p><h1 className="admin-title" id="logout-transition-title">Déconnexion</h1><p className="admin-login-intro" role="status">Finalisation de la déconnexion…</p></section></main>;
}
