export const PUBLIC_GALLERY_COLUMNS =
  "id,alt_text,titre,libelle,lien_externe,variante_affichage,width,height,ordre_affichage,created_at";

export const ADMIN_GALLERY_COLUMNS =
  "id,storage_path,alt_text,titre,libelle,lien_externe,variante_affichage,width,height,mime_type,size_bytes,ordre_affichage,actif,file_state,operation_kind,operation_id,pending_storage_path,pending_width,pending_height,pending_size_bytes,cleanup_storage_path,operation_started_at,repair_code,created_at,updated_at";

export type PublicGalleryRow = {
  id: string;
  alt_text: string;
  titre: string | null;
  libelle: string | null;
  lien_externe: string | null;
  variante_affichage: string;
  width: number;
  height: number;
  ordre_affichage: number;
  created_at: string;
};

export type AdminGalleryRow = PublicGalleryRow & {
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  actif: boolean;
  file_state: string;
  operation_kind: string | null;
  operation_id: string | null;
  pending_storage_path: string | null;
  pending_width: number | null;
  pending_height: number | null;
  pending_size_bytes: number | null;
  cleanup_storage_path: string | null;
  operation_started_at: string | null;
  repair_code: string | null;
  updated_at: string;
};
