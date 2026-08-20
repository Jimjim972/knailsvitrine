import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { buildReadinessReport, summarizeCoverageBySource } from "../lib/production-readiness/report.ts";
import { createRequirementManifest } from "../lib/production-readiness/requirements.ts";
import { verificationEvidenceSchema } from "../lib/production-readiness/evidence.ts";
import {
  assertArtifactIsRedacted,
  runRedactedCommand,
  writeAtomicArtifact,
} from "./lib/production-readiness.mjs";

const FEATURE_REQUIREMENTS = (feature, count) => Array.from(
  { length: count },
  (_, index) => `FEATURE-${feature}-SC-${String(index + 1).padStart(3, "0")}`,
);
const RANGE = (prefix, first, last) => Array.from(
  { length: last - first + 1 },
  (_, index) => `${prefix}-${String(first + index).padStart(3, "0")}`,
);

export const PROFILE_COMMANDS = Object.freeze({
  local: [
    { id: "quality", command: "npm", args: ["run", "lint"], requirementIds: ["FR-045", "SC-009"] },
    { id: "typecheck", command: "npm", args: ["run", "typecheck"], requirementIds: [] },
    { id: "build", command: "npm", args: ["run", "build"], requirementIds: [] },
    { id: "unit", command: "npm", args: ["run", "test:unit"], requirementIds: [] },
    { id: "unit-contact", command: "npm", args: ["run", "test:unit:contact"], requirementIds: [] },
    { id: "foundation", command: "npm", args: ["run", "foundation:check"], requirementIds: FEATURE_REQUIREMENTS("001", 10) },
    { id: "auth", command: "npm", args: ["run", "auth:check"], requirementIds: FEATURE_REQUIREMENTS("002", 10) },
    { id: "services", command: "npm", args: ["run", "services:check"], requirementIds: [...FEATURE_REQUIREMENTS("003", 16), "FR-048"] },
    { id: "gallery", command: "npm", args: ["run", "gallery:check"], requirementIds: [...FEATURE_REQUIREMENTS("004", 26), "FR-049", "FR-051", "SC-010", "SC-012"] },
    { id: "contact", command: "npm", args: ["run", "contact:check"], requirementIds: [...FEATURE_REQUIREMENTS("005", 10), "FR-050", "SC-011"] },
    {
      id: "seo",
      command: "npx",
      args: ["playwright", "test", "tests/production-readiness/seo.spec.ts", "--project=chromium"],
      env: { KN_PLAYWRIGHT_SUITE: "seo", KN_SEO_PROFILE: "local" },
      requirementIds: [...RANGE("FR", 13, 20), "SC-003", "SC-004"],
    },
    { id: "accessibility", command: "npm", args: ["run", "test:e2e:accessibility"], requirementIds: [...RANGE("FR", 21, 28), "SC-005", "SC-006"] },
    { id: "security", command: "npm", args: ["run", "security:check"], requirementIds: [...RANGE("FR", 30, 44), "SC-007", "SC-008"] },
    { id: "secret-scan", command: "npm", args: ["run", "scan:build-secrets"], requirementIds: ["FR-007", "FR-041", "SC-001"] },
    { id: "documentation", command: "npm", args: ["run", "documentation:check"], requirementIds: ["FR-052", "FR-053", "FR-054", "SC-013"] },
  ],
  preview: [
    { id: "target", command: "npm", args: ["run", "production:target-check", "--", "--context", "deploy-preview"], requirementIds: RANGE("FR", 1, 11) },
    { id: "security-preview", command: "npm", args: ["run", "security:preview-check"], requirementIds: [...RANGE("FR", 30, 44), "SC-007", "SC-008"] },
    { id: "seo-preview", command: "npm", args: ["run", "seo:check"], env: { KN_SEO_PROFILE: "preview" }, requirementIds: [...RANGE("FR", 13, 20), "SC-003", "SC-004"] },
    { id: "preproduction-e2e", command: "npm", args: ["run", "test:e2e:production-readiness"], requirementIds: [...RANGE("FR", 21, 28), "FR-045", "FR-046", "SC-005", "SC-006", "SC-009", "SC-016"] },
    { id: "documentation", command: "npm", args: ["run", "documentation:check"], requirementIds: ["FR-052", "FR-053", "FR-054", "SC-013"] },
  ],
});

