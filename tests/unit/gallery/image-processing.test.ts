import assert from "node:assert/strict";
import test from "node:test";
import { imageEncodeCandidates, selectEncodedCandidate } from "../../../lib/gallery/image-processing.ts";

test("tries 0.85, 0.80 and 0.75 at each dimension before reducing by 100", () => {
  const candidates = imageEncodeCandidates(2000, 1000);
  assert.deepEqual(candidates.slice(0, 6), [
    { width: 1600, height: 800, quality: 0.85 }, { width: 1600, height: 800, quality: 0.8 }, { width: 1600, height: 800, quality: 0.75 },
    { width: 1500, height: 750, quality: 0.85 }, { width: 1500, height: 750, quality: 0.8 }, { width: 1500, height: 750, quality: 0.75 },
  ]);
  assert.deepEqual(candidates.at(-1), { width: 1200, height: 600, quality: 0.75 });
  assert.equal(candidates.length, 15);
});

test("never upscales an original below 1200", () => {
  assert.deepEqual(imageEncodeCandidates(800, 600), [
    { width: 800, height: 600, quality: 0.85 }, { width: 800, height: 600, quality: 0.8 }, { width: 800, height: 600, quality: 0.75 },
  ]);
});

test("the injected encoder stops on the first byte-compliant output", async () => {
  const attempted: number[] = [];
  const selected = await selectEncodedCandidate(2000, 1000, async ({ quality }) => {
    attempted.push(quality); return new Uint8Array(quality === 0.75 ? 1_048_576 : 1_048_577);
  });
  assert.deepEqual(attempted, [0.85, 0.8, 0.75]);
  assert.equal(selected?.quality, 0.75); assert.equal(selected?.bytes.byteLength, 1_048_576);
});

test("the injected encoder observes cancellation before another encode", async () => {
  const controller = new AbortController(); let calls = 0;
  await assert.rejects(selectEncodedCandidate(2000, 1000, async () => { calls += 1; controller.abort(); return new Uint8Array(1_048_577); }, controller.signal), { name: "AbortError" });
  assert.equal(calls, 1);
});
