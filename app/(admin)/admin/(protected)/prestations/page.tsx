import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { requireAdminPage } from "../../../../../lib/auth/admin-session";
import { getAdminServices } from "../../../../../lib/data/services";
import { ServiceList } from "./_components/service-list";
import { ServiceSuccessMessage } from "./_components/service-success-message";
import { parseServiceSuccessFlash, SERVICE_SUCCESS_FLASH_HEADER, serviceSuccessMessage } from "@/lib/services/success-flash";

export const metadata: Metadata = { title: "Prestations — Administration", description: "Gérer les prestations K'nails." };

export default async function AdminServicesPage() {
  const authorization = await requireAdminPage("/admin/prestations"); if (authorization.status === "unavailable") return null;
  const services = await getAdminServices();
  const success = parseServiceSuccessFlash((await headers()).get(SERVICE_SUCCESS_FLASH_HEADER) ?? undefined);
  return <main className="admin-main content-shell"><header className="admin-page-header"><div><p className="admin-eyebrow">Catalogue</p><h1 className="admin-title">Prestations</h1><p>Consultez, classez et publiez les soins proposés par l’institut.</p></div><div className="admin-page-actions"><Link className="admin-button secondary" href="/admin/prestations/categories">Catégories</Link><Link className="admin-button secondary" href="/admin/prestations/categories/nouvelle">Nouvelle catégorie</Link><Link className="admin-button primary" href="/admin/prestations/nouvelle">Nouvelle prestation</Link></div></header>
    {success && <ServiceSuccessMessage>{serviceSuccessMessage(success)}</ServiceSuccessMessage>}
    {services.length === 0 ? <section className="admin-empty-state"><h2>Aucune prestation</h2><p>Créez la première prestation du catalogue.</p><Link className="admin-button primary" href="/admin/prestations/nouvelle">Créer une prestation</Link></section> : <ServiceList services={services} />}
  </main>;
}
