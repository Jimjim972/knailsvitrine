import Link from "next/link";
import type { AdminGalleryPage } from "@/lib/gallery/types";
import { RepairGalleryPhotoForm } from "./repair-gallery-photo-form";
import { GalleryVisibilityForm } from "./gallery-visibility-form";
import { DeleteGalleryPhotoDialog } from "./delete-gallery-photo-dialog";
import { AdminGalleryThumbnail } from "./admin-gallery-thumbnail";
import { GALLERY_MIME_LABELS, GALLERY_VARIANT_LABELS } from "@/lib/gallery/constants";

const statusLabels = { active: "Active", hidden: "Masquée", pending: "En attente", repair_required: "À réparer" } as const;

export function GalleryList({ result }: { result: AdminGalleryPage }) {
  return <>
    <p className="admin-list-count" role="status">{result.total} photo{result.total > 1 ? "s" : ""}</p>
    <ul className="admin-gallery-list">
      {result.photos.map((photo) => <li key={photo.id} className="admin-gallery-item" data-photo-id={photo.id} data-file-state={photo.fileState}>
        <AdminGalleryThumbnail photoId={photo.id} src={photo.thumbnailUrl} width={photo.width} height={photo.height} auditable={photo.fileState === "ready"} />
        <div className="admin-gallery-copy">
          <h2>{photo.title ?? photo.altText}</h2>
          <p>{photo.altText}</p>
          <span className={`admin-state ${photo.status}`}>{statusLabels[photo.status]}</span>
        </div>
        <dl className="admin-gallery-meta">
          <div><dt>Variante</dt><dd>{GALLERY_VARIANT_LABELS[photo.variant]}</dd></div>
          <div><dt>Ordre</dt><dd>{photo.displayOrder}</dd></div>
          <div><dt>Fichier</dt><dd>{GALLERY_MIME_LABELS[photo.mimeType]} · {photo.width} × {photo.height} · {Math.ceil(photo.sizeBytes / 1024)} Kio</dd></div>
        </dl>
        {photo.status === "repair_required" && photo.operationId && <RepairGalleryPhotoForm photoId={photo.id} operationId={photo.operationId} />}
        <div className="admin-service-actions">
          {(photo.fileState === "ready" || photo.repairCode === "object_missing") && <Link className="admin-text-action" href={`/admin/galerie/${photo.id}/modifier`}>Modifier</Link>}
          {photo.fileState === "ready" && <GalleryVisibilityForm photoId={photo.id} active={photo.active} />}
          {photo.fileState !== "pending" && <DeleteGalleryPhotoDialog photoId={photo.id} name={photo.title ?? photo.altText} thumbnailUrl={photo.thumbnailUrl} />}
        </div>
      </li>)}
    </ul>
    {result.pageCount > 1 && <nav className="admin-pagination" aria-label="Pagination de la galerie">
      {result.hasPreviousPage ? <Link className="admin-button secondary" href={`/admin/galerie?page=${result.page - 1}`}>Page précédente</Link> : <span />}
      <span>Page {result.page} sur {result.pageCount}</span>
      {result.hasNextPage ? <Link className="admin-button secondary" href={`/admin/galerie?page=${result.page + 1}`}>Page suivante</Link> : <span />}
    </nav>}
  </>;
}
