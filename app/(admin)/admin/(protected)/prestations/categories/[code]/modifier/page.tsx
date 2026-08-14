import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth/admin-session";
import { getAdminServiceCategory } from "@/lib/data/services";
import { ServiceCategoryForm } from "../../../_components/service-category-form";

export const metadata: Metadata = { title: "Modifier une catégorie — Administration" };

export default async function EditServiceCategoryPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const path = `/admin/prestations/categories/${code}/modifier`;
  const authorization = await requireAdminPage(path);
  if (authorization.status === "unavailable") return null;
  const category = await getAdminServiceCategory(code);
  if (!category) notFound();
  return <main className="admin-main content-shell admin-form-page"><header><p className="admin-eyebrow">Catalogue</p><h1 className="admin-title">Modifier la catégorie</h1><p>Le nouveau nom et l’ordre seront utilisés immédiatement dans l’administration et le catalogue.</p></header><ServiceCategoryForm mode="edit" category={category} /></main>;
}
