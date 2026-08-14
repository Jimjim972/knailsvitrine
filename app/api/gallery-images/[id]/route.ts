import { getPublicGalleryPhotoPath } from "@/lib/data/gallery";
import { imageNotFoundResponse, imageResponseHeaders, safeImageMimeType } from "@/lib/gallery/image-delivery";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { galleryPhotoIdSchema } from "@/lib/validations/gallery";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const parsed = galleryPhotoIdSchema.safeParse((await context.params).id); if (!parsed.success) return imageNotFoundResponse();
  const photo = await getPublicGalleryPhotoPath(parsed.data).catch(() => null); if (!photo) return imageNotFoundResponse();
  const mimeType = safeImageMimeType(photo.mimeType); if (!mimeType) return imageNotFoundResponse();
  const supabase = createPublicSupabaseClient(); const downloaded = await supabase.storage.from("galerie").download(photo.storagePath);
  if (downloaded.error || !downloaded.data) return imageNotFoundResponse();
  return new Response(await downloaded.data.arrayBuffer(), { status: 200, headers: imageResponseHeaders(mimeType) });
}
