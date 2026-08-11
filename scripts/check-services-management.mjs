import { existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const results = [];
const FORBIDDEN_PROVIDER_MARKER = "KN_RAW_PROVIDER_DETAIL";
const record = (checkId, status, summary, category) => results.push({ checkId, status, summary, ...(category ? { category } : {}) });

function localRuntime() {
  if (Number(process.versions.node.split(".")[0]) !== 22) throw new Error("Node 22 required");
  if (existsSync(join(process.cwd(), "supabase/.temp/project-ref"))) throw new Error("Linked project refused");
  const child = spawnSync("npx", ["supabase", "status", "--output", "json"], { encoding: "utf8", stdio: "pipe" });
  if (child.status !== 0) throw new Error("Local stack unavailable");
  const status = JSON.parse(child.stdout); const url = new URL(status.API_URL);
  if (url.protocol !== "http:" || !new Set(["localhost", "127.0.0.1", "[::1]"]).has(url.hostname) || url.username || url.password) throw new Error("Loopback required");
  if (!status.PUBLISHABLE_KEY) throw new Error("Publishable capability missing");
  return {
    NEXT_PUBLIC_SUPABASE_URL: url.origin,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: status.PUBLISHABLE_KEY,
    SERVICE_SUCCESS_FLASH_SECRET: "local-only-service-flash-proof-key-material",
  };
}

function run(checkId, summary, command, args, env, category = "internal") {
  const childEnv = { ...process.env, ...env, NO_COLOR: "1" }; delete childEnv.FORCE_COLOR; delete childEnv.KN_SERVICE_E2E_SCENARIO;
  const child = spawnSync(command, args, { cwd: process.cwd(), encoding: "utf8", env: childEnv, stdio: "pipe", maxBuffer: 64 * 1024 * 1024 });
  const providerDetailLeaked = `${child.stdout ?? ""}\n${child.stderr ?? ""}`.includes(FORBIDDEN_PROVIDER_MARKER);
  const passed = child.status === 0 && !providerDetailLeaked;
  record(checkId, passed ? "pass" : "fail", passed ? summary : `${summary} failed`, passed ? undefined : category);
  return passed;
}

let env;
try { env = localRuntime(); record("internal.services.local_target", "pass", "Node 22 and unlinked loopback Supabase verified"); }
catch { record("internal.services.local_target", "fail", "Local safety guard failed", "internal"); }

if (env) {
  run("internal.services.reset", "Local migrations reset", "npm", ["run", "supabase:reset"], env);
  run("authorization.services.database", "Service pgTAP and RLS matrix", "npm", ["run", "supabase:test:db"], env, "authorization");
  run("internal.services.lint_database", "Database lint", "npm", ["run", "supabase:lint"], env);
  run("internal.services.advisors", "Supabase performance and security advisors", "npm", ["run", "supabase:advisors"], env);
  run("internal.services.types", "Generated types match", "npm", ["run", "supabase:types:check"], env);
  run("validation.services.unit", "Pure service contracts", "npm", ["run", "test:unit"], env, "validation");
  run("internal.services.eslint", "ESLint", "npm", ["run", "lint"], env);
  run("internal.services.typescript", "TypeScript", "npm", ["run", "typecheck"], env);
  const built = run("internal.services.build", "Next.js production build", "npm", ["run", "build"], env);
  if (built) {
    run("validation.services.browser", "Chromium and WebKit services matrix", "npm", ["run", "test:e2e:services"], { ...env, PLAYWRIGHT_BASE_URL: "http://127.0.0.1:3110" }, "validation");
    run("validation.services.scenarios", "Isolated deterministic failure scenarios", "npm", ["run", "test:e2e:services:scenarios"], env, "validation");
    run("privilege.services.scan", "Build secret scan", "npm", ["run", "scan:build-secrets"], env, "privilege");
  }
}

for (const result of results) process.stdout.write(`${JSON.stringify(result)}\n`);
process.exitCode = results.some(({ status }) => status === "fail") ? 1 : 0;
