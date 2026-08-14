import { GALLERY_IMAGE_LIMITS } from "./constants.ts";
import { inspectGalleryImage } from "./image-inspection.ts";
import { parseWebpChunks } from "./webp-riff.ts";

export type PublishedImageExpectation = { width: number; height: number; sizeBytes: number; mimeType: "image/webp" };

export function validatePublishedWebp(bytes: Uint8Array, expected: PublishedImageExpectation) {
  if (bytes.byteLength !== expected.sizeBytes || bytes.byteLength > GALLERY_IMAGE_LIMITS.outputBytes || expected.mimeType !== "image/webp") throw new Error("invalid_object_bytes");
  const inspected = inspectGalleryImage(bytes, "image/webp");
  if (inspected.width !== expected.width || inspected.height !== expected.height) throw new Error("invalid_object_bytes");
  const allowed = new Set(["VP8X", "ALPH", "VP8 ", "VP8L"]);
  if (parseWebpChunks(bytes).some(({ type }) => !allowed.has(type))) throw new Error("invalid_object_bytes");
  return { ...inspected, sizeBytes: bytes.byteLength, mimeType: "image/webp" as const };
}
