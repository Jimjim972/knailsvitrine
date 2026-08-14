import { buildWebp, type WebpChunk } from "../../../lib/gallery/webp-riff.ts";

function jpeg(width = 10, height = 20) {
  return new Uint8Array([0xff, 0xd8, 0xff, 0xc0, 0, 17, 8, height >> 8, height & 255, width >> 8, width & 255, 3, 1, 0x11, 0, 2, 0x11, 0, 3, 0x11, 0, 0xff, 0xd9]);
}

function png(width = 10, height = 20, colorType = 6, animated = false) {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  const chunk = (type: string, data: number[]) => [data.length >>> 24, data.length >>> 16 & 255, data.length >>> 8 & 255, data.length & 255, ...type.split("").map((value) => value.charCodeAt(0)), ...data, 0, 0, 0, 0];
  const ihdr = [width >>> 24, width >>> 16 & 255, width >>> 8 & 255, width & 255, height >>> 24, height >>> 16 & 255, height >>> 8 & 255, height & 255, 8, colorType, 0, 0, 0];
  return new Uint8Array([...signature, ...chunk("IHDR", ihdr), ...(animated ? chunk("acTL", [0, 0, 0, 2, 0, 0, 0, 0]) : []), ...chunk("IEND", [])]);
}

const INPUT_LIMIT = 8 * 1024 * 1024;

function paddedJpeg(size: number) {
  const result = new Uint8Array(size); result.set(jpeg()); return result;
}

function paddedPng(size: number) {
  const basic = png(); const result = new Uint8Array(size); const iend = basic.subarray(basic.length - 12); const paddingLength = size - 57;
  result.set(basic.subarray(0, basic.length - 12)); const offset = basic.length - 12;
  new DataView(result.buffer).setUint32(offset, paddingLength, false); result.set([114, 117, 83, 116], offset + 4); result.set(iend, size - 12);
  return result;
}

function paddedWebp(size: number) {
  const payloadLength = size - losslessWebp().length - 8;
  return losslessWebp(10, 20, [{ type: "JUNK", data: new Uint8Array(payloadLength) }]);
}

export function losslessWebp(width = 10, height = 20, extra: WebpChunk[] = []) {
  const bits = (width - 1) | ((height - 1) << 14);
  return buildWebp([...extra, { type: "VP8L", data: new Uint8Array([0x2f, bits & 255, bits >>> 8 & 255, bits >>> 16 & 255, bits >>> 24 & 255]) }]);
}

const animatedWebp = () => {
  const still = losslessWebp();
  const body = [...still.slice(12), ...[65, 78, 73, 77, 0, 0, 0, 0]];
  const bytes = new Uint8Array(12 + body.length); bytes.set([82, 73, 70, 70], 0);
  new DataView(bytes.buffer).setUint32(4, bytes.length - 8, true); bytes.set([87, 69, 66, 80], 8); bytes.set(body, 12); return bytes;
};

export const GALLERY_BROWSER_FIXTURES = {
  orientation: "tests/fixtures/gallery/orientation-6.jpg",
  alphaUnchanged: "tests/fixtures/gallery/alpha-unchanged.png",
  alphaResized: "tests/fixtures/gallery/alpha-resized.png",
  colors: ["srgb-red", "srgb-green", "srgb-blue", "p3-red", "p3-green", "p3-blue"].map((name) => `tests/fixtures/gallery/${name}.png`),
} as const;

export const IMAGE_FIXTURES = [
  { id: "F01", accepted: true, name: "photo.jpg", type: "image/jpeg", bytes: jpeg() },
  { id: "F02", accepted: true, name: "photo.png", type: "image/png", bytes: png() },
  { id: "F03", accepted: true, name: "photo.webp", type: "image/webp", bytes: losslessWebp() },
  { id: "F04", accepted: true, name: "photo.jpg", type: "image/jpeg", bytes: paddedJpeg(INPUT_LIMIT - 1) },
  { id: "F05", accepted: true, name: "photo.png", type: "image/png", bytes: paddedPng(INPUT_LIMIT) },
  { id: "F06", accepted: true, name: "photo.webp", type: "image/webp", bytes: paddedWebp(INPUT_LIMIT) },
  { id: "F07", accepted: false, name: "vide.jpg", type: "image/jpeg", bytes: new Uint8Array() },
  { id: "F08", accepted: false, name: "photo.jpg", type: "image/jpeg", bytes: paddedJpeg(INPUT_LIMIT + 1) },
  { id: "F09", accepted: false, name: "photo.png", type: "image/png", bytes: paddedPng(INPUT_LIMIT + 1) },
  { id: "F10", accepted: false, name: "attaque.svg", type: "image/svg+xml", bytes: new TextEncoder().encode("<svg></svg>") },
  { id: "F11", accepted: false, name: "animation.gif", type: "image/gif", bytes: new TextEncoder().encode("GIF89a") },
  { id: "F12", accepted: false, name: "animation.png", type: "image/png", bytes: png(10, 10, 6, true) },
  { id: "F13", accepted: false, name: "animation.webp", type: "image/webp", bytes: animatedWebp() },
  { id: "F14", accepted: false, name: "video.mp4", type: "video/mp4", bytes: new TextEncoder().encode("....ftyp") },
  { id: "F15", accepted: false, name: "programme.exe", type: "application/x-msdownload", bytes: new Uint8Array([77, 90, 0, 0]) },
  { id: "F16", accepted: false, name: "photo.jpg", type: "image/png", bytes: jpeg() },
  { id: "F17", accepted: false, name: "photo.png", type: "image/webp", bytes: png() },
  { id: "F18", accepted: false, name: "photo.webp", type: "image/jpeg", bytes: losslessWebp() },
  { id: "F19", accepted: false, name: "mensonge.png", type: "image/jpeg", bytes: jpeg() },
  { id: "F20", accepted: false, name: "mensonge.webp", type: "image/png", bytes: png() },
] as const;

const validServerWebp = losslessWebp(10, 20);
export const SERVER_OBJECT_FIXTURES = [
  { id: "S01", accepted: true, bytes: validServerWebp, width: 10, height: 20 },
  { id: "S02", accepted: false, bytes: png(10, 20), width: 10, height: 20 },
  { id: "S03", accepted: false, bytes: validServerWebp.slice(0, -1), width: 10, height: 20 },
  { id: "S04", accepted: false, bytes: animatedWebp(), width: 10, height: 20 },
  { id: "S05", accepted: false, bytes: validServerWebp, width: 11, height: 20 },
  { id: "S06", accepted: false, bytes: losslessWebp(10, 20, [{ type: "EXIF", data: new Uint8Array([1]) }]), width: 10, height: 20 },
  { id: "S07", accepted: false, bytes: losslessWebp(10, 20, [{ type: "ICCP", data: new Uint8Array([1]) }]), width: 10, height: 20 },
  { id: "S08", accepted: false, bytes: losslessWebp(10, 20, [{ type: "JUNK", data: new Uint8Array([1]) }]), width: 10, height: 20 },
] as const;
