import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const categories = new Set([
  "validation",
  "authorization",
  "privilege",
  "internal",
]);

export function pass(checkId, summary) {
  return { checkId, status: "pass", summary };
}

export function fail(checkId, category, summary) {
  if (!categories.has(category)) {
    throw new TypeError("Unknown diagnostic category");
  }

  return { checkId, status: "fail", category, summary };
}

export function redact(value) {
  return String(value)
    .replace(/sb_(?:publishable|secret)_[A-Za-z0-9_-]+/g, "[redacted-key]")
    .replace(/eyJ[A-Za-z0-9._-]+/g, "[redacted-jwt]")
    .replace(/postgres(?:ql)?:\/\/[^@\s]+@/g, "postgresql://[redacted]@")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]");
}

export function assertLoopback(rawUrl) {
  const url = new URL(rawUrl);
  const loopbackHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);

  if (url.protocol !== "http:" || !loopbackHosts.has(url.hostname)) {
    throw new Error("Foundation checks require an HTTP loopback Supabase target");
  }

  return url.origin;
}

export function assertUnlinked(workspace = process.cwd()) {
  const projectRefPath = join(workspace, "supabase", ".temp", "project-ref");

  if (existsSync(projectRefPath) && readFileSync(projectRefPath, "utf8").trim()) {
    throw new Error("Foundation checks refuse a linked Supabase project");
  }
}

export function run(command, args, options = {}) {
  const child = spawnSync(command, args, {
    cwd: options.cwd ?? process.cwd(),
    encoding: "utf8",
    env: options.env ?? process.env,
    stdio: options.capture === false ? "inherit" : "pipe",
  });

  return {
    exitCode: child.status ?? 1,
    stdout: redact(child.stdout ?? ""),
    stderr: redact(child.stderr ?? ""),
  };
}

export function emit(results) {
  for (const result of results) {
    process.stdout.write(`${JSON.stringify(result)}\n`);
  }
}

