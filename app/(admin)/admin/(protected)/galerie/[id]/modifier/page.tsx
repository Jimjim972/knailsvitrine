import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth/admin-session";
import { getAdminGalleryPhoto } from "@/lib/data/gallery";
import { GalleryForm } from "../../_components/gallery-form";
import { GalleryReplacementForm } from "../../_components/gallery-replacement-form";

export const metadata: Metadata = { title: "Modifier une photo — Administration" };
export default async function EditGalleryPhotoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const authorization = await requireAdminPage(`/admin/galerie/${id}/modifier`); if (authorization.status === "unavailable") return null;
  const photo = await getAdminGalleryPhoto(id); if (!photo) notFound();
  return <main className="admin-main content-shell admin-form-page"><header><p className="admin-eyebrow">Réalisations</p><h1 className="admin-title">Modifier la photo</h1><p>Enregistrez les informations ou remplacez le fichier par un nouveau WebP.</p></header>
    {photo.fileState === "ready" && <GalleryForm mode="edit" photo={photo} />}
    {(photo.fileState === "ready" || photo.operationKind === "replace") && <GalleryReplacementForm photoId={photo.id} variant={photo.variant} />}
  </main>;
}
