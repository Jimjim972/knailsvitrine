import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth/admin-session";
import { ServiceCategoryForm } from "../../_components/service-category-form";

export const metadata: Metadata = { title: "Nouvelle catégorie — Administration" };

export default async function NewServiceCategoryPage() {
  const path = "/admin/prestations/categories/nouvelle";
  const authorization = await requireAdminPage(path);
  if (authorization.status === "unavailable") return null;
  return <main className="admin-main content-shell admin-form-page"><header><p className="admin-eyebrow">Catalogue</p><h1 className="admin-title">Nouvelle catégorie</h1><p>Ajoutez un nouvel univers pour classer les prestations.</p></header><ServiceCategoryForm mode="create" /></main>;
}
