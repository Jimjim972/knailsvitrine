import assert from "node:assert/strict";
import test from "node:test";
import { imageNotFoundResponse, imageResponseHeaders } from "../../../lib/gallery/image-delivery.ts";

test("public image responses are inline, nosniff and private no-store", () => {
  const headers = imageResponseHeaders("image/webp"); assert.equal(headers.get("cache-control"), "private, no-store"); assert.equal(headers.get("x-content-type-options"), "nosniff"); assert.equal(headers.get("content-disposition"), "inline");
  const missing = imageNotFoundResponse(); assert.equal(missing.status, 404); assert.equal(missing.headers.get("cache-control"), "private, no-store");
});
