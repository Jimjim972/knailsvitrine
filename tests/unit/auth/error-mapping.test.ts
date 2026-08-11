import assert from "node:assert/strict";
import test from "node:test";
import { mapAuthError } from "../../../lib/auth/auth-errors.ts";

test("maps credential and account refusals to one public family", () => {
  const unknown = mapAuthError({ code: "invalid_credentials", status: 400 });
  const unconfirmed = mapAuthError({ code: "email_not_confirmed", status: 400 });
  const banned = mapAuthError({ code: "user_banned", status: 400 });
  assert.deepEqual(unknown, unconfirmed);
  assert.deepEqual(unknown, banned);
  assert.equal(unknown.status, "refused");
});

test("distinguishes rate limiting from service unavailability", () => {
  assert.equal(mapAuthError({ code: "over_request_rate_limit", status: 429 }).status, "rate_limited");
  assert.equal(mapAuthError({ code: "unexpected_failure", status: 503 }).status, "unavailable");
  assert.equal(mapAuthError({ code: "unknown", status: 418 }).status, "unavailable");
});
