import type {
  GalleryFileState,
  GalleryImageQuality,
  GalleryOperationKind,
  GalleryRepairCode,
  GalleryVariant,
} from "./constants.ts";

export type PublicGalleryPhoto = {
  id: string;
  imageUrl: string;
  altText: string;
  title: string | null;
  label: string | null;
  externalUrl: string | null;
  variant: GalleryVariant;
  width: number;
  height: number;
  displayOrder: number;
  createdAt: string;
};

export type AdminGalleryStatus = "active" | "hidden" | "pending" | "repair_required";

export type AdminGalleryPhoto = {
  id: string;
  thumbnailUrl: string;
  storagePath: string;
  altText: string;
  title: string | null;
  label: string | null;
  externalUrl: string | null;
  variant: GalleryVariant;
  width: number;
  height: number;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  sizeBytes: number;
  displayOrder: number;
  active: boolean;
  fileState: GalleryFileState;
  operationKind: GalleryOperationKind | null;
  operationId: string | null;
  pendingStoragePath: string | null;
  pendingWidth: number | null;
  pendingHeight: number | null;
  pendingSizeBytes: number | null;
  cleanupStoragePath: string | null;
  operationStartedAt: string | null;
  repairCode: GalleryRepairCode | null;
  status: AdminGalleryStatus;
  createdAt: string;
  updatedAt: string;
};

export type PreparedImage = {
  file: File;
  width: number;
  height: number;
  sizeBytes: number;
  quality: GalleryImageQuality;
  hasAlpha: boolean;
  previewUrl: string;
  mimeType: "image/webp";
};

export type GalleryFormValues = {
  altText: string;
  title: string;
  label: string;
  externalUrl: string;
  variant: string;
  displayOrder: string;
  active: string;
};

export type GalleryFieldErrors = Partial<Record<keyof GalleryFormValues | "photoId" | "operationId" | "image", string[]>>;

export type GalleryActionState =
  | { status: "idle"; values?: GalleryFormValues }
  | { status: "validation"; fieldErrors: GalleryFieldErrors; values?: GalleryFormValues }
  | { status: "pending"; message: string; photoId?: string; operationId?: string; uploadPath?: string; bucket?: "galerie" }
  | { status: "success"; message: string; photoId: string }
  | { status: "session_expired" | "forbidden" | "not_found" | "conflict" | "network" | "quota"; message: string; values?: GalleryFormValues }
  | { status: "repair_required"; message: string; photoId: string; operationId: string }
  | { status: "internal"; message: string; correlationId: string; values?: GalleryFormValues };

export const INITIAL_GALLERY_ACTION_STATE: GalleryActionState = { status: "idle" };

export type AdminGalleryPage = {
  photos: AdminGalleryPhoto[];
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};
