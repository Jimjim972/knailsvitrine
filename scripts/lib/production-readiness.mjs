import { createHash, randomUUID } from "node:crypto";
import { closeSync, mkdirSync, openSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";

const SENSITIVE_PATTERNS = [
  /\b(?:sb_secret_[A-Za-z0-9_-]{12,}|service_role\s*[=:]\s*[^\s]+)/gi,
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
  /\b(?:authorization\s*:\s*bearer|cookie\s*:|set-cookie\s*:)[^\r\n]+/gi,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  /\b(?:message|contact_message|contact-content)\s*[=:]\s*[^\r\n]+/gi,
  /\b(?:storage_path|pending_storage_path|cleanup_storage_path)\s*[=:]\s*[^\s]+/gi,
  /https:\/\/[^\s]+\/storage\/v1\/object\/(?:sign|authenticated)\/[^\s]+/gi,
  /\b(?:SUPABASE_GALLERY_CONFIG_[A-Z_]+|NEXT_PUBLIC_[A-Z0-9_]*SECRET|SERVICE_SUCCESS_FLASH_SECRET)\s*[=:]\s*[^\s]+/g,
  /\b(?:password|passwd)\s*=\s*[^\s]+/gi,
  /\b(?:original_filename|original-file-name)\s*[=:]\s*[^\r\n]+/gi,
  /\b(?:PostgrestError|SqlError|SQLSTATE|relation\s+[^\r\n]+?\s+does not exist)[^\r\n]*/gi,
];

const STORAGE_PATH_PATTERN = /\bphotos\/[0-9a-f]{8}-[0-9a-f-]{27,}\.webp\b/gi;

export function redactSensitiveText(value) {
  let redacted = String(value);
  for (const pattern of SENSITIVE_PATTERNS) redacted = redacted.replace(pattern, "[REDACTED]");
  return redacted.replace(STORAGE_PATH_PATTERN, "[REDACTED_STORAGE_PATH]");
}

export function assertArtifactIsRedacted(value) {
  const raw = String(value);
  for (const pattern of [...SENSITIVE_PATTERNS, STORAGE_PATH_PATTERN]) {
    pattern.lastIndex = 0;
    if (pattern.test(raw)) throw new Error("sensitive_artifact_detected");
  }
  return true;
}

function assertSha(sha) {
  if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error("invalid_candidate_sha");
}

export function productionReadinessDirectory(workspace, sha) {
  assertSha(sha);
  return join(resolve(workspace), "test-results", "production-readiness", sha);
}

function assertContained(root, target) {
  const pathFromRoot = relative(root, target);
  if (!pathFromRoot || pathFromRoot === ".." || pathFromRoot.startsWith(`..${sep}`) || resolve(target) === resolve(root)) {
    throw new Error("artifact_path_outside_candidate");
  }
}

export function writeAtomicArtifact({ workspace = process.cwd(), sha, relativePath, content }) {
  const root = productionReadinessDirectory(workspace, sha);
  const target = resolve(root, relativePath);
  assertContained(root, target);
  const redacted = redactSensitiveText(typeof content === "string" ? content : `${JSON.stringify(content, null, 2)}\n`);
  assertArtifactIsRedacted(redacted);
  mkdirSync(dirname(target), { recursive: true });
  const temporary = `${target}.${randomUUID()}.tmp`;
  try {
    const descriptor = openSync(temporary, "wx", 0o600);
    writeFileSync(descriptor, redacted, "utf8");
    closeSync(descriptor);
    renameSync(temporary, target);
  } finally {
    rmSync(temporary, { force: true });
  }
  return target;
}

export function runRedactedCommand({
  command,
  args = [],
  cwd = process.cwd(),
  env = process.env,
  workspace = cwd,
  sha,
  artifactPath,
}) {
  if (!command || args.some((argument) => typeof argument !== "string")) throw new Error("invalid_command");
  const result = spawnSync(command, args, {
    cwd,
    env,
    encoding: "utf8",
    shell: false,
    maxBuffer: 10 * 1024 * 1024,
  });
  const record = {
    command: [command, ...args].map((part) => redactSensitiveText(part)),
    exitCode: result.status ?? 1,
    signal: result.signal ?? null,
    stdout: redactSensitiveText(result.stdout ?? ""),
    stderr: redactSensitiveText(result.stderr ?? result.error?.message ?? ""),
  };
  assertArtifactIsRedacted(JSON.stringify(record));
  if (artifactPath) writeAtomicArtifact({ workspace, sha, relativePath: artifactPath, content: record });
  return record;
}

export function sha256File(path) {
  return `sha256:${createHash("sha256").update(readFileSync(path)).digest("hex")}`;
}

export function validateProviderArchive(reference, providerMetadata, expectedAssetDigests) {
  assertSha(reference.candidateSha);
  const expectedAssets = [reference.reportAssetName, reference.summaryAssetName];
  if (reference.provider !== "github_release" || reference.expectedImmutable !== true ||
      providerMetadata.releaseId !== reference.releaseId ||
      providerMetadata.releaseTag !== reference.releaseTag ||
      providerMetadata.candidateSha !== reference.candidateSha || providerMetadata.immutable !== true) {
    throw new Error("archive_identity_mismatch");
  }
  for (const assetName of expectedAssets) {
    const digest = providerMetadata.assetDigests?.[assetName];
    if (!/^sha256:[0-9a-f]{64}$/.test(digest ?? "")) throw new Error("archive_digest_missing");
    if (expectedAssetDigests && expectedAssetDigests[assetName] !== digest) {
      throw new Error("archive_digest_mismatch");
    }
  }
  if (Object.keys(providerMetadata.assetDigests).some((name) => !expectedAssets.includes(name))) {
    throw new Error("archive_asset_set_mismatch");
  }
  return {
    releaseId: reference.releaseId,
    candidateSha: reference.candidateSha,
    immutable: true,
    assetDigests: providerMetadata.assetDigests,
  };
}
