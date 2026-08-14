import assert from "node:assert/strict";
import test from "node:test";
import { classifyGalleryError, reportGalleryDiagnostic } from "../../../lib/gallery/diagnostics.ts";

test("gallery diagnostics expose only category, stage and opaque correlation", () => {
  const captured: unknown[] = []; const diagnostic = reportGalleryDiagnostic("gallery.action.failed", "network", "storage", { logger: (_event, value) => captured.push(value) });
  assert.deepEqual(captured, [diagnostic]); assert.deepEqual(Object.keys(diagnostic).sort(), ["category", "correlationId", "stage"]); assert.doesNotMatch(JSON.stringify(diagnostic), /photos\/|operation_id|SUPABASE_GALLERY_CONFIG|sb_secret_/);
});

test("provider failures are reduced to closed public categories", () => {
  assert.equal(classifyGalleryError({ status: 403, message: "raw provider detail" }), "forbidden"); assert.equal(classifyGalleryError({ status: 429 }), "quota"); assert.equal(classifyGalleryError({ status: 503 }), "network");
});
