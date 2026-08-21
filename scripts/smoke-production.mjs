import { execFileSync, spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { assertArtifactIsRedacted } from "./lib/production-readiness.mjs";

const CANONICAL_ORIGIN = "https://knailsbeauty.fr";

function exactHttpsOrigin(value, code) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.origin !== value || url.pathname !== "/" || url.search || url.hash ||
        url.username || url.password) throw new Error(code);
    return url;
  } catch {
    throw new Error(code);
  }
}

export function validateProductionSmokeEnvironment(environment, observedSha) {
  if (environment.PRODUCTION_BASE_URL !== CANONICAL_ORIGIN) throw new Error("invalid_production_origin");
  if (!/^[0-9a-f]{40}$/.test(environment.KN_PRODUCTION_EXPECTED_SHA ?? "")) {
    throw new Error("invalid_expected_sha");
  }
  if (environment.KN_PRODUCTION_EXPECTED_SHA !== observedSha) throw new Error("production_sha_mismatch");
  const technical = exactHttpsOrigin(environment.KN_PRODUCTION_TECHNICAL_ORIGIN ?? "", "invalid_technical_origin");
  if (technical.origin === CANONICAL_ORIGIN || !technical.hostname.endsWith(".netlify.app")) {
    throw new Error("invalid_technical_origin");
  }
  if (environment.KN_PRODUCTION_CONTACT_SMOKE_AUTHORIZED !== "true") {
    throw new Error("contact_smoke_not_authorized");
  }
  for (const name of [
    "KN_PRODUCTION_CONTACT_SMOKE_EMAIL",
    "KN_PRODUCTION_ADMIN_EMAIL",
    "KN_PRODUCTION_ADMIN_PASSWORD",
    "KN_PRODUCTION_DEPLOY_ID",
  ]) {
    if (!environment[name]?.trim()) throw new Error(`missing_smoke_environment:${name}`);
  }
  return { canonicalOrigin: CANONICAL_ORIGIN, technicalOrigin: technical.origin, candidateSha: observedSha };
}

export function runProductionSmoke({ environment = process.env, cwd = process.cwd(), runner = spawnSync } = {}) {
  const observedSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd, encoding: "utf8" }).trim();
  validateProductionSmokeEnvironment(environment, observedSha);
  const result = runner(
    "npx",
    ["playwright", "test", "tests/production-readiness/smoke.spec.ts", "--project=chromium", "--reporter=line"],
    {
      cwd,
      shell: false,
      encoding: "utf8",
      env: {
        ...environment,
        PLAYWRIGHT_BASE_URL: CANONICAL_ORIGIN,
        KN_PLAYWRIGHT_SUITE: "smoke",
        KN_PLAYWRIGHT_EXTERNAL_SERVER: "true",
      },
    },
  );
  const summary = JSON.stringify({ exitCode: result.status ?? 1, signal: result.signal ?? null });
  assertArtifactIsRedacted(summary);
  return { exitCode: result.status ?? 1, signal: result.signal ?? null };
}

const invokedAsScript = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (invokedAsScript) {
  try {
    const result = runProductionSmoke();
    process.stdout.write(`${JSON.stringify(result)}\n`);
    process.exitCode = result.exitCode;
  } catch (error) {
    process.stderr.write(`${JSON.stringify({ status: "blocked", code: error instanceof Error ? error.message : "unknown_error" })}\n`);
    process.exitCode = 1;
  }
}
