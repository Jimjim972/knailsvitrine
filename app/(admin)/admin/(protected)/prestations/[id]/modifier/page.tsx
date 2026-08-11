import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdminPage } from "../../../../../../../lib/auth/admin-session";
import { getAdminService } from "../../../../../../../lib/data/services";
import { ServiceForm } from "../../_components/service-form";

export const metadata: Metadata = { title: "Modifier une prestation — Administration" };
export default async function EditServicePage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; const path = `/admin/prestations/${id}/modifier`; const authorization = await requireAdminPage(path); if (authorization.status === "unavailable") return null; const service = await getAdminService(id); if (!service) notFound(); return <main className="admin-main content-shell admin-form-page"><header><p className="admin-eyebrow">Catalogue</p><h1 className="admin-title">Modifier la prestation</h1><p>Modifiez uniquement les informations nécessaires.</p></header><ServiceForm mode="edit" service={service} /></main>; }
