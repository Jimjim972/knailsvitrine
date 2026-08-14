import { GALLERY_IMAGE_LIMITS, type GalleryImageQuality } from "./constants.ts";
import { inspectGalleryImage } from "./image-inspection.ts";
import { sanitizeWebp } from "./webp-riff.ts";
import type { PreparedImage } from "./types.ts";

export type EncodeCandidate = { width: number; height: number; quality: GalleryImageQuality };
export type EncodedCandidate = EncodeCandidate & { bytes: Uint8Array };

export function imageEncodeCandidates(width: number, height: number): EncodeCandidate[] {
  const longEdge = Math.max(width, height);
  const initial = Math.min(longEdge, GALLERY_IMAGE_LIMITS.maxOutputSide);
  const minimum = Math.min(longEdge, GALLERY_IMAGE_LIMITS.minLongEdge);
  const edges: number[] = [];
  for (let edge = initial; edge >= minimum; edge -= GALLERY_IMAGE_LIMITS.dimensionStep) edges.push(edge);
  if (edges.at(-1) !== minimum) edges.push(minimum);
  return edges.flatMap((edge) => {
    const scale = edge / longEdge;
    const candidateWidth = Math.max(1, Math.round(width * scale));
    const candidateHeight = Math.max(1, Math.round(height * scale));
    return GALLERY_IMAGE_LIMITS.qualities.map((quality) => ({ width: candidateWidth, height: candidateHeight, quality }));
  });
}

export async function selectEncodedCandidate(
  width: number,
  height: number,
  encode: (candidate: EncodeCandidate) => Promise<Uint8Array>,
  signal?: AbortSignal,
): Promise<EncodedCandidate | null> {
  for (const candidate of imageEncodeCandidates(width, height)) {
    if (signal?.aborted) throw new DOMException("Traitement annulé", "AbortError");
    const bytes = await encode(candidate);
    if (bytes.byteLength <= GALLERY_IMAGE_LIMITS.outputBytes) return { ...candidate, bytes };
  }
  return null;
}

export async function prepareGalleryImage(file: File, signal?: AbortSignal): Promise<PreparedImage> {
  const sourceBytes = new Uint8Array(await file.arrayBuffer());
  const inspected = inspectGalleryImage(sourceBytes, file.type, file.name);
  const source = await decodeImage(file);
  try {
    const decodedWidth = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
    const decodedHeight = source instanceof HTMLImageElement ? source.naturalHeight : source.height;
    const dimensionsMatch = (decodedWidth === inspected.width && decodedHeight === inspected.height)
      || (decodedWidth === inspected.height && decodedHeight === inspected.width);
    if (!dimensionsMatch) throw new Error("Les dimensions décodées ne correspondent pas au fichier.");
    for (const candidate of imageEncodeCandidates(decodedWidth, decodedHeight)) {
      if (signal?.aborted) throw new DOMException("Traitement annulé", "AbortError");
      const canvas = document.createElement("canvas"); canvas.width = candidate.width; canvas.height = candidate.height;
      const context = canvas.getContext("2d", { alpha: true, colorSpace: "srgb" });
      if (!context) throw new Error("Canvas indisponible");
      context.imageSmoothingEnabled = true; context.imageSmoothingQuality = "high";
      context.clearRect(0, 0, canvas.width, canvas.height); context.drawImage(source, 0, 0, canvas.width, canvas.height);
      const blob = await canvasToWebp(canvas, candidate.quality);
      canvas.width = 0; canvas.height = 0;
      if (!blob || blob.type !== "image/webp") throw new Error("Ce navigateur ne peut pas convertir l’image en WebP.");
      const sanitized = sanitizeWebp(new Uint8Array(await blob.arrayBuffer()));
      if (sanitized.byteLength <= GALLERY_IMAGE_LIMITS.outputBytes) {
        const sanitizedBuffer = new ArrayBuffer(sanitized.byteLength);
        new Uint8Array(sanitizedBuffer).set(sanitized);
        const outputBlob = new Blob([sanitizedBuffer], { type: "image/webp" });
        const outputFile = new File([outputBlob], `${crypto.randomUUID()}.webp`, { type: "image/webp" });
        return { file: outputFile, width: candidate.width, height: candidate.height, sizeBytes: outputFile.size, quality: candidate.quality, hasAlpha: inspected.hasAlpha, previewUrl: URL.createObjectURL(outputFile), mimeType: "image/webp" };
      }
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
    throw new Error("L’image ne peut pas être réduite sous 1 Mio sans dépasser les limites de qualité.");
  } finally {
    if ("close" in source && typeof source.close === "function") source.close();
  }
}

async function decodeImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try { return await createImageBitmap(file, { imageOrientation: "from-image", colorSpaceConversion: "default", premultiplyAlpha: "default" }); }
    catch { try { return await createImageBitmap(file); } catch { /* HTML fallback */ } }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image(); image.decoding = "async"; image.src = url; await image.decode(); return image;
  } finally { URL.revokeObjectURL(url); }
}

function canvasToWebp(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
}
