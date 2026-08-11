import type { Metadata } from "next";
import { requireAdminPage } from "../../../../../../lib/auth/admin-session";
import { ServiceForm } from "../_components/service-form";

export const metadata: Metadata = { title: "Nouvelle prestation — Administration" };
export default async function NewServicePage() { const authorization = await requireAdminPage("/admin/prestations/nouvelle"); if (authorization.status === "unavailable") return null; return <main className="admin-main content-shell admin-form-page"><header><p className="admin-eyebrow">Catalogue</p><h1 className="admin-title">Nouvelle prestation</h1><p>Renseignez les informations visibles dans le catalogue.</p></header><ServiceForm mode="create" /></main>; }
