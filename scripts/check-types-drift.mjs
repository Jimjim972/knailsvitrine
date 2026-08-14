import { spawnSync } from "node:child_process";
import {
  assertLoopback,
  emit,
  fail,
  generatedTypesResult,
} from "./run-foundation-checks.mjs";

let result;
try {
  const statusCommand = spawnSync("npx", ["supabase", "status", "--output", "json"], {
    encoding: "utf8",
    stdio: "pipe",
  });
  if (statusCommand.status !== 0) throw new Error("Local stack unavailable");
  assertLoopback(JSON.parse(statusCommand.stdout).API_URL);
  result = generatedTypesResult();
} catch {
  result = fail("internal.types.guard", "internal", "Local type drift guard failed");
}

emit([result]);
process.exitCode = result.status === "pass" ? 0 : 1;
