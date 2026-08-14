import {
  GALLERY_FILE_STATES,
  GALLERY_OPERATION_KINDS,
  GALLERY_REPAIR_CODES,
  GALLERY_VARIANTS,
  GALLERY_VARIANT_RANK,
  type GalleryFileState,
  type GalleryOperationKind,
  type GalleryRepairCode,
} from "./constants.ts";
import type { AdminGalleryRow, PublicGalleryRow } from "./query-contract.ts";
import type { AdminGalleryPhoto, PublicGalleryPhoto } from "./types.ts";

function closedValue<T extends string>(value: string, allowed: readonly T[], label: string): T {
  if (!allowed.includes(value as T)) throw new Error(`Unknown gallery ${label}`);
  return value as T;
}

function nullableClosedValue<T extends string>(value: string | null, allowed: readonly T[], label: string): T | null {
  return value === null ? null : closedValue(value, allowed, label);
}

export function compareGalleryPhotos(
  a: Pick<PublicGalleryPhoto, "variant" | "displayOrder" | "createdAt" | "id">,
  b: Pick<PublicGalleryPhoto, "variant" | "displayOrder" | "createdAt" | "id">,
) {
  return GALLERY_VARIANT_RANK[a.variant] - GALLERY_VARIANT_RANK[b.variant]
    || a.displayOrder - b.displayOrder
    || a.createdAt.localeCompare(b.createdAt)
    || a.id.localeCompare(b.id);
}

export function sortGalleryPhotos<T extends Pick<PublicGalleryPhoto, "variant" | "displayOrder" | "createdAt" | "id">>(photos: T[]): T[] {
  return [...photos].sort(compareGalleryPhotos);
}

export function partitionPublicGalleryPhotos(photos: PublicGalleryPhoto[]) {
  const main = photos.filter((photo) => photo.variant !== "social");
  const social = photos.filter((photo) => photo.variant === "social");
  return { main, social, empty: main.length === 0 && social.length === 0 } as const;
}

export function mapPublicGalleryPhoto(row: PublicGalleryRow): PublicGalleryPhoto {
  const variant = closedValue(row.variante_affichage, GALLERY_VARIANTS, "variant");
  return {
    id: row.id,
    imageUrl: `/api/gallery-images/${row.id}`,
    altText: row.alt_text,
    title: row.titre,
    label: row.libelle,
    externalUrl: row.lien_externe,
    variant,
    width: row.width,
    height: row.height,
    displayOrder: row.ordre_affichage,
    createdAt: row.created_at,
  };
}

export function mapAdminGalleryPhoto(row: AdminGalleryRow): AdminGalleryPhoto {
  const fileState = closedValue(row.file_state, GALLERY_FILE_STATES, "file state") as GalleryFileState;
  const active = row.actif === true;
  return {
    ...mapPublicGalleryPhoto(row),
    thumbnailUrl: `/api/admin/gallery-images/${row.id}`,
    storagePath: row.storage_path,
    mimeType: closedValue(row.mime_type, ["image/jpeg", "image/png", "image/webp"] as const, "MIME"),
    sizeBytes: row.size_bytes,
    active,
    fileState,
    operationKind: nullableClosedValue(row.operation_kind, GALLERY_OPERATION_KINDS, "operation") as GalleryOperationKind | null,
    operationId: row.operation_id,
    pendingStoragePath: row.pending_storage_path,
    pendingWidth: row.pending_width,
    pendingHeight: row.pending_height,
    pendingSizeBytes: row.pending_size_bytes,
    cleanupStoragePath: row.cleanup_storage_path,
    operationStartedAt: row.operation_started_at,
    repairCode: nullableClosedValue(row.repair_code, GALLERY_REPAIR_CODES, "repair code") as GalleryRepairCode | null,
    status: fileState === "repair_required" ? "repair_required" : fileState === "pending" ? "pending" : active ? "active" : "hidden",
    updatedAt: row.updated_at,
  };
}
