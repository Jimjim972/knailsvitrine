import assert from "node:assert/strict";
import test from "node:test";
import { parseWebpChunks, sanitizeWebp } from "../../../lib/gallery/webp-riff.ts";
import { losslessWebp } from "./image-fixtures.ts";

test("removes ICCP, EXIF, XMP and unknown chunks while fixing RIFF padding", () => {
  const dirty = losslessWebp(10, 20, [
    { type: "ICCP", data: new Uint8Array([1]) }, { type: "EXIF", data: new Uint8Array([2, 3]) },
    { type: "XMP ", data: new Uint8Array([4]) }, { type: "JUNK", data: new Uint8Array([5, 6, 7]) },
  ]);
  const clean = sanitizeWebp(dirty);
  assert.deepEqual(parseWebpChunks(clean).map(({ type }) => type), ["VP8L"]);
  assert.equal(new DataView(clean.buffer).getUint32(4, true), clean.length - 8);
});
