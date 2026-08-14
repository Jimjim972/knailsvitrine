import { getAdminAuthorization } from "@/lib/auth/admin-session";
import { getAdminGalleryPhoto } from "@/lib/data/gallery";
import { imageNotFoundResponse, imageResponseHeaders, safeImageMimeType } from "@/lib/gallery/image-delivery";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { galleryPhotoIdSchema } from "@/lib/validations/gallery";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const authorization = await getAdminAuthorization();
  if (authorization.status !== "authorized") return imageNotFoundResponse();
  const parsed = galleryPhotoIdSchema.safeParse((await context.params).id);
  if (!parsed.success) return imageNotFoundResponse();
  const photo = await getAdminGalleryPhoto(parsed.data).catch(() => null);
  if (!photo) return imageNotFoundResponse();
  const mimeType = safeImageMimeType(photo.mimeType);
  if (!mimeType) return imageNotFoundResponse();
  const supabase = await createSupabaseServerClient();
  const downloaded = await supabase.storage.from("galerie").download(photo.storagePath);
  if (downloaded.error || !downloaded.data) return imageNotFoundResponse();
  return new Response(await downloaded.data.arrayBuffer(), { status: 200, headers: imageResponseHeaders(mimeType) });
}
