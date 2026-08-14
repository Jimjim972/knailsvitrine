import assert from "node:assert/strict";
import test from "node:test";
import { validatePublishedWebp } from "../../../lib/gallery/published-image-validation.ts";
import { losslessWebp, SERVER_OBJECT_FIXTURES } from "./image-fixtures.ts";

const valid = losslessWebp(10, 20);
test("validates exact bytes, MIME and dimensions", () => {
  assert.deepEqual(validatePublishedWebp(valid, { width: 10, height: 20, sizeBytes: valid.length, mimeType: "image/webp" }).width, 10);
  for (const expectation of [
    { width: 11, height: 20, sizeBytes: valid.length, mimeType: "image/webp" as const },
    { width: 10, height: 21, sizeBytes: valid.length, mimeType: "image/webp" as const },
    { width: 10, height: 20, sizeBytes: valid.length + 1, mimeType: "image/webp" as const },
  ]) assert.throws(() => validatePublishedWebp(valid, expectation));
});

test("rejects metadata-bearing and malformed provider objects", () => {
  const dirty = losslessWebp(10, 20, [{ type: "EXIF", data: new Uint8Array([1, 2]) }]);
  assert.throws(() => validatePublishedWebp(dirty, { width: 10, height: 20, sizeBytes: dirty.length, mimeType: "image/webp" }));
  for (const bytes of [valid.slice(0, -1), new Uint8Array(), new Uint8Array([82, 73, 70, 70]), dirty, valid.slice(0, 12), new Uint8Array(1_048_577), Uint8Array.from(valid, (value, index) => index === 8 ? 0 : value), Uint8Array.from(valid, (value, index) => index === 4 ? value + 1 : value)]) {
    assert.throws(() => validatePublishedWebp(bytes, { width: 10, height: 20, sizeBytes: bytes.length, mimeType: "image/webp" }));
  }
});

test("SC-022 accepts exactly one of the eight deceptive reserved objects", () => {
  let accepted = 0;
  for (const fixture of SERVER_OBJECT_FIXTURES) {
    const expectation = { width: fixture.width, height: fixture.height, sizeBytes: fixture.bytes.length, mimeType: "image/webp" as const };
    if (fixture.accepted) {
      assert.doesNotThrow(() => validatePublishedWebp(fixture.bytes, expectation)); accepted += 1;
    } else assert.throws(() => validatePublishedWebp(fixture.bytes, expectation));
  }
  assert.equal(accepted, 1);
});
