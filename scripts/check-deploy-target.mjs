#!/usr/bin/env node

import { pathToFileURL } from "node:url";
import { evaluateDeploymentTarget } from "../lib/production-readiness/target-guard.ts";
import { CANONICAL_ORIGIN } from "../lib/site/deployment-context.ts";
import { contactFormNameForContext } from "../lib/contact/constants.ts";

const SHA_PATTERN = /^[0-9a-f]{40}$/;
const CONTEXTS = new Set(["local", "deploy_preview", "branch_deploy", "production"]);
const CONTEXT_ALIASES = new Map([
  ["local", "local"],
  ["dev", "local"],
  ["deploy_preview", "deploy_preview"],
  ["deploy-preview", "deploy_preview"],
  ["branch_deploy", "branch_deploy"],
  ["branch-deploy", "branch_deploy"],
  ["production", "production"],
]);

function denied(diagnosticCode, context = null, candidateSha = null) {
  return {
    allowed: false,
    diagnosticCode,
    ...(context ? { context } : {}),
    ...(candidateSha && SHA_PATTERN.test(candidateSha) ? { candidateSha } : {}),
  };
}

export function checkDeployTarget(input) {
  const candidateSha = typeof input?.candidateSha === "string" ? input.candidateSha : "";
  if (!SHA_PATTERN.test(candidateSha)) return denied("invalid_candidate_sha");

  const context = typeof input?.context === "string" ? input.context : "";
  if (!CONTEXTS.has(context)) return denied("invalid_deployment_context", null, candidateSha);

  if (!SHA_PATTERN.test(input.commitRef ?? "") || input.commitRef !== candidateSha) {
    return denied("candidate_commit_mismatch", context, candidateSha);
  }
  if (input.operation !== "read_only" && input.operation !== "mutable") {
    return denied("invalid_operation", context, candidateSha);
  }

  const requiredBooleans = [
    input.canonicalMatch,
    input.isProductionData,
    input.mutationAuthorized,
  ];
  if (requiredBooleans.some((value) => typeof value !== "boolean")) {
    return denied("invalid_target_input", context, candidateSha);
  }

  const guard = evaluateDeploymentTarget({
    context,
    siteOrigin: typeof input.siteOrigin === "string" ? input.siteOrigin : "",
    canonicalMatch: input.canonicalMatch,
    supabaseProjectRef: typeof input.supabaseProjectRef === "string"
      ? input.supabaseProjectRef
      : undefined,
    isProductionData: input.isProductionData,
    mutationAuthorized: input.mutationAuthorized,
    formName: input.formName,
  }, {
    operation: input.operation,
    productionSupabaseProjectRef: typeof input.productionSupabaseProjectRef === "string"
      ? input.productionSupabaseProjectRef
      : undefined,
  });

  return {
    allowed: guard.allowed,
    diagnosticCode: guard.diagnosticCode,
    context,
    candidateSha,
  };
}

function parseFlags(argv) {
  const flags = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith("--")) throw new Error("invalid_cli_argument");
    const [rawName, inlineValue] = argument.slice(2).split("=", 2);
    if (inlineValue !== undefined) {
      flags.set(rawName, inlineValue);
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      flags.set(rawName, next);
      index += 1;
    } else {
      flags.set(rawName, "true");
    }
  }
  return flags;
}

function projectRefFromUrl(rawUrl) {
  if (!rawUrl) return "";
  try {
    return new URL(rawUrl).hostname.match(/^([a-z0-9]{8,})\.supabase\.co$/)?.[1] ?? "";
  } catch {
    return "";
  }
}

function cliInput(argv, environment) {
  const flags = parseFlags(argv);
  const rawContext = flags.get("context") ?? environment.CONTEXT ?? "";
  const context = CONTEXT_ALIASES.get(rawContext) ?? rawContext;
  const operation = (flags.get("operation") ?? "read-only") === "mutable"
    ? "mutable"
    : (flags.get("operation") ?? "read-only") === "read-only" ? "read_only" : "invalid";
  const currentProjectRef = projectRefFromUrl(environment.NEXT_PUBLIC_SUPABASE_URL);
  const productionProjectRef = flags.get("production-project-ref")
    ?? environment.PRODUCTION_SUPABASE_PROJECT_REF
    ?? "";
  const siteOrigin = context === "production"
    ? environment.URL ?? ""
    : environment.DEPLOY_PRIME_URL ?? "";
  const candidateSha = flags.get("sha")
    ?? environment.PRODUCTION_CANDIDATE_SHA
    ?? environment.COMMIT_REF
    ?? "";

  return {
    candidateSha,
    context,
    siteOrigin,
    commitRef: environment.COMMIT_REF ?? "",
    supabaseProjectRef: currentProjectRef,
    productionSupabaseProjectRef: productionProjectRef,
    isProductionData: Boolean(currentProjectRef && currentProjectRef === productionProjectRef),
    mutationAuthorized: flags.get("allow-mutation") === "true",
    formName: CONTEXTS.has(context) ? contactFormNameForContext(context) : "contact-preview",
    canonicalMatch: context === "production" && siteOrigin === CANONICAL_ORIGIN,
    operation,
  };
}

function isMainModule() {
  return process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
}

if (isMainModule()) {
  let result;
  try {
    result = checkDeployTarget(cliInput(process.argv.slice(2), process.env));
  } catch {
    result = denied("invalid_cli_argument");
  }
  process.stdout.write(`${JSON.stringify(result)}\n`);
  if (!result.allowed) process.exitCode = 1;
}
