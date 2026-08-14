import { inspectWebp } from "./image-inspection.ts";

export type WebpChunk = { type: string; data: Uint8Array };

export function parseWebpChunks(bytes: Uint8Array): WebpChunk[] {
  inspectWebp(bytes);
  const chunks: WebpChunk[] = [];
  for (let offset = 12; offset < bytes.length;) {
    const type = String.fromCharCode(...bytes.subarray(offset, offset + 4));
    const length = readUint32le(bytes, offset + 4);
    chunks.push({ type, data: bytes.slice(offset + 8, offset + 8 + length) });
    offset += 8 + length + (length & 1);
  }
  return chunks;
}

export function sanitizeWebp(bytes: Uint8Array): Uint8Array {
  const inspected = inspectWebp(bytes);
  const essential = new Set(["VP8X", "ALPH", "VP8 ", "VP8L"]);
  const chunks = parseWebpChunks(bytes).filter(({ type }) => essential.has(type)).map(({ type, data }) => {
    if (type !== "VP8X") return { type, data };
    const clean = data.slice();
    clean[0] &= inspected.hasAlpha ? 0x10 : 0;
    return { type, data: clean };
  });
  return buildWebp(chunks);
}

export function buildWebp(chunks: WebpChunk[]): Uint8Array {
  const bodyLength = 4 + chunks.reduce((total, chunk) => total + 8 + chunk.data.length + (chunk.data.length & 1), 0);
  const output = new Uint8Array(8 + bodyLength);
  writeAscii(output, 0, "RIFF"); writeUint32le(output, 4, bodyLength); writeAscii(output, 8, "WEBP");
  let offset = 12;
  for (const chunk of chunks) {
    if (chunk.type.length !== 4) throw new Error("Invalid WebP chunk type");
    writeAscii(output, offset, chunk.type); writeUint32le(output, offset + 4, chunk.data.length);
    output.set(chunk.data, offset + 8); offset += 8 + chunk.data.length + (chunk.data.length & 1);
  }
  inspectWebp(output);
  return output;
}

function readUint32le(bytes: Uint8Array, offset: number) { return (bytes[offset] | bytes[offset + 1] << 8 | bytes[offset + 2] << 16 | bytes[offset + 3] << 24) >>> 0; }
function writeUint32le(bytes: Uint8Array, offset: number, value: number) { new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).setUint32(offset, value, true); }
function writeAscii(bytes: Uint8Array, offset: number, value: string) { for (let index = 0; index < value.length; index += 1) bytes[offset + index] = value.charCodeAt(index); }
