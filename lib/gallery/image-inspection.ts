import { GALLERY_IMAGE_LIMITS } from "./constants.ts";

export type InspectedImage = { mimeType: "image/jpeg" | "image/png" | "image/webp"; width: number; height: number; hasAlpha: boolean };

const INSPECTION_ERROR_MESSAGES = {
  empty: "Le fichier sélectionné est vide.",
  too_large: "L’image dépasse la limite de 8 Mio.",
  unsupported: "Choisissez une image fixe JPEG, PNG ou WebP.",
  mime_mismatch: "Le contenu réel de l’image ne correspond pas à son type déclaré.",
  extension_mismatch: "L’extension du fichier ne correspond pas à son contenu réel.",
  malformed: "Le fichier image est incomplet ou endommagé.",
  animated: "Les images animées ne sont pas acceptées. Choisissez une image fixe.",
  dimensions: "L’image dépasse 8 192 px par côté ou 25 millions de pixels.",
} as const;

export class GalleryImageInspectionError extends Error {
  readonly code: "empty" | "too_large" | "unsupported" | "mime_mismatch" | "extension_mismatch" | "malformed" | "animated" | "dimensions";

  constructor(code: GalleryImageInspectionError["code"]) {
    super(INSPECTION_ERROR_MESSAGES[code]);
    this.name = "GalleryImageInspectionError";
    this.code = code;
  }
}

export function inspectGalleryImage(bytes: Uint8Array, declaredMimeType = "", fileName = ""): InspectedImage {
  if (bytes.byteLength === 0) throw new GalleryImageInspectionError("empty");
  if (bytes.byteLength > GALLERY_IMAGE_LIMITS.inputBytes) throw new GalleryImageInspectionError("too_large");
  let inspected: InspectedImage;
  if (isJpeg(bytes)) inspected = inspectJpeg(bytes);
  else if (isPng(bytes)) inspected = inspectPng(bytes);
  else if (isWebp(bytes)) inspected = inspectWebp(bytes);
  else throw new GalleryImageInspectionError("unsupported");
  if (declaredMimeType && declaredMimeType !== inspected.mimeType) throw new GalleryImageInspectionError("mime_mismatch");
  if (fileName) {
    const extension = fileName.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "";
    const accepted = inspected.mimeType === "image/jpeg" ? ["jpg", "jpeg"] : inspected.mimeType === "image/png" ? ["png"] : ["webp"];
    if (!accepted.includes(extension)) throw new GalleryImageInspectionError("extension_mismatch");
  }
  validateDimensions(inspected.width, inspected.height);
  return inspected;
}

function validateDimensions(width: number, height: number) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1
    || width > GALLERY_IMAGE_LIMITS.maxInputSide || height > GALLERY_IMAGE_LIMITS.maxInputSide
    || width * height > GALLERY_IMAGE_LIMITS.maxInputPixels) throw new GalleryImageInspectionError("dimensions");
}

function isJpeg(bytes: Uint8Array) { return bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff; }
function isPng(bytes: Uint8Array) { return bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value); }
function isWebp(bytes: Uint8Array) { return bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP"; }
function uint16be(bytes: Uint8Array, offset: number) { return bytes[offset] * 256 + bytes[offset + 1]; }
function uint32be(bytes: Uint8Array, offset: number) { return bytes[offset] * 0x1000000 + bytes[offset + 1] * 0x10000 + bytes[offset + 2] * 0x100 + bytes[offset + 3]; }
function uint32le(bytes: Uint8Array, offset: number) { return (bytes[offset] | bytes[offset + 1] << 8 | bytes[offset + 2] << 16 | bytes[offset + 3] << 24) >>> 0; }
function ascii(bytes: Uint8Array, offset: number, length: number) { return String.fromCharCode(...bytes.subarray(offset, offset + length)); }

function inspectJpeg(bytes: Uint8Array): InspectedImage {
  const sof = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  let offset = 2;
  while (offset < bytes.length) {
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.length) break;
    const marker = bytes[offset++];
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.length) throw new GalleryImageInspectionError("malformed");
    const length = uint16be(bytes, offset);
    if (length < 2 || offset + length > bytes.length) throw new GalleryImageInspectionError("malformed");
    if (sof.has(marker)) {
      if (length < 7) throw new GalleryImageInspectionError("malformed");
      return { mimeType: "image/jpeg", height: uint16be(bytes, offset + 3), width: uint16be(bytes, offset + 5), hasAlpha: false };
    }
    offset += length;
  }
  throw new GalleryImageInspectionError("malformed");
}

