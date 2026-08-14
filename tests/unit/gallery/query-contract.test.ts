import assert from "node:assert/strict";
import test from "node:test";
import { ADMIN_GALLERY_COLUMNS, PUBLIC_GALLERY_COLUMNS } from "../../../lib/gallery/query-contract.ts";

test("the public projection excludes paths, operation state and internal MIME", () => {
  for (const forbidden of ["storage_path", "pending_storage_path", "cleanup_storage_path", "file_state", "repair_code", "mime_type", "actif"]) {
    assert.equal(PUBLIC_GALLERY_COLUMNS.includes(forbidden), false, forbidden);
  }
  assert.match(PUBLIC_GALLERY_COLUMNS, /id,alt_text/);
});

test("the admin projection explicitly includes every repair field", () => {
  for (const required of ["storage_path", "file_state", "operation_kind", "operation_id", "pending_storage_path", "cleanup_storage_path", "operation_started_at", "repair_code"]) {
    assert.equal(ADMIN_GALLERY_COLUMNS.split(",").includes(required), true, required);
  }
  assert.equal(ADMIN_GALLERY_COLUMNS.includes("*"), false);
});
