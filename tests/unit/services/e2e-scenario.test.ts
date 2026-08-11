import assert from "node:assert/strict";
import test from "node:test";
import { resolveServiceE2EScenario } from "../../../lib/services/e2e-scenario-core.ts";

const local = { scenario: "admin-empty", supabaseUrl: "http://127.0.0.1:54321", netlify: undefined, context: undefined };

test("accepts only known scenarios on an exact HTTP loopback URL", () => {
  assert.equal(resolveServiceE2EScenario(local), "admin-empty");
  assert.equal(resolveServiceE2EScenario({ ...local, scenario: "admin-unavailable" }), "admin-unavailable");
  assert.equal(resolveServiceE2EScenario({ ...local, scenario: "public-unavailable" }), "public-unavailable");
  assert.equal(resolveServiceE2EScenario({ ...local, scenario: "" }), null);
});

test("fails closed for unknown, remote, credentialed and Netlify contexts", () => {
  for (const input of [
    { ...local, scenario: "unknown" },
    { ...local, supabaseUrl: "https://project.supabase.co" },
    { ...local, supabaseUrl: "http://user:pass@127.0.0.1:54321" },
    { ...local, netlify: "true" },
    { ...local, context: "deploy-preview" },
  ]) assert.throws(() => resolveServiceE2EScenario(input), /scenario is forbidden/i);
});