export function withTemporaryDirectory(callback) {
  const directory = mkdtempSync(join(tmpdir(), "knails-foundation-"));

  try {
    return callback(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function checkEnvironmentMatrix() {
  if (!process.allowedNodeEnvironmentFlags.has("--experimental-strip-types")) {
    return [fail("internal.environment.type_stripping", "internal", "Node.js type stripping is unavailable")];
  }

  const cases = [
    ["loopback_ipv4", "http://127.0.0.1:54321", "test-publishable-key", true],
    ["loopback_localhost", "http://localhost:54321", "test-publishable-key", true],
    ["loopback_ipv6", "http://[::1]:54321", "test-publishable-key", true],
    ["hosted_https", "https://project.supabase.co", "test-publishable-key", true],
    ["remote_http", "http://project.supabase.co", "test-publishable-key", false],
    ["false_loopback", "http://localhost.evil.example", "test-publishable-key", false],
    ["credentials", "https://user:password@project.supabase.co", "test-publishable-key", false],
    ["fragment", "https://project.supabase.co/#private", "test-publishable-key", false],
    ["ftp", "ftp://project.supabase.co", "test-publishable-key", false],
    ["malformed", "not a url", "test-publishable-key", false],
    ["empty_url", "", "test-publishable-key", false],
    ["empty_key", "https://project.supabase.co", "", false],
  ];
  const moduleUrl = pathToFileURL(join(process.cwd(), "lib", "supabase", "env.ts")).href;
  const childScript = `
    const cases = ${JSON.stringify(cases)};
    const { validatePublicSupabaseEnv } = await import(${JSON.stringify(moduleUrl)});
    const outcomes = cases.map(([id, url, key, expected]) => {
      let accepted = true;
      try {
        validatePublicSupabaseEnv({
          NEXT_PUBLIC_SUPABASE_URL: url,
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
        });
      } catch {
        accepted = false;
      }
      return { id, expected, accepted };
    });
    process.stdout.write(JSON.stringify(outcomes));
  `;
  const child = run(process.execPath, ["--experimental-strip-types", "--input-type=module", "--eval", childScript]);
  if (child.exitCode !== 0) {
    return [fail("internal.environment.module", "internal", "Environment validator could not be loaded")];
  }

  try {
    return JSON.parse(child.stdout).map((outcome) => (
      outcome.accepted === outcome.expected
        ? pass(`validation.environment.${outcome.id}`, "Environment case matches its transport contract")
        : fail(`validation.environment.${outcome.id}`, "validation", "Environment case violates its transport contract")
    ));
  } catch {
    return [fail("internal.environment.output", "internal", "Environment validator returned an invalid result")];
  }
}

function readLocalStatus() {
  const child = spawnSync("npx", ["supabase", "status", "--output", "json"], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "pipe",
  });
  if (child.status !== 0) throw new Error("Local Supabase is unavailable");
  const status = JSON.parse(child.stdout);
  assertLoopback(status.API_URL);
  return status;
}

function commandResult(checkId, category, summary, command, args, options = {}) {
  const outcome = run(command, args, options);
  return outcome.exitCode === 0
    ? pass(checkId, summary)
    : fail(checkId, category, `${summary} failed`);
}

function structuredResults(command, args) {
  const outcome = run(command, args);
  if (outcome.exitCode !== 0 && !outcome.stdout.trim()) {
    return [fail("internal.structured-check", "internal", "A structured foundation check did not complete")];
  }

  try {
    return outcome.stdout.trim().split("\n").filter(Boolean).map((line) => {
      const result = JSON.parse(line);
      if (
        typeof result.checkId !== "string"
        || !["pass", "fail"].includes(result.status)
        || typeof result.summary !== "string"
        || (result.status === "fail" && !categories.has(result.category))
        || (result.status === "pass" && "category" in result)
      ) {
        throw new Error("Invalid structured result");
      }
      return result;
    });
  } catch {
    return [fail("internal.structured-output", "internal", "A structured foundation result was invalid")];
  }
}

export function generatedTypesResult() {
  const generated = run("npx", ["supabase", "gen", "types", "typescript", "--local", "--schema", "public"]);
  if (generated.exitCode !== 0) {
    return fail("internal.types.generate", "internal", "Local database types could not be generated");
  }
  return withTemporaryDirectory((directory) => {
    const generatedPath = join(directory, "database.types.ts");
    writeFileSync(generatedPath, generated.stdout, { encoding: "utf8", mode: 0o600 });
    const tracked = readFileSync(join(process.cwd(), "lib", "supabase", "database.types.ts"), "utf8");
    const temporary = readFileSync(generatedPath, "utf8");
    return temporary === tracked
      ? pass("internal.types.drift", "Generated database types match the local schema")
      : fail("internal.types.drift", "internal", "Generated database types have drifted");
  });
}

function filesBelow(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? filesBelow(path) : [path];
  });
}

export function secretScanResult() {
  const forbidden = [
    new RegExp(`sb_${"secret"}_[A-Za-z0-9_-]{16,}`),
    new RegExp(["super", "secret", "jwt", "token", "with", "at", "least", "32", "characters", "long"].join("-")),
    new RegExp(`${"SUPABASE_SERVICE"}_ROLE_KEY\\s*[:=]\\s*["'][A-Za-z0-9._-]{16,}`),
    /NEXT_PUBLIC_[A-Z0-9_]*(?:SECRET|SERVICE_ROLE)/,
    /SUPABASE_GALLERY_CONFIG_(?:URL|PROJECT_REF|SECRET_KEY)/,
    /photos\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|jpeg|png|webp)/,
  ];
  const exposed = filesBelow(join(process.cwd(), ".next")).some((path) => {
    const contents = readFileSync(path).toString("latin1");
    return forbidden.some((pattern) => pattern.test(contents));
  });
  return exposed
    ? fail("privilege.tooling.secret_scan", "privilege", "A privileged Supabase value appears in the build output")
    : pass("privilege.tooling.secret_scan", "Build output contains no privileged Supabase value");
}

