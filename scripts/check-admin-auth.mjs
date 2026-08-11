import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const results = [];

function record(checkId, status, summary, category) {
  const result = { checkId, status, summary };
  if (status === "fail") result.category = category;
  results.push(result);
}

function emit() {
  for (const result of results) process.stdout.write(`${JSON.stringify(result)}\n`);
}

function failAndExit(checkId, summary) {
  record(checkId, "fail", summary, "internal");
  emit();
  process.exitCode = 1;
}

function assertLocalRuntime() {
  if (Number.parseInt(process.versions.node.split(".")[0] ?? "0", 10) !== 22) {
    throw new Error("Node.js 22 is required");
  }
  if (existsSync(join(process.cwd(), "supabase", ".temp", "project-ref"))) {
    throw new Error("A linked Supabase project is forbidden");
  }

  const statusCommand = spawnSync("npx", ["supabase", "status", "--output", "json"], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "pipe",
    maxBuffer: 4 * 1024 * 1024,
  });
  if (statusCommand.status !== 0) throw new Error("Local Supabase is unavailable");
  const status = JSON.parse(statusCommand.stdout);
  const url = new URL(status.API_URL);
  const loopback = new Set(["localhost", "127.0.0.1", "[::1]"]);
  if (url.protocol !== "http:" || !loopback.has(url.hostname) || url.username || url.password) {
    throw new Error("Only an exact HTTP loopback Supabase target is allowed");
  }
  const publishableKey = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
  if (!publishableKey) throw new Error("The local publishable capability is unavailable");
  return { apiUrl: url.origin, publishableKey };
}

function runCheck(checkId, summary, command, args, env, category = "internal") {
  const childEnv = { ...process.env, ...env, NO_COLOR: "1" };
  delete childEnv.FORCE_COLOR;
  const child = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    env: childEnv,
    stdio: "pipe",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (child.status === 0) {
    record(checkId, "pass", summary);
    return true;
  }
  record(checkId, "fail", `${summary} failed`, category);
  return false;
}

let runtime;
try {
  runtime = assertLocalRuntime();
  record("internal.auth.local_target", "pass", "Node 22 and the unlinked loopback stack are verified");
} catch {
  failAndExit("internal.auth.local_target", "The local Auth safety guard failed");
}

if (runtime) {
  const publicEnv = {
    NEXT_PUBLIC_SUPABASE_URL: runtime.apiUrl,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: runtime.publishableKey,
  };
  runCheck(
    "authorization.auth.database",
    "Admin RPC, grants, current role and current-session pgTAP matrix",
    "npm",
    ["run", "supabase:test:db"],
    publicEnv,
    "authorization",
  );
  runCheck(
    "validation.auth.unit",
    "Pure authentication, redaction and action-guard contracts",
    "npm",
    ["run", "test:unit"],
    publicEnv,
    "validation",
  );
  runCheck("internal.auth.eslint", "ESLint", "npm", ["run", "lint"], publicEnv);
  runCheck("internal.auth.typescript", "TypeScript", "npm", ["run", "typecheck"], publicEnv);
  const buildPassed = runCheck(
    "internal.auth.build",
    "Next.js production build",
    "npm",
    ["run", "build"],
    publicEnv,
  );
  if (buildPassed) {
    runCheck(
      "authorization.auth.browser_matrix",
      "Chromium/WebKit Auth, accessibility, responsive and public-regression matrix",
      "npm",
      ["run", "test:e2e:auth"],
      { ...publicEnv, PLAYWRIGHT_BASE_URL: "http://127.0.0.1:3100" },
      "authorization",
    );
    runCheck(
      "privilege.auth.build_scan",
      "Build output contains no privileged Supabase value",
      "npm",
      ["run", "scan:build-secrets"],
      publicEnv,
      "privilege",
    );
  } else {
    record(
      "authorization.auth.browser_matrix",
      "fail",
      "Browser matrix was not run because the production build failed",
      "internal",
    );
    record(
      "privilege.auth.build_scan",
      "fail",
      "Build scan was not run because the production build failed",
      "internal",
    );
  }
}

emit();
process.exitCode = results.some((result) => result.status === "fail") ? 1 : 0;
