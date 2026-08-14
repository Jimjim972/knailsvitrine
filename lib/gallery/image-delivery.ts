const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type GalleryImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

export function safeImageMimeType(value: string | null | undefined): GalleryImageMimeType | null {
  return ALLOWED_IMAGE_MIME_TYPES.includes(value as GalleryImageMimeType) ? value as GalleryImageMimeType : null;
}

export function imageResponseHeaders(mimeType: GalleryImageMimeType): Headers {
  return new Headers({
    "Content-Type": mimeType,
    "Content-Disposition": "inline",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, no-store",
  });
}

export function imageNotFoundResponse(): Response {
  return new Response("Image introuvable.", {
    status: 404,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