function repositorySecretScanResult() {
  const listed = spawnSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], {
    cwd: process.cwd(),
    encoding: "buffer",
    stdio: "pipe",
  });
  if (listed.status !== 0) {
    return fail("internal.tooling.repository_scan", "internal", "Repository files could not be inventoried");
  }
  const paths = listed.stdout.toString("utf8").split("\0").filter(Boolean);
  const forbidden = [
    new RegExp(`sb_${"secret"}_[A-Za-z0-9_-]{16,}`),
    new RegExp(["super", "secret", "jwt", "token", "with", "at", "least", "32", "characters", "long"].join("-")),
    new RegExp(`${"SUPABASE_SERVICE"}_ROLE_KEY\\s*[:=]\\s*["'][A-Za-z0-9._-]{16,}`),
    /NEXT_PUBLIC_[A-Z0-9_]*(?:SECRET|SERVICE_ROLE)\s*=/,
  ];
  const exposed = paths.some((path) => {
    const absolutePath = join(process.cwd(), path);
    if (!existsSync(absolutePath) || statSync(absolutePath).isDirectory()) return false;
    return forbidden.some((pattern) => pattern.test(readFileSync(absolutePath).toString("latin1")));
  });
  return exposed
    ? fail("privilege.tooling.repository_scan", "privilege", "A privileged Supabase value appears in repository files")
    : pass("privilege.tooling.repository_scan", "Repository files contain no privileged Supabase value");
}

async function main() {
  const results = [];
  let status;

  try {
    status = readLocalStatus();
    results.push(pass("internal.local-stack", "Local Supabase target verified"));
  } catch {
    results.push(fail("internal.local-target", "internal", "Local target guard failed"));
    emit(results);
    process.exitCode = 1;
    return;
  }

  results.push(...checkEnvironmentMatrix());
  results.push(repositorySecretScanResult());
  results.push(commandResult(
    "internal.database.reset",
    "internal",
    "Local database reset",
    "npx",
    ["supabase", "db", "reset", "--local"],
  ));

  if (results.at(-1)?.status === "pass") {
    results.push(commandResult(
      "internal.storage.configure",
      "internal",
      "Local private gallery bucket configuration",
      process.execPath,
      ["scripts/configure-gallery-bucket.mjs", "--local"],
    ));
    const databaseTests = [
      "supabase/tests/database/01_schema_constraints.sql",
      "supabase/tests/database/02_public_access.sql",
      "supabase/tests/database/03_admin_table_access.sql",
      "supabase/tests/database/04_storage_policies.sql",
      "supabase/tests/database/05_foundation_inventory.sql",
      "supabase/tests/database/06_scale_and_order.sql",
      "supabase/tests/database/07_admin_authentication.sql",
      "supabase/tests/database/08_services_management.sql",
      "supabase/tests/database/09_gallery_management.sql",
      "supabase/tests/database/10_service_categories.sql",
    ];
    results.push(commandResult(
      "internal.database.pgtap",
      "internal",
      "Database, RLS, Storage inventory, and scale tests",
      "npx",
      ["supabase", "test", "db", "--local", ...databaseTests],
    ));
    results.push(...structuredResults(process.execPath, ["scripts/check-auth-signup.mjs"]));
    results.push(...structuredResults(process.execPath, ["scripts/check-supabase-storage.mjs"]));
    results.push(commandResult(
      "internal.tooling.database_lint",
      "internal",
      "Database lint",
      "npx",
      ["supabase", "db", "lint", "--local", "--schema", "public,private", "--level", "warning", "--fail-on", "error"],
    ));
    results.push(commandResult(
      "privilege.tooling.local_advisors",
      "privilege",
      "Local RLS and privilege advisor inventory",
      "npx",
      ["supabase", "test", "db", "--local", "supabase/tests/database/05_foundation_inventory.sql"],
    ));
    results.push(generatedTypesResult());
  }

  results.push(commandResult("internal.tooling.eslint", "internal", "ESLint", "npm", ["run", "lint"]));
  results.push(commandResult("internal.tooling.typescript", "internal", "TypeScript", "npx", ["tsc", "--noEmit"]));

  const buildEnv = {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: status.PUBLISHABLE_KEY ?? status.ANON_KEY,
  };
  const buildResult = commandResult("internal.tooling.build", "internal", "Next.js production build", "npm", ["run", "build"], { env: buildEnv });
  results.push(buildResult);
  if (buildResult.status === "pass") {
    results.push(secretScanResult());
    results.push(...structuredResults(process.execPath, ["scripts/check-gallery-management.mjs"]));
  }

  emit(results);
  process.exitCode = results.some((result) => result.status === "fail") ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
