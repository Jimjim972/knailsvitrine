import assert from "node:assert/strict";
import { test } from "node:test";
import { inspectDocumentationSync } from "../../../scripts/check-documentation-sync.mjs";

test("les sources documentaires, inventaires et marqueurs restent synchronisés", () => {
  const result = inspectDocumentationSync(process.cwd(), "7".repeat(40));
  assert.equal(result.status, "passed");
  assert.equal(result.requirements, 157);
  assert.equal(result.sources, 16);
  assert.ok(result.tasks >= 86);
});
