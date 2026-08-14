import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createSupabaseServerClient } from "../supabase/server";
import { createGalleryReadFailure } from "../gallery/diagnostics";
import { getGalleryE2EScenario } from "../gallery/e2e-scenario";
import { mapAdminGalleryPhoto, sortGalleryPhotos } from "../gallery/mappers";
import { ADMIN_GALLERY_COLUMNS, PUBLIC_GALLERY_COLUMNS, type AdminGalleryRow, type PublicGalleryRow } from "../gallery/query-contract";
import { GALLERY_CACHE_TAG, GALLERY_PAGE_SIZE } from "../gallery/constants";
import { galleryPhotoIdSchema } from "../validations/gallery";
import type { AdminGalleryPage, AdminGalleryPhoto, PublicGalleryPhoto } from "../gallery/types";
import { getAdminAuthorization } from "../auth/admin-session";
import { createPublicSupabaseClient } from "../supabase/public";
import { mapPublicGalleryPhoto } from "../gallery/mappers";

export async function getAdminGalleryPhotos(page: number, pageSize = GALLERY_PAGE_SIZE): Promise<AdminGalleryPage> {
  await requireGalleryReadAuthorization();
  const safePageSize = Number.isInteger(pageSize) ? Math.min(Math.max(pageSize, 1), GALLERY_PAGE_SIZE) : GALLERY_PAGE_SIZE;
  const safePage = Number.isInteger(page) && page > 0 ? page : 1;
  const scenario = getGalleryE2EScenario();
  if (scenario === "admin-empty") return emptyPage(safePage, safePageSize);
  if (scenario === "admin-unavailable") throw createGalleryReadFailure({ code: "network_scenario" });
  const from = (safePage - 1) * safePageSize;
  const supabase = await createSupabaseServerClient();
  const result = await supabase.from("photos_galerie").select(ADMIN_GALLERY_COLUMNS, { count: "exact" })
    .order("variante_affichage").order("ordre_affichage").order("created_at").order("id")
    .range(from, from + safePageSize - 1);
  if (result.error) throw createGalleryReadFailure(result.error, result.status);
  const total = result.count ?? 0;
  const photos = sortGalleryPhotos((result.data as unknown as AdminGalleryRow[]).map(mapAdminGalleryPhoto));
  const pageCount = Math.max(1, Math.ceil(total / safePageSize));
  return {
    photos, page: safePage, pageSize: safePageSize, total, pageCount,
    hasPreviousPage: safePage > 1,
    hasNextPage: safePage < pageCount,
  };
}

export async function getAdminGalleryPhoto(id: string): Promise<AdminGalleryPhoto | null> {
  await requireGalleryReadAuthorization();
  const parsed = galleryPhotoIdSchema.safeParse(id);
  if (!parsed.success) return null;
  const supabase = await createSupabaseServerClient();
  const result = await supabase.from("photos_galerie").select(ADMIN_GALLERY_COLUMNS).eq("id", parsed.data).maybeSingle();
  if (result.error) throw createGalleryReadFailure(result.error, result.status);
  return result.data ? mapAdminGalleryPhoto(result.data as unknown as AdminGalleryRow) : null;
}

export async function getPublicGalleryPhotos(): Promise<PublicGalleryPhoto[]> {
  "use cache";
  cacheLife("days"); cacheTag(GALLERY_CACHE_TAG);
  const supabase = createPublicSupabaseClient();
  const result = await supabase.from("photos_galerie").select(PUBLIC_GALLERY_COLUMNS).eq("actif", true).eq("file_state", "ready")
    .order("variante_affichage").order("ordre_affichage").order("created_at").order("id");
  if (result.error) throw createGalleryReadFailure(result.error, result.status);
  return sortGalleryPhotos((result.data as PublicGalleryRow[]).map(mapPublicGalleryPhoto));
}

export async function getPublicGalleryPhotoPath(id: string): Promise<{ storagePath: string; mimeType: string } | null> {
  const parsed = galleryPhotoIdSchema.safeParse(id); if (!parsed.success) return null;
  const supabase = createPublicSupabaseClient();
  const result = await supabase.from("photos_galerie").select("storage_path,mime_type").eq("id", parsed.data).eq("actif", true).eq("file_state", "ready").maybeSingle();
  if (result.error || !result.data) return null;
  return { storagePath: result.data.storage_path, mimeType: result.data.mime_type };
}

function emptyPage(page: number, pageSize: number): AdminGalleryPage {
  return { photos: [], page, pageSize, total: 0, pageCount: 1, hasPreviousPage: page > 1, hasNextPage: false };
}

async function requireGalleryReadAuthorization() {
  const authorization = await getAdminAuthorization();
  if (authorization.status !== "authorized") throw createGalleryReadFailure({ status: 403 }, 403);
}
