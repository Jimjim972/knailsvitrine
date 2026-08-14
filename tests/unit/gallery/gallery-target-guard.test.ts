import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { assertUnlinkedLoopbackGalleryTarget } from "../../../scripts/gallery-target-guard.mjs";

test("gallery destructive checks accept only an unlinked exact loopback target", () => {
  const workspace = mkdtempSync(join(tmpdir(), "knails-gallery-target-"));
  try {
    assert.equal(assertUnlinkedLoopbackGalleryTarget("http://127.0.0.1:54321", workspace), "http://127.0.0.1:54321");
    for (const url of ["https://project.supabase.co", "http://localhost.evil.test:54321", "http://user:pass@localhost:54321", "http://localhost:54321/path"]) assert.throws(() => assertUnlinkedLoopbackGalleryTarget(url, workspace));
    const temporary = join(workspace, "supabase", ".temp"); mkdirSync(temporary, { recursive: true }); writeFileSync(join(temporary, "project-ref"), "abcdefghijklmnopqrst");
    assert.throws(() => assertUnlinkedLoopbackGalleryTarget("http://127.0.0.1:54321", workspace));
  } finally { rmSync(workspace, { recursive: true, force: true }); }
});
