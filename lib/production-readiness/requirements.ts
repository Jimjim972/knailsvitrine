import type { RequirementKind, RequirementRecord } from "./types.ts";

const FEATURE_GATE_COUNTS = {
  "001-supabase-foundation": 10,
  "002-admin-authentication": 10,
  "003-services-management": 16,
  "004-gallery-management": 26,
  "005-contact-form": 10,
} as const;

function sequence(prefix: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => `${prefix}-${String(index + 1).padStart(3, "0")}`);
}

function record(
  requirementId: string,
  kind: RequirementKind,
  sourceDocument: string,
  sourceAnchor: string,
  sourceRevision: string,
): RequirementRecord {
  return {
    requirementId,
    kind,
    sourceDocument,
    sourceRevision,
    sourceAnchor,
    mandatory: true,
    evidenceIds: [`REQ-${requirementId}`],
  };
}

export function createRequirementManifest(sourceRevision: string): RequirementRecord[] {
  if (!/^[0-9a-f]{40}$/.test(sourceRevision)) throw new Error("invalid_source_revision");
  const manifest: RequirementRecord[] = [
    ...sequence("FR", 56).map((id) => record(
      id,
      "functional_requirement",
      "specs/006-production-readiness/spec.md",
      id,
      sourceRevision,
    )),
    ...sequence("SC", 16).map((id) => record(
      id,
      "success_criterion",
      "specs/006-production-readiness/spec.md",
      id,
      sourceRevision,
    )),
    ...sequence("DOC-SPEC-AC", 13).map((id) => record(
      id,
      "acceptance_criterion",
      "doc/spec.md",
      `section-16-${Number(id.slice(-3))}`,
      sourceRevision,
    )),
  ];

  for (const [feature, count] of Object.entries(FEATURE_GATE_COUNTS)) {
    for (const gate of sequence("SC", count)) {
      const featureNumber = feature.slice(0, 3);
      const requirementId = `FEATURE-${featureNumber}-${gate}`;
      manifest.push(record(
        requirementId,
        "feature_gate",
        `specs/${feature}/spec.md`,
        gate,
        sourceRevision,
      ));
    }
  }

  if (new Set(manifest.map((item) => item.requirementId)).size !== manifest.length) {
    throw new Error("duplicate_requirement_id");
  }
  return manifest;
}

export const REQUIREMENT_MANIFEST_COUNTS = Object.freeze({
  functionalRequirements: 56,
  successCriteria: 16,
  acceptanceCriteria: 13,
  featureGates: Object.values(FEATURE_GATE_COUNTS).reduce((total, count) => total + count, 0),
});
