import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const PROFILES = new Set(["local", "preview", "production"]);
const SHA_PATTERN = /^[0-9a-f]{40}$/;

function parseArguments(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith("--") || !argv[index + 1] || argv[index + 1].startsWith("--")) {
      throw new Error("invalid_security_arguments");
    }
    values.set(argument.slice(2), argv[++index]);
  }
  return values;
}

function currentSha(cwd) {
  const result = spawnSync("git", ["rev-parse", "HEAD"], { cwd, encoding: "utf8", stdio: "pipe" });
  const sha = result.stdout?.trim();
  if (result.status !== 0 || !SHA_PATTERN.test(sha)) throw new Error("candidate_sha_unavailable");
  return sha;
}

function projectRefFromUrl(rawUrl) {
  try {
    return new URL(rawUrl).hostname.match(/^([a-z0-9]{20})\.supabase\.co$/)?.[1] ?? "";
  } catch {
    return "";
  }
}

function commandPlan(profile, environment, sha) {
  const secretScan = {
    checkId: "security.scan",
    summary: "Candidate repository, history, build and artifacts are scanned",
    command: process.execPath,
    args: ["scripts/scan-build-secrets.mjs", "--candidate-sha", sha],
  };
  const headers = {
    checkId: "security.headers",
    summary: "Security headers and private cache behavior are verified",
    command: "npx",
    args: ["playwright", "test", "tests/production-readiness/security-headers.spec.ts", "--project=chromium"],
    env: { KN_PLAYWRIGHT_SUITE: "security" },
  };

  if (profile === "local") {
    return [
      {
        checkId: "security.database",
        summary: "Local GRANT, RLS and Storage policy contracts are verified",
        command: "npx",
        args: ["supabase", "test", "db", "--local", "supabase/tests/database/04_storage_policies.sql", "supabase/tests/database/11_production_security.sql"],
      },
      {
        checkId: "security.auth",
        summary: "Local Auth signup, metadata, downgrade and revocation contracts are verified",
        command: process.execPath,
        args: ["scripts/check-auth-signup.mjs"],
      },
      {
        checkId: "security.storage",
        summary: "Local Storage role and operation matrix is verified",
        command: process.execPath,
        args: ["scripts/check-supabase-storage.mjs"],
      },
      headers,
      secretScan,
    ];
  }

  const projectRef = projectRefFromUrl(environment.NEXT_PUBLIC_SUPABASE_URL);
  if (!projectRef) throw new Error("hosted_project_identity_missing");
  if (!/^[a-z0-9]{20}$/.test(environment.PRODUCTION_SUPABASE_PROJECT_REF ?? "")) {
    throw new Error("production_project_identity_missing");
  }
  return [
    {
      checkId: "security.target",
      summary: `${profile} target is authorized for read-only verification`,
      command: process.execPath,
      args: [
        "scripts/check-deploy-target.mjs",
        "--context", profile === "preview" ? "deploy-preview" : "production",
        "--operation", "read-only",
        "--sha", sha,
        "--production-project-ref", environment.PRODUCTION_SUPABASE_PROJECT_REF,
      ],
    },
    {
      checkId: "security.hosted",
      summary: `${profile} hosted Supabase configuration is audited read-only`,
      command: process.execPath,
      args: ["scripts/check-hosted-supabase-security.mjs", "--url", environment.NEXT_PUBLIC_SUPABASE_URL, "--project-ref", projectRef],
    },
    headers,
    secretScan,
  ];
}

function executeStep(step, { cwd, environment, profile, candidateSha }) {
  const result = spawnSync(step.command, step.args, {
    cwd,
    env: { ...environment, ...step.env },
    encoding: "utf8",
    stdio: "pipe",
    maxBuffer: 20 * 1024 * 1024,
  });
  const passed = result.status === 0;
  return {
    checkId: step.checkId,
    status: passed ? "passed" : "failed",
    profile,
    candidateSha,
    exitCode: result.status ?? 1,
    summary: passed ? step.summary : `${step.summary} failed`,
  };
}

export function runProductionSecurity({
  profile,
  candidateSha,
  cwd = process.cwd(),
  environment = process.env,
}) {
  if (!PROFILES.has(profile)) throw new Error("invalid_security_profile");
  const sha = candidateSha ?? currentSha(cwd);
  if (!SHA_PATTERN.test(sha)) throw new Error("invalid_candidate_sha");
  if (profile !== "local" && environment.COMMIT_REF !== sha) throw new Error("hosted_candidate_sha_mismatch");
  return commandPlan(profile, environment, sha).map((step) => executeStep(step, {
    cwd,
    environment,
    profile,
    candidateSha: sha,
  }));
}

function main() {
  let results;
  try {
    const argumentsMap = parseArguments(process.argv.slice(2));
    const profile = argumentsMap.get("profile") ?? process.env.PRODUCTION_SECURITY_PROFILE ?? "local";
    const candidateSha = argumentsMap.get("sha");
    results = runProductionSecurity({ profile, candidateSha });
  } catch {
    results = [{
      checkId: "security.orchestrator",
      status: "failed",
      profile: "invalid",
      candidateSha: null,
      exitCode: 1,
      summary: "Production security orchestration could not start",
    }];
  }
  for (const result of results) process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exitCode = results.some(({ status }) => status !== "passed") ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
