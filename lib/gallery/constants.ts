export const GALLERY_BUCKET = "galerie";
export const GALLERY_CACHE_TAG = "galerie";
export const GALLERY_PAGE_SIZE = 100;

export const GALLERY_VARIANTS = ["featured", "small", "wide_small", "wide_large", "social"] as const;
export const GALLERY_VARIANT_LABELS: Record<GalleryVariant, string> = {
  featured: "Mise en avant",
  small: "Petite carte",
  wide_small: "Petite carte large",
  wide_large: "Grande carte large",
  social: "Journal social",
};
export const GALLERY_MIME_LABELS = {
  "image/jpeg": "JPEG",
  "image/png": "PNG",
  "image/webp": "WebP",
} as const;
export const GALLERY_FILE_STATES = ["ready", "pending", "repair_required"] as const;
export const GALLERY_OPERATION_KINDS = ["create", "replace", "delete"] as const;
export const GALLERY_REPAIR_CODES = [
  "upload_unconfirmed",
  "metadata_unconfirmed",
  "invalid_object_bytes",
  "new_file_cleanup",
  "old_file_cleanup",
  "object_delete_unconfirmed",
  "row_delete_unconfirmed",
  "object_missing",
  "stale_pending_no_object",
  "stale_pending_object_present",
] as const;

export const GALLERY_VARIANT_RANK: Record<GalleryVariant, number> = {
  featured: 0,
  small: 1,
  wide_small: 2,
  wide_large: 3,
  social: 4,
};

export const GALLERY_IMAGE_LIMITS = {
  inputBytes: 8 * 1024 * 1024,
  outputBytes: 1024 * 1024,
  maxInputSide: 8192,
  maxInputPixels: 25_000_000,
  maxOutputSide: 1600,
  minLongEdge: 1200,
  dimensionStep: 100,
  qualities: [0.85, 0.8, 0.75],
  pendingTimeoutMs: 10 * 60 * 1000,
} as const;

export const GALLERY_LEGACY_PATH_PATTERN = /^photos\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|jpeg|png|webp)$/;
export const GALLERY_WEBP_PATH_PATTERN = /^photos\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$/;

export type GalleryVariant = (typeof GALLERY_VARIANTS)[number];
export type GalleryFileState = (typeof GALLERY_FILE_STATES)[number];
export type GalleryOperationKind = (typeof GALLERY_OPERATION_KINDS)[number];
export type GalleryRepairCode = (typeof GALLERY_REPAIR_CODES)[number];
export type GalleryImageQuality = (typeof GALLERY_IMAGE_LIMITS.qualities)[number];
