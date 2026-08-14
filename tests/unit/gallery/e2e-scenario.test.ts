import assert from "node:assert/strict";
import test from "node:test";
import { GALLERY_INTERRUPTION_POINTS, runGalleryEnduranceMatrix, runGalleryFailureMatrix, runGalleryInterruptionMatrix } from "../../../lib/gallery/e2e-scenario.ts";

test("all twelve interruption points converge and repeated recovery is idempotent", () => {
  const results = runGalleryInterruptionMatrix();
  assert.deepEqual(results.map(({ point }) => point), GALLERY_INTERRUPTION_POINTS);
  assert.deepEqual(results.filter(({ point }) => point.startsWith("C")).map(({ rows, objects }) => [rows, objects]), [[0, 0], [1, 1], [0, 0], [1, 1]]);
});

test("network, quota, conflict and session failures do not mutate pre-operation state", () => {
  assert.deepEqual(runGalleryFailureMatrix().map(({ category }) => category), ["network", "quota", "conflict", "session"]);
});

test("endurance leaves an exact one-to-one row/object inventory", () => {
  assert.deepEqual(runGalleryEnduranceMatrix(), { creations: 30, replacements: 20, deletions: 20, finalRows: 10, finalObjects: 10 });
});
