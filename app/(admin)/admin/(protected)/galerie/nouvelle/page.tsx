import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth/admin-session";
import { GalleryForm } from "../_components/gallery-form";

export const metadata: Metadata = { title: "Nouvelle photo — Administration" };
export default async function NewGalleryPhotoPage() {
  const authorization = await requireAdminPage("/admin/galerie/nouvelle"); if (authorization.status === "unavailable") return null;
  return <main className="admin-main content-shell admin-form-page"><header><p className="admin-eyebrow">Galerie</p><h1 className="admin-title">Nouvelle photo</h1><p>Préparez et vérifiez une image avant sa publication.</p></header><GalleryForm /></main>;
}
