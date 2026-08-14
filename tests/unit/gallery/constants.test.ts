import assert from "node:assert/strict";
import test from "node:test";
import { GALLERY_MIME_LABELS, GALLERY_VARIANT_LABELS, GALLERY_VARIANTS } from "../../../lib/gallery/constants.ts";
import { GalleryImageInspectionError } from "../../../lib/gallery/image-inspection.ts";

test("gallery variants expose the five closed French labels", () => {
  assert.deepEqual(GALLERY_VARIANTS.map((variant) => GALLERY_VARIANT_LABELS[variant]), [
    "Mise en avant",
    "Petite carte",
    "Petite carte large",
    "Grande carte large",
    "Journal social",
  ]);
});

test("gallery MIME labels remain user-facing and closed", () => {
  assert.deepEqual(GALLERY_MIME_LABELS, { "image/jpeg": "JPEG", "image/png": "PNG", "image/webp": "WebP" });
});

test("image inspection errors are understandable in French without raw codes", () => {
  for (const code of ["empty", "too_large", "unsupported", "mime_mismatch", "extension_mismatch", "malformed", "animated", "dimensions"] as const) {
    const error = new GalleryImageInspectionError(code);
    assert.equal(error.code, code);
    assert.notEqual(error.message, code);
    assert.match(error.message, /[.]/);
  }
});
