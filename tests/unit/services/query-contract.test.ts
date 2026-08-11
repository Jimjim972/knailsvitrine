import assert from "node:assert/strict";
import test from "node:test";
import { ADMIN_SERVICE_COLUMNS, PUBLIC_SERVICE_COLUMNS } from "../../../lib/services/query-contract.ts";

test("service reads request exact decimal text without widening their columns", () => {
  for (const columns of [ADMIN_SERVICE_COLUMNS, PUBLIC_SERVICE_COLUMNS]) {
    assert.match(columns, /(?:^|,)prix::text(?:,|$)/);
    assert.doesNotMatch(columns, /\*/);
  }
  assert.doesNotMatch(PUBLIC_SERVICE_COLUMNS, /actif|updated_at|image_path/);
});
