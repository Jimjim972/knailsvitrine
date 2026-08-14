import type { Metadata } from "next";
import { headers } from "next/headers";
import { requireAdminPage } from "@/lib/auth/admin-session";
import { getAdminGalleryPhotos } from "@/lib/data/gallery";
import { GalleryList } from "./_components/gallery-list";
import Link from "next/link";
import { PendingOperationReconciler } from "./_components/pending-operation-reconciler";
import { GallerySuccessMessage } from "./_components/gallery-success-message";
import { GALLERY_SUCCESS_FLASH_HEADER, gallerySuccessMessage, parseGallerySuccessFlash } from "@/lib/services/success-flash";

export const metadata: Metadata = { title: "Galerie — Administration", description: "Gérer la galerie K'nails." };

export default async function AdminGalleryPage({ searchParams }: { searchParams: Promise<{ page?: string | string[] }> }) {
  const authorization = await requireAdminPage("/admin/galerie");
  if (authorization.status === "unavailable") return null;
  const rawPage = (await searchParams).page;
  const page = typeof rawPage === "string" && /^\d+$/.test(rawPage) ? Math.max(1, Number(rawPage)) : 1;
  const result = await getAdminGalleryPhotos(page);
  const success = parseGallerySuccessFlash((await headers()).get(GALLERY_SUCCESS_FLASH_HEADER) ?? undefined);
  return <main className="admin-main content-shell">
    <PendingOperationReconciler />
    <header className="admin-page-header"><div><p className="admin-eyebrow">Réalisations</p><h1 className="admin-title">Galerie</h1><p>Consultez les photos, leur visibilité et l’état de leurs fichiers.</p></div><Link className="admin-button primary" href="/admin/galerie/nouvelle">Nouvelle photo</Link></header>
    {success && <GallerySuccessMessage>{gallerySuccessMessage(success)}</GallerySuccessMessage>}
    {result.photos.length === 0
      ? <section className="admin-empty-state"><h2>Aucune photo</h2><p>La galerie ne contient encore aucune photo.</p><Link className="admin-button primary" href="/admin/galerie/nouvelle">Ajouter une photo</Link></section>
      : <GalleryList result={result} />}
  </main>;
}