function parseArgs(argv) {
  const values = { profile: "local", evidence: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--profile") values.profile = argv[++index];
    else if (argument === "--sha") values.sha = argv[++index];
    else if (argument === "--candidate-started-at") values.candidateStartedAt = argv[++index];
    else if (argument === "--evidence") values.evidence.push(argv[++index]);
    else throw new Error(`unknown_argument:${argument}`);
  }
  return values;
}

export function assertCommandPlan(profile, commands) {
  if (!Object.hasOwn(PROFILE_COMMANDS, profile)) throw new Error("unknown_readiness_profile");
  const expectedIds = PROFILE_COMMANDS[profile].map((item) => item.id);
  const actualIds = commands.map((item) => item.id);
  if (new Set(actualIds).size !== actualIds.length) throw new Error("duplicate_command_source");
  for (const expectedId of expectedIds) {
    if (!actualIds.includes(expectedId)) throw new Error(`missing_command_source:${expectedId}`);
  }
  if (actualIds.some((id) => !expectedIds.includes(id))) throw new Error("unexpected_command_source");
}

export function assertFrozenSha(before, after) {
  if (!/^[0-9a-f]{40}$/.test(before) || before !== after) throw new Error("candidate_sha_changed");
}

export function validateCommandResult(result) {
  if (!result || !Number.isInteger(result.exitCode) || !Array.isArray(result.command) ||
      typeof result.stdout !== "string" || typeof result.stderr !== "string") {
    throw new Error("invalid_command_output");
  }
  assertArtifactIsRedacted(JSON.stringify(result));
  return result;
}

function loadEvidenceFiles(paths) {
  return paths.flatMap((path) => {
    const raw = readFileSync(path, "utf8");
    assertArtifactIsRedacted(raw);
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed) ? parsed : [parsed];
    return items.map((item) => verificationEvidenceSchema.parse(item));
  });
}

function notRunEvidence(requirementId, candidate, artifactRef) {
  return {
    evidenceId: `NOT-RUN-${requirementId}`,
    requirementIds: [requirementId],
    category: "operations",
    mandatory: true,
    phase: "preproduction",
    status: "not_run",
    gitSha: candidate.gitSha,
    environment: candidate.context,
    executedAt: candidate.startedAt,
    executor: "automated",
    toolVersions: { orchestrator: "1.0.0" },
    expected: "Une preuve réelle et datée doit satisfaire ce critère.",
    observed: "Aucune preuve admissible n'a encore été fournie.",
    artifactRefs: [artifactRef],
    actionRequired: "Exécuter ou signer le contrôle requis sur ce SHA.",
  };
}

function commandEvidence(definition, result, candidate) {
  if (definition.requirementIds.length === 0) return null;
  return {
    evidenceId: `COMMAND-${definition.id.toUpperCase()}`,
    requirementIds: definition.requirementIds,
    category: definition.id.includes("seo") ? "seo" :
      definition.id.includes("accessibility") ? "a11y" :
      definition.id.includes("security") || definition.id === "secret-scan" ? "operations" : "operations",
    mandatory: true,
    phase: "preproduction",
    status: result.exitCode === 0 ? "passed" : "failed",
    gitSha: candidate.gitSha,
    environment: candidate.context,
    executedAt: new Date().toISOString(),
    executor: "automated",
    toolVersions: { orchestrator: "1.0.0" },
    expected: `${definition.id} se termine sans erreur.`,
    observed: result.exitCode === 0 ? "Commande réussie." : "Commande en échec.",
    artifactRefs: [`commands/${definition.id}.json`],
    ...(result.exitCode === 0 ? {} : { actionRequired: `Corriger le gate ${definition.id}.` }),
  };
}

export function createOrchestratedEvidence({ candidate, commandDefinitions, commandResults, externalEvidence = [] }) {
  const generated = commandDefinitions
    .map((definition) => commandEvidence(definition, commandResults.get(definition.id), candidate))
    .filter(Boolean);
  const covered = new Set([...generated, ...externalEvidence].flatMap((item) => item.requirementIds));
  const fallbackRef = "commands/not-run.json";
  const pending = createRequirementManifest(candidate.gitSha)
    .filter((requirement) => !covered.has(requirement.requirementId))
    .map((requirement) => notRunEvidence(requirement.requirementId, candidate, fallbackRef));
  return [...generated, ...externalEvidence, ...pending];
}

