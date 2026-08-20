import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { createRequirementManifest } from "../lib/production-readiness/requirements.ts";

export const DOCUMENTATION_SOURCES = Object.freeze([
  "doc/spec.md",
  "doc/design.md",
  "doc/architecture.md",
  "doc/infra.md",
  "specs/006-production-readiness/spec.md",
  "specs/006-production-readiness/plan.md",
  "specs/006-production-readiness/research.md",
  "specs/006-production-readiness/data-model.md",
  "specs/006-production-readiness/quickstart.md",
  "specs/006-production-readiness/tasks.md",
  "specs/006-production-readiness/contracts/accessibility-verification.md",
  "specs/006-production-readiness/contracts/deployment-configuration.md",
  "specs/006-production-readiness/contracts/release-evidence.md",
  "specs/006-production-readiness/contracts/security-readiness.md",
  "specs/006-production-readiness/contracts/seo-discovery.md",
  "specs/006-production-readiness/contracts/visual-verification.md",
]);

function exactIds(content, prefix) {
  return [...content.matchAll(new RegExp(`\\*\\*${prefix}-(\\d{3})\\*\\*`, "g"))]
    .map((match) => `${prefix}-${match[1]}`);
}

export function inspectDocumentationSync(workspace, candidateSha) {
  if (!/^[0-9a-f]{40}$/.test(candidateSha)) throw new Error("invalid_candidate_sha");
  for (const source of DOCUMENTATION_SOURCES) {
    if (!existsSync(resolve(workspace, source))) throw new Error(`documentation_source_missing:${source}`);
  }
  const featureSpec = readFileSync(resolve(workspace, "specs/006-production-readiness/spec.md"), "utf8");
  const fr = exactIds(featureSpec, "FR");
  const sc = exactIds(featureSpec, "SC");
  if (fr.length !== 56 || new Set(fr).size !== 56) throw new Error("functional_requirement_inventory_drift");
  if (sc.length !== 16 || new Set(sc).size !== 16) throw new Error("success_criterion_inventory_drift");

  const productSpec = readFileSync(resolve(workspace, "doc/spec.md"), "utf8");
  const acceptanceSection = productSpec.split("## 16. Critères d'acceptation du MVP")[1]?.split("## 17.")[0] ?? "";
  const acceptanceCount = [...acceptanceSection.matchAll(/^\d+\. /gm)].length;
  if (acceptanceCount !== 13) throw new Error("acceptance_criterion_inventory_drift");

  const tasks = readFileSync(resolve(workspace, "specs/006-production-readiness/tasks.md"), "utf8");
  const taskIds = [...tasks.matchAll(/^- \[[ X]\] (T\d{3})\b/gm)].map((match) => match[1]);
  if (taskIds.length === 0 || new Set(taskIds).size !== taskIds.length) throw new Error("task_inventory_drift");

  const manifest = createRequirementManifest(candidateSha);
  if (manifest.length !== 157) throw new Error("requirement_manifest_drift");
  for (const marker of [
    "https://knailsbeauty.fr",
    "production:check",
    "production:preview-check",
    "production:smoke",
  ]) {
    const found = DOCUMENTATION_SOURCES.some((source) =>
      readFileSync(resolve(workspace, source), "utf8").includes(marker));
    if (!found) throw new Error(`documentation_marker_missing:${marker}`);
  }
  return { status: "passed", candidateSha, sources: DOCUMENTATION_SOURCES.length, requirements: manifest.length, tasks: taskIds.length };
}

function main() {
  const workspace = process.cwd();
  const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: workspace, encoding: "utf8" }).trim();
  if (process.env.KN_DOCUMENTATION_ALLOW_DIRTY !== "true") {
    const changed = execFileSync("git", ["status", "--porcelain", "--", ...DOCUMENTATION_SOURCES], {
      cwd: workspace,
      encoding: "utf8",
    }).trim();
    if (changed) throw new Error("documentation_sources_not_frozen");
  }
  process.stdout.write(`${JSON.stringify(inspectDocumentationSync(workspace, sha))}\n`);
}

const invokedAsScript = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (invokedAsScript) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${JSON.stringify({ status: "failed", code: error instanceof Error ? error.message : "unknown_error" })}\n`);
    process.exitCode = 1;
  }
}
