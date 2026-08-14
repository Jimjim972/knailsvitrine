import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { boundedPixel, ciede2000, COLOR_REFERENCE_MANIFEST, percentile95, srgb8ToLabD65 } from "./color-reference-manifest.ts";

test("the six color fixtures expose exactly 150 bounded reference samples", () => {
  assert.equal(COLOR_REFERENCE_MANIFEST.length, 6);
  assert.equal(COLOR_REFERENCE_MANIFEST.flatMap(({ samples }) => samples).length, 150);
  for (const fixture of COLOR_REFERENCE_MANIFEST) assert.equal(existsSync(fixture.path), true);
  assert.equal(boundedPixel(0, 17), 0); assert.equal(boundedPixel(1, 17), 16);
  assert.equal(boundedPixel(-2, 17), 0); assert.equal(boundedPixel(3, 17), 16);
  assert.equal(percentile95(Array.from({ length: 150 }, (_, index) => index)), 142);
});

function pngChunk(path: string, searchedType: string) {
  const bytes = readFileSync(path);
  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.subarray(offset + 4, offset + 8).toString("ascii");
    if (type === searchedType) return bytes.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;
  }
  return null;
}

test("the color corpus embeds three sRGB and three distinct Display-P3 profiles", () => {
  const profileHashes: string[] = [];
  for (const fixture of COLOR_REFERENCE_MANIFEST) {
    const profile = pngChunk(fixture.path, "iCCP");
    assert.ok(profile);
    profileHashes.push(profile.toString("base64"));
  }
  assert.equal(new Set(COLOR_REFERENCE_MANIFEST.map(({ profile }) => profile)).size, 2);
  assert.notEqual(profileHashes[0], profileHashes[3]);
});

test("sRGB to Lab D65 and CIEDE2000 match published reference pairs", () => {
  const white = srgb8ToLabD65([255, 255, 255]);
  assert.ok(Math.abs(white.l - 100) < 0.001); assert.ok(Math.abs(white.a) < 0.001); assert.ok(Math.abs(white.b) < 0.001);
  assert.equal(ciede2000(white, white), 0);
  assert.ok(Math.abs(ciede2000({ l: 50, a: 2.6772, b: -79.7751 }, { l: 50, a: 0, b: -82.7485 }) - 2.0425) < 0.0001);
});