export function runReadinessOrchestrator({
  profile,
  candidate,
  commands = PROFILE_COMMANDS[profile],
  runner,
  externalEvidence = [],
  shaAfter = candidate.gitSha,
  promotionApproval,
  launchApproval,
  archive,
  archiveVerification,
}) {
  assertCommandPlan(profile, commands);
  const commandResults = new Map();
  for (const definition of commands) {
    const result = validateCommandResult(runner(definition));
    commandResults.set(definition.id, result);
  }
  const observedShaAfter = typeof shaAfter === "function" ? shaAfter() : shaAfter;
  assertFrozenSha(candidate.gitSha, observedShaAfter);
  const evidence = createOrchestratedEvidence({ candidate, commandDefinitions: commands, commandResults, externalEvidence });
  const report = buildReadinessReport({
    candidate,
    evidence,
    promotionApproval,
    launchApproval,
    archive,
    archiveVerification,
  });
  return { report, commandResults, coverageBySource: summarizeCoverageBySource(report) };
}

function currentSha(workspace) {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: workspace, encoding: "utf8" }).trim();
}

function currentBranch(workspace) {
  return execFileSync("git", ["branch", "--show-current"], { cwd: workspace, encoding: "utf8" }).trim();
}

function treeState(workspace) {
  return execFileSync("git", ["status", "--porcelain"], { cwd: workspace, encoding: "utf8" }).trim() ? "dirty" : "clean";
}

async function main() {
  const workspace = process.cwd();
  const options = parseArgs(process.argv.slice(2));
  if (!Object.hasOwn(PROFILE_COMMANDS, options.profile)) throw new Error("unknown_readiness_profile");
  const sha = options.sha ?? currentSha(workspace);
  const startedAt = options.candidateStartedAt ?? new Date().toISOString();
  const context = options.profile === "preview" ? "deploy_preview" : "local";
  const candidate = {
    candidateId: `${context}-${sha.slice(0, 12)}`,
    gitSha: sha,
    branch: currentBranch(workspace),
    treeState: treeState(workspace),
    context,
    ...(context === "deploy_preview" ? {
      deployId: process.env.DEPLOY_ID ?? "unverified-deploy",
      deployPermalink: process.env.DEPLOY_PRIME_URL,
    } : {}),
    startedAt,
  };
  const externalEvidence = loadEvidenceFiles(options.evidence);
  const commands = PROFILE_COMMANDS[options.profile];
  const result = runReadinessOrchestrator({
    profile: options.profile,
    candidate,
    commands,
    externalEvidence,
    runner(definition) {
      return runRedactedCommand({
        command: definition.command,
        args: definition.args,
        cwd: workspace,
        env: { ...process.env, ...definition.env },
        workspace,
        sha,
        artifactPath: `commands/${definition.id}.json`,
      });
    },
    shaAfter: () => currentSha(workspace),
  });
  writeAtomicArtifact({
    workspace,
    sha,
    relativePath: "commands/not-run.json",
    content: { status: "not_run", actionRequired: "Fournir les preuves distantes et manuelles restantes." },
  });
  writeAtomicArtifact({ workspace, sha, relativePath: "report.json", content: result.report });
  writeAtomicArtifact({
    workspace,
    sha,
    relativePath: "summary.md",
    content: `# Production readiness\n\n- SHA: \`${sha}\`\n- Promotion: \`${result.report.promotionDecision}\`\n- Lancement: \`${result.report.launchDecision}\`\n- Raisons: ${result.report.decisionReasons.join(", ") || "aucune"}\n`,
  });
  process.stdout.write(`${JSON.stringify({
    sha,
    profile: options.profile,
    promotionDecision: result.report.promotionDecision,
    launchDecision: result.report.launchDecision,
    failedCommands: [...result.commandResults.entries()].filter(([, item]) => item.exitCode !== 0).map(([id]) => id),
  })}\n`);
  if ([...result.commandResults.values()].some((item) => item.exitCode !== 0)) process.exitCode = 1;
}

const invokedAsScript = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (invokedAsScript) main().catch((error) => {
  process.stderr.write(`${JSON.stringify({ status: "failed", code: error instanceof Error ? error.message : "unknown_error" })}\n`);
  process.exitCode = 1;
});
