import assert from "node:assert/strict";
import test from "node:test";
import { rgbToLuminance, structuralSimilarity } from "../../../lib/gallery/ssim.ts";

test("the exact luminance coefficients and identity SSIM are stable", () => {
  const rgb = new Uint8Array([255, 0, 0, 0, 255, 0, 0, 0, 255, 255, 255, 255]);
  const luminance = rgbToLuminance(rgb, 2, 2);
  assert.deepEqual([...luminance].map((value) => Number(value.toFixed(3))), [76.245, 149.685, 29.07, 255]);
  assert.ok(Math.abs(structuralSimilarity(luminance, luminance, 2, 2) - 1) < 1e-12);
});

test("the 11x11 Gaussian SSIM detects visible divergence with reflected borders", () => {
  const first = new Float64Array(13 * 13).fill(128); const second = new Float64Array(first); second[6 * 13 + 6] = 0;
  const score = structuralSimilarity(first, second, 13, 13);
  assert.ok(score > 0 && score < 0.97);
  assert.throws(() => structuralSimilarity(first, second, 12, 13));
});
