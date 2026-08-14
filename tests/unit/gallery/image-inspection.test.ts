import assert from "node:assert/strict";
import test from "node:test";
import { inspectGalleryImage } from "../../../lib/gallery/image-inspection.ts";
import { IMAGE_FIXTURES, losslessWebp } from "./image-fixtures.ts";

for (const fixture of IMAGE_FIXTURES) {
  test(`${fixture.id} is ${fixture.accepted ? "accepted" : "rejected"}`, () => {
    if (fixture.accepted) assert.doesNotThrow(() => inspectGalleryImage(fixture.bytes, fixture.type, fixture.name));
    else assert.throws(() => inspectGalleryImage(fixture.bytes, fixture.type, fixture.name));
  });
}

test("F04-F06 use the exact controlled byte boundaries", () => {
  assert.deepEqual(IMAGE_FIXTURES.slice(3, 6).map(({ bytes }) => bytes.byteLength), [8 * 1024 * 1024 - 1, 8 * 1024 * 1024, 8 * 1024 * 1024]);
});

test("enforces side and pixel boundaries before decode", () => {
  assert.throws(() => inspectGalleryImage(losslessWebp(8192, 8192), "image/webp"));
  assert.throws(() => inspectGalleryImage(losslessWebp(8192, 4000), "image/webp"));
  assert.doesNotThrow(() => inspectGalleryImage(losslessWebp(5000, 5000), "image/webp"));
});
