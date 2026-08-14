import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { requireAdminPage } from "@/lib/auth/admin-session";
import { getAdminServiceCategoriesWithCounts } from "@/lib/data/services";
import { parseServiceSuccessFlash, SERVICE_SUCCESS_FLASH_HEADER, serviceSuccessMessage } from "@/lib/services/success-flash";
import { ServiceCategoryList } from "../_components/service-category-list";
import { ServiceSuccessMessage } from "../_components/service-success-message";

export const metadata: Metadata = { title: "Catégories de prestations — Administration" };

export default async function ServiceCategoriesPage() {
  const path = "/admin/prestations/categories";
  const authorization = await requireAdminPage(path);
  if (authorization.status === "unavailable") return null;
  const categories = await getAdminServiceCategoriesWithCounts();
  const success = parseServiceSuccessFlash((await headers()).get(SERVICE_SUCCESS_FLASH_HEADER) ?? undefined);
  return <main className="admin-main content-shell">
    <header className="admin-page-header"><div><p className="admin-eyebrow">Catalogue</p><h1 className="admin-title">Catégories</h1><p>Renommez, ordonnez et supprimez les catégories qui organisent les prestations.</p></div><div className="admin-page-actions"><Link className="admin-button secondary" href="/admin/prestations">Retour aux prestations</Link><Link className="admin-button primary" href="/admin/prestations/categories/nouvelle">Nouvelle catégorie</Link></div></header>
    {success && <ServiceSuccessMessage>{serviceSuccessMessage(success)}</ServiceSuccessMessage>}
    {categories.length === 0 ? <section className="admin-empty-state"><h2>Aucune catégorie</h2><p>Créez la première catégorie avant d’ajouter une prestation.</p><Link className="admin-button primary" href="/admin/prestations/categories/nouvelle">Créer une catégorie</Link></section> : <ServiceCategoryList categories={categories} />}
  </main>;
}
