import Link from "next/link";
import type { AdminServiceCategory } from "@/lib/services/types";
import { DeleteServiceCategoryDialog } from "./delete-service-category-dialog";

export function ServiceCategoryList({ categories }: { categories: AdminServiceCategory[] }) {
  return <>
    <p className="admin-list-count" role="status">{categories.length} catégorie{categories.length > 1 ? "s" : ""}</p>
    <ul className="admin-service-list">
      {categories.map((category) => <li key={category.code} className="admin-service-item admin-category-item">
        <div className="admin-service-copy"><h2>{category.name}</h2><p>{category.serviceCount} prestation{category.serviceCount > 1 ? "s" : ""}</p></div>
        <dl className="admin-service-meta"><div><dt>Ordre</dt><dd>{category.displayOrder}</dd></div></dl>
        <div className="admin-service-actions"><Link className="admin-text-action" href={`/admin/prestations/categories/${category.code}/modifier`}>Modifier</Link><DeleteServiceCategoryDialog categoryCode={category.code} categoryName={category.name} serviceCount={category.serviceCount} /></div>
      </li>)}
    </ul>
  </>;
}