function inspectPng(bytes: Uint8Array): InspectedImage {
  let offset = 8;
  let width = 0; let height = 0; let hasAlpha = false; let first = true;
  while (offset + 12 <= bytes.length) {
    const length = uint32be(bytes, offset);
    if (length > bytes.length - offset - 12) throw new GalleryImageInspectionError("malformed");
    const type = ascii(bytes, offset + 4, 4);
    const dataOffset = offset + 8;
    if (first) {
      if (type !== "IHDR" || length !== 13) throw new GalleryImageInspectionError("malformed");
      width = uint32be(bytes, dataOffset); height = uint32be(bytes, dataOffset + 4);
      const colorType = bytes[dataOffset + 9];
      if (![0, 2, 3, 4, 6].includes(colorType)) throw new GalleryImageInspectionError("malformed");
      hasAlpha = colorType === 4 || colorType === 6;
      first = false;
    }
    if (type === "acTL") throw new GalleryImageInspectionError("animated");
    if (type === "tRNS") hasAlpha = true;
    offset += 12 + length;
    if (type === "IEND") {
      if (offset !== bytes.length) throw new GalleryImageInspectionError("malformed");
      return { mimeType: "image/png", width, height, hasAlpha };
    }
  }
  throw new GalleryImageInspectionError("malformed");
}

export function inspectWebp(bytes: Uint8Array): InspectedImage {
  if (!isWebp(bytes) || uint32le(bytes, 4) !== bytes.length - 8) throw new GalleryImageInspectionError("malformed");
  let offset = 12; let width = 0; let height = 0; let hasAlpha = false; let imageChunks = 0;
  while (offset + 8 <= bytes.length) {
    const type = ascii(bytes, offset, 4);
    const length = uint32le(bytes, offset + 4);
    const dataOffset = offset + 8;
    const paddedLength = length + (length & 1);
    if (length > bytes.length - dataOffset || dataOffset + paddedLength > bytes.length) throw new GalleryImageInspectionError("malformed");
    if (type === "ANIM" || type === "ANMF") throw new GalleryImageInspectionError("animated");
    if (type === "VP8X") {
      if (length !== 10 || bytes[dataOffset] & 0x02) throw new GalleryImageInspectionError(bytes[dataOffset] & 0x02 ? "animated" : "malformed");
      hasAlpha ||= Boolean(bytes[dataOffset] & 0x10);
      width = 1 + bytes[dataOffset + 4] + (bytes[dataOffset + 5] << 8) + (bytes[dataOffset + 6] << 16);
      height = 1 + bytes[dataOffset + 7] + (bytes[dataOffset + 8] << 8) + (bytes[dataOffset + 9] << 16);
    } else if (type === "VP8L") {
      if (length < 5 || bytes[dataOffset] !== 0x2f) throw new GalleryImageInspectionError("malformed");
      const bits = uint32le(bytes, dataOffset + 1);
      width ||= (bits & 0x3fff) + 1; height ||= ((bits >>> 14) & 0x3fff) + 1; hasAlpha = true; imageChunks += 1;
    } else if (type === "VP8 ") {
      if (length < 10 || bytes[dataOffset + 3] !== 0x9d || bytes[dataOffset + 4] !== 0x01 || bytes[dataOffset + 5] !== 0x2a) throw new GalleryImageInspectionError("malformed");
      width ||= (bytes[dataOffset + 6] | bytes[dataOffset + 7] << 8) & 0x3fff;
      height ||= (bytes[dataOffset + 8] | bytes[dataOffset + 9] << 8) & 0x3fff; imageChunks += 1;
    } else if (type === "ALPH") hasAlpha = true;
    offset = dataOffset + paddedLength;
  }
  if (offset !== bytes.length || imageChunks !== 1 || width === 0 || height === 0) throw new GalleryImageInspectionError("malformed");
  return { mimeType: "image/webp", width, height, hasAlpha };
}
