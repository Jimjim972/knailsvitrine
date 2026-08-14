import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { assertUnlinkedLoopbackGalleryTarget } from "./gallery-target-guard.mjs";

const results = []; const record = (checkId, status, summary, category) => results.push({ checkId, status, summary, ...(status === "fail" ? { category } : {}) });
const statusCommand = spawnSync("npx", ["supabase", "status", "--output", "json"], { encoding: "utf8" });
let env;
try {
  if (Number(process.versions.node.split(".")[0]) < 22 || statusCommand.status !== 0) throw new Error("runtime");
  const runtime = JSON.parse(statusCommand.stdout); const origin = assertUnlinkedLoopbackGalleryTarget(runtime.API_URL);
  env = { ...process.env, NEXT_PUBLIC_SUPABASE_URL: origin, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: runtime.PUBLISHABLE_KEY, SERVICE_SUCCESS_FLASH_SECRET: "local-only-service-flash-proof-key-material", NO_COLOR: "1" }; delete env.FORCE_COLOR;
  record("internal.gallery.local_target", "pass", "Node >=22 and loopback Supabase verified");
} catch { record("internal.gallery.local_target", "fail", "Local safety guard failed", "internal"); }
function run(checkId, summary, command, args, category = "internal", additions = {}) {
  const child = spawnSync(command, args, { stdio: "pipe", encoding: "utf8", env: { ...env, ...additions }, maxBuffer: 64 * 1024 * 1024 });
  const passed = child.status === 0; record(checkId, passed ? "pass" : "fail", passed ? summary : `${summary} failed`, category); if (!passed) process.stderr.write(`${child.stdout}\n${child.stderr}`); return passed;
}
if (env) {
  run("internal.gallery.reset", "Local migrations reset", "npm", ["run", "supabase:reset"]);
  run("internal.gallery.bucket", "Private gallery bucket configured", "npm", ["run", "supabase:configure:gallery"]);
  run("authorization.gallery.database", "Gallery pgTAP and RLS matrix", "npm", ["run", "supabase:test:db"], "authorization");
  run("authorization.gallery.storage", "Gallery Storage matrix", "npm", ["run", "supabase:test:storage"], "authorization");
  run("validation.gallery.bootstrap", "Nine deterministic gallery pairs", process.execPath, ["scripts/check-gallery-bootstrap.mjs"], "validation");
  run("validation.gallery.unit", "Gallery unit contracts", "npm", ["run", "test:unit"], "validation");
  run("internal.gallery.lint", "ESLint", "npm", ["run", "lint"]); run("internal.gallery.typecheck", "TypeScript", "npm", ["run", "typecheck"]);
  rmSync(join(process.cwd(), ".next"), { recursive: true, force: true }); record("internal.gallery.clean_build", "pass", "Generated Next.js build cache cleared after bootstrap");
  const built = run("internal.gallery.build", "Next.js production build", "npm", ["run", "build"]);
  if (built) {
    run("validation.gallery.browser", "Chromium and WebKit gallery matrix", "npm", ["run", "test:e2e:gallery"], "validation", { PLAYWRIGHT_BASE_URL: "http://127.0.0.1:3310" });
    run("validation.gallery.scenarios", "Isolated gallery state scenarios", "npm", ["run", "test:e2e:gallery:scenarios"], "validation");
  }
  run("internal.gallery.sql_lint", "Database lint", "npm", ["run", "supabase:lint"]); run("internal.gallery.advisors", "Supabase advisors", "npm", ["run", "supabase:advisors"]);
  run("privilege.gallery.scan", "Build secret scan", "npm", ["run", "scan:build-secrets"], "privilege");
}
for (const result of results) process.stdout.write(`${JSON.stringify(result)}\n`); process.exitCode = results.some(({ status }) => status === "fail") ? 1 : 0;
