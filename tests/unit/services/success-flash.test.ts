import assert from "node:assert/strict";
import test from "node:test";
import {
  createServiceSuccessConsumedMarker,
  gallerySuccessMessage,
  issueServiceSuccessFlash,
  parseGallerySuccessFlash,
  parseServiceSuccessFlash,
  serviceSuccessMessage,
  verifyServiceSuccessFlash,
} from "../../../lib/services/success-flash.ts";

const SECRET = "unit-test-service-success-secret-32-characters";

test("accepts only server-issued service success kinds", () => {
  assert.equal(parseServiceSuccessFlash("create"), "create");
  assert.equal(parseServiceSuccessFlash("edit"), "edit");
  assert.equal(parseServiceSuccessFlash("delete"), "delete");
  assert.equal(parseServiceSuccessFlash("unknown"), null);
  assert.equal(parseServiceSuccessFlash(undefined), null);
});

test("maps each confirmed operation to one safe message", () => {
  assert.equal(serviceSuccessMessage("create"), "La prestation a été créée.");
  assert.equal(serviceSuccessMessage("edit"), "La prestation a été modifiée.");
  assert.equal(serviceSuccessMessage("delete"), "La prestation a été supprimée.");
});

test("accepts and maps only the six gallery success kinds", () => {
  const kinds = ["gallery-create", "gallery-edit", "gallery-show", "gallery-hide", "gallery-replace", "gallery-delete"] as const;
  const messages = ["La photo a été ajoutée.", "La photo a été modifiée.", "La photo est active.", "La photo est masquée.", "La photo a été remplacée.", "La photo a été supprimée."];
  assert.deepEqual(kinds.map((kind) => parseGallerySuccessFlash(kind)), kinds);
  assert.deepEqual(kinds.map((kind) => gallerySuccessMessage(kind)), messages);
  assert.equal(parseGallerySuccessFlash("create"), null);
  const issued = issueServiceSuccessFlash("gallery-create", SECRET, { nowMs: 1_000_000, nonce: "gallery-success-nonce" });
  assert.deepEqual(verifyServiceSuccessFlash({ token: issued.token, guard: issued.guard, consumedMarker: undefined, secret: SECRET, nowMs: 1_010_000 }), { kind: "gallery-create", nonce: "gallery-success-nonce" });
});

test("accepts one authentic, fresh and browser-bound success proof", () => {
  const issued = issueServiceSuccessFlash("create", SECRET, {
    nowMs: 1_000_000,
    nonce: "test-browser-nonce",
  });

  assert.deepEqual(
    verifyServiceSuccessFlash({
      token: issued.token,
      guard: issued.guard,
      consumedMarker: undefined,
      secret: SECRET,
      nowMs: 1_030_000,
    }),
    { kind: "create", nonce: "test-browser-nonce" },
  );
});

test("rejects literal, altered, unbound, expired and future-dated proofs", () => {
  const issued = issueServiceSuccessFlash("edit", SECRET, {
    nowMs: 1_000_000,
    nonce: "test-browser-nonce",
  });
  const verify = (overrides: Partial<Parameters<typeof verifyServiceSuccessFlash>[0]> = {}) => verifyServiceSuccessFlash({
    token: issued.token,
    guard: issued.guard,
    consumedMarker: undefined,
    secret: SECRET,
    nowMs: 1_010_000,
    ...overrides,
  });

  assert.equal(verify({ token: "edit" }), null);
  assert.equal(verify({ token: `${issued.token}altered` }), null);
  assert.equal(verify({ guard: "another-browser" }), null);
  assert.equal(verify({ secret: `${SECRET}-wrong` }), null);
  assert.equal(verify({ nowMs: 1_060_001 }), null);

  const future = issueServiceSuccessFlash("delete", SECRET, {
    nowMs: 2_000_000,
    nonce: "future-nonce",
  });
  assert.equal(verify({ token: future.token, guard: future.guard, nowMs: 1_000_000 }), null);
});

test("rejects replay after consumption without blocking a later operation", () => {
  const first = issueServiceSuccessFlash("create", SECRET, {
    nowMs: 1_000_000,
    nonce: "first-nonce",
  });
  const consumedMarker = createServiceSuccessConsumedMarker(first.nonce, SECRET, {
    nowMs: 1_010_000,
  });

  assert.equal(verifyServiceSuccessFlash({
    token: first.token,
    guard: first.guard,
    consumedMarker,
    secret: SECRET,
    nowMs: 1_010_000,
  }), null);

  const second = issueServiceSuccessFlash("delete", SECRET, {
    nowMs: 1_020_000,
    nonce: "second-nonce",
  });
  assert.deepEqual(verifyServiceSuccessFlash({
    token: second.token,
    guard: second.guard,
    consumedMarker,
    secret: SECRET,
    nowMs: 1_025_000,
  }), { kind: "delete", nonce: "second-nonce" });

  const consumedAfterSecond = createServiceSuccessConsumedMarker(second.nonce, SECRET, {
    consumedMarker,
    nowMs: 1_025_000,
  });
  assert.equal(verifyServiceSuccessFlash({
    token: first.token,
    guard: first.guard,
    consumedMarker: consumedAfterSecond,
    secret: SECRET,
    nowMs: 1_030_000,
  }), null);
  assert.equal(verifyServiceSuccessFlash({
    token: second.token,
    guard: second.guard,
    consumedMarker: consumedAfterSecond,
    secret: SECRET,
    nowMs: 1_030_000,
  }), null);
});

test("fails closed when the authenticated consumption registry is altered", () => {
  const issued = issueServiceSuccessFlash("edit", SECRET, {
    nowMs: 1_000_000,
    nonce: "tampered-registry-nonce",
  });
  const consumedMarker = createServiceSuccessConsumedMarker("another-consumed-nonce", SECRET, {
    nowMs: 1_005_000,
  });

  assert.equal(verifyServiceSuccessFlash({
    token: issued.token,
    guard: issued.guard,
    consumedMarker: `${consumedMarker}altered`,
    secret: SECRET,
    nowMs: 1_010_000,
  }), null);
});

test("keeps the consumption registry bounded and fails closed at capacity", () => {
  let consumedMarker: string | undefined;
  for (let index = 0; index < 49; index += 1) {
    consumedMarker = createServiceSuccessConsumedMarker(`bounded-nonce-${index}`, SECRET, {
      consumedMarker,
      nowMs: 1_000_000,
    });
  }

  const issued = issueServiceSuccessFlash("create", SECRET, {
    nowMs: 1_000_000,
    nonce: "fresh-after-capacity",
  });
  assert.equal(verifyServiceSuccessFlash({
    token: issued.token,
    guard: issued.guard,
    consumedMarker,
    secret: SECRET,
    nowMs: 1_010_000,
  }), null);
});
