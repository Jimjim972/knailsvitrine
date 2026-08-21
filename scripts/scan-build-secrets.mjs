import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { emit, fail, pass } from "./run-foundation-checks.mjs";

const GENERATED_DIRECTORIES = new Set([
  ".git",
  ".next",
  ".netlify",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "out",
  "playwright-report",
  "test-results",
]);
const BUILD_DIRECTORIES = [".next", ".netlify", "build", "dist", "out", "playwright-report"];
const BUILD_SCAN_TARGETS = [
  ".next/server",
  ".next/static",
  ".next/types",
  ".netlify/deploy/v1",
  ".netlify/edge-functions-dist",
  ".netlify/functions",
  ".netlify/functions-internal",
  ".netlify/static",
  ".netlify/v1/functions",
  "build",
  "dist",
  "out",
  "playwright-report",
];
const SURFACE_ORDER = ["repository", "history", "build", "responses", "artifacts", "report"];

const COMMON_PATTERNS = [
  /\bsb_secret_[A-Za-z0-9_-]{16,}\b/g,
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
  /\b(?:authorization\s*:\s*bearer|cookie\s*:|set-cookie\s*:)[A-Za-z0-9._-]{16,}/gi,
  /(?:^|\n)\s*(?:export\s+)?SUPABASE_SERVICE_ROLE_KEY\s*=\s*["']?[A-Za-z0-9._-]{16,}/gm,
  /(?:^|\n)\s*(?:export\s+)?NEXT_PUBLIC_[A-Z0-9_]*(?:SECRET|SERVICE_ROLE)\s*=\s*["']?[^\s"']{16,}/gm,
  /(?:^|\n)\s*(?:export\s+)?SERVICE_SUCCESS_FLASH_SECRET\s*=\s*["']?[^\s"']{32,}/gm,
  /(?:^|\n)\s*(?:export\s+)?SUPABASE_GALLERY_CONFIG_(?:URL|PROJECT_REF|SECRET_KEY)\s*=\s*["']?(?:https:\/\/(?!your-project-ref\.)|[a-z0-9]{20}|sb_secret_)[^\s"']*/gm,
  /(?:^|\n)\s*(?:const\s+)?(?:password|passwd)\s*=\s*["'][A-Za-z0-9!@#$%^&*._-]{12,}["']/gim,
];

const BUILD_PATTERNS = [
  ...COMMON_PATTERNS,
  /\bphotos\/[0-9a-f]{8}-[0-9a-f-]{27,}\.(?:jpg|jpeg|png|webp)\b/gi,
  /https:\/\/[^\s]+\/storage\/v1\/object\/(?:sign|authenticated)\/[^\s?]+\?token=[A-Za-z0-9._-]{12,}/gi,
];

const ARTIFACT_PATTERNS = [
  ...BUILD_PATTERNS,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  /\b(?:message|contact_message|contact-content)\s*[=:]\s*[^\r\n]+/gi,
  /\b(?:storage_path|pending_storage_path|cleanup_storage_path)\s*[=:]\s*[^\s]+/gi,
  /\b(?:original_filename|original-file-name)\s*[=:]\s*[^\r\n]+/gi,
  /\b(?:PostgrestError|SqlError|SQLSTATE|relation\s+[^\r\n]+?\s+does not exist)[^\r\n]*/gi,
];

function countFindings(text, patterns) {
  let count = 0;
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    count += Array.from(text.matchAll(pattern)).length;
  }
  return count;
}

function readInspectableText(path) {
  const stats = statSync(path);
  if (!stats.isFile() || stats.size > 10 * 1024 * 1024) return null;
  const bytes = readFileSync(path);
  if (bytes.subarray(0, Math.min(bytes.length, 8_192)).includes(0)) return null;
  return bytes.toString("utf8");
}

function walk(directory, { skipGenerated = false } = {}) {
  if (!existsSync(directory)) return [];
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory() && [".cache", ".git", "cache", "node_modules"].includes(entry.name)) continue;
    if (skipGenerated && entry.isDirectory() && GENERATED_DIRECTORIES.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(path, { skipGenerated }));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

function repositoryFiles(workspace) {
  const listed = spawnSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], {
    cwd: workspace,
    encoding: "buffer",
    stdio: "pipe",
  });
  if (listed.status !== 0) return walk(workspace, { skipGenerated: true });
  return listed.stdout.toString("utf8").split("\0").filter(Boolean).map((path) => join(workspace, path)).filter((path) => {
    const firstSegment = relative(workspace, path).split(sep)[0];
    return !GENERATED_DIRECTORIES.has(firstSegment) && existsSync(path) && statSync(path).isFile();
  });
}

function generatedSurface(workspace, path) {
  const relativePath = relative(workspace, path).split(sep).join("/");
  if (BUILD_DIRECTORIES.some((directory) => relativePath === directory || relativePath.startsWith(`${directory}/`))) {
    return "build";
  }
  if (!relativePath.startsWith("test-results/")) return null;
  if (["report.json", "summary.md"].includes(basename(path))) return "report";
  if (relativePath.includes("/responses/") || relativePath.includes("/logs/")) return "responses";
  return "artifacts";
}

function inspectFiles(files, patterns, surface, findings) {
  for (const path of files) {
    const text = readInspectableText(path);
    if (text === null) continue;
    const count = countFindings(text, patterns);
    if (count > 0) findings.set(surface, (findings.get(surface) ?? 0) + count);
  }
}

function ripgrepPattern(pattern) {
  return pattern.flags.includes("i") ? `(?i:${pattern.source})` : pattern.source;
}

function matchingFilesWithRipgrep(workspace, targets, patterns) {
  if (targets.length === 0) return [];
  const args = [
    "-I",
    "-U",
    "-l",
    "-0",
    "--pcre2",
    "--hidden",
    "--no-ignore",
    "--glob",
    "!**/.cache/**",
    "--glob",
    "!**/cache/**",
    "--glob",
    "!**/node_modules/**",
  ];
  for (const pattern of patterns) args.push("-e", ripgrepPattern(pattern));
  args.push(...targets);
  const scan = spawnSync("rg", args, { cwd: workspace, encoding: "buffer", stdio: "pipe" });
  if (scan.error?.code === "ENOENT") return null;
  if (![0, 1].includes(scan.status)) throw new Error("generated_secret_scan_failed");
  return scan.status === 1 ? [] : scan.stdout.toString("utf8").split("\0").filter(Boolean);
}

function inspectGeneratedSurfaces(workspace, findings) {
  const buildTargets = BUILD_SCAN_TARGETS.filter((directory) => existsSync(join(workspace, directory)));
  const artifactTargets = existsSync(join(workspace, "test-results")) ? ["test-results"] : [];
  const buildMatches = matchingFilesWithRipgrep(workspace, buildTargets, BUILD_PATTERNS);
  const artifactMatches = matchingFilesWithRipgrep(workspace, artifactTargets, ARTIFACT_PATTERNS);
  if (buildMatches === null || artifactMatches === null) {
    for (const directory of buildTargets) inspectFiles(walk(join(workspace, directory)), BUILD_PATTERNS, "build", findings);
    for (const path of walk(join(workspace, "test-results"))) {
      const surface = generatedSurface(workspace, path);
      if (surface) inspectFiles([path], ARTIFACT_PATTERNS, surface, findings);
    }
    return;
  }
  for (const relativePath of [...buildMatches, ...artifactMatches]) {
    const surface = generatedSurface(workspace, join(workspace, relativePath));
    if (surface) findings.set(surface, (findings.get(surface) ?? 0) + 1);
  }
}

function inspectHistory(workspace, candidateSha, findings) {
  const revision = candidateSha ?? "HEAD";
  if (candidateSha && !/^[0-9a-f]{40}$/.test(candidateSha)) throw new Error("invalid_candidate_sha");
  const history = execFileSync("git", ["log", "-p", "--format=", "--no-ext-diff", revision], {
    cwd: workspace,
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
    stdio: ["ignore", "pipe", "ignore"],
  });
  const count = countFindings(history, COMMON_PATTERNS);
  if (count > 0) findings.set("history", count);
}

export function scanSecretSurfaces({ workspace = process.cwd(), includeHistory = true, candidateSha } = {}) {
  const root = resolve(workspace);
  const findings = new Map();
  inspectFiles(repositoryFiles(root), COMMON_PATTERNS, "repository", findings);
  inspectGeneratedSurfaces(root, findings);

  if (includeHistory) {
    try {
      inspectHistory(root, candidateSha, findings);
    } catch {
      findings.set("history", Math.max(1, findings.get("history") ?? 0));
    }
  }

  const surfaces = SURFACE_ORDER.filter((surface) => findings.has(surface));
  const findingCount = [...findings.values()].reduce((total, count) => total + count, 0);
  return findingCount === 0
    ? { status: "pass", findingCount: 0, surfaces: [] }
    : { status: "fail", findingCount, surfaces };
}

function parseArguments(argv) {
  let includeHistory = true;
  let candidateSha;
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--no-history") includeHistory = false;
    else if (argv[index] === "--candidate-sha" && argv[index + 1]) candidateSha = argv[++index];
    else throw new Error("invalid_secret_scan_arguments");
  }
  return { includeHistory, candidateSha };
}

function main() {
  let scan;
  try {
    scan = scanSecretSurfaces(parseArguments(process.argv.slice(2)));
  } catch {
    scan = { status: "fail", findingCount: 1, surfaces: ["repository"] };
  }
  const result = scan.status === "pass"
    ? pass("privilege.tooling.secret_scan", "Repository, candidate history, build, responses, artifacts and report contain no forbidden value")
    : fail("privilege.tooling.secret_scan", "privilege", `Secret scan found ${scan.findingCount} forbidden occurrence(s) across ${scan.surfaces.length} surface(s)`);
  emit([result]);
  process.exitCode = result.status === "pass" ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
