import Link from "next/link";
import type { AdminService } from "@/lib/services/types";
import { DeleteServiceDialog } from "./delete-service-dialog";
import { ServiceVisibilityForm } from "./service-visibility-form";

export function ServiceList({ services }: { services: AdminService[] }) {
  return <><p className="admin-list-count" role="status">{services.length} prestation{services.length > 1 ? "s" : ""}</p><ul className="admin-service-list">
    {services.map((service) => <li key={service.id} className="admin-service-item">
      <div className="admin-service-copy"><h2>{service.name}</h2><p>{service.categoryLabel}</p>{service.badge && <span className="admin-badge">{service.badge}</span>}</div>
      <dl className="admin-service-meta"><div><dt>Ordre</dt><dd>{service.displayOrder}</dd></div><div><dt>Statut</dt><dd><span className={service.active ? "admin-state active" : "admin-state hidden"}>{service.active ? "Active" : "Masquée"}</span></dd></div></dl>
      <div className="admin-service-actions"><Link className="admin-text-action" href={`/admin/prestations/${service.id}/modifier`}>Modifier</Link><ServiceVisibilityForm serviceId={service.id} active={service.active} /><DeleteServiceDialog serviceId={service.id} serviceName={service.name} /></div>
    </li>)}
  </ul></>;
}
