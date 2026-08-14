import { GALLERY_IMAGE_LIMITS, type GalleryOperationKind, type GalleryRepairCode } from "./constants.ts";

export type FileOperationSnapshot = {
  photoId: string;
  fileState: "ready" | "pending" | "repair_required";
  operationKind: GalleryOperationKind | null;
  operationId: string | null;
  operationStartedAt: string | null;
  pendingStoragePath: string | null;
  cleanupStoragePath: string | null;
  repairCode: GalleryRepairCode | null;
};

export function operationMatches(snapshot: FileOperationSnapshot, operationId: string, kind?: GalleryOperationKind): boolean {
  return snapshot.fileState !== "ready"
    && snapshot.operationId === operationId
    && (kind === undefined || snapshot.operationKind === kind);
}

export function isStalePending(snapshot: FileOperationSnapshot, now = new Date()): boolean {
  if (snapshot.fileState !== "pending" || snapshot.operationStartedAt === null) return false;
  const startedAt = Date.parse(snapshot.operationStartedAt);
  return Number.isFinite(startedAt) && startedAt <= now.getTime() - GALLERY_IMAGE_LIMITS.pendingTimeoutMs;
}

export function staleRepairCode(objectPresent: boolean): Extract<GalleryRepairCode, "stale_pending_no_object" | "stale_pending_object_present"> {
  return objectPresent ? "stale_pending_object_present" : "stale_pending_no_object";
}

export function invalidObjectTransition(snapshot: FileOperationSnapshot, operationId: string): FileOperationSnapshot {
  if (!operationMatches(snapshot, operationId) || snapshot.operationKind === "delete") throw new Error("Gallery operation conflict");
  return { ...snapshot, fileState: "repair_required", repairCode: "invalid_object_bytes" };
}

export function stalePendingTransition(snapshot: FileOperationSnapshot, objectPresent: boolean, now = new Date()): FileOperationSnapshot {
  if (!isStalePending(snapshot, now)) throw new Error("Gallery operation is not stale");
  return { ...snapshot, fileState: "repair_required", repairCode: staleRepairCode(objectPresent) };
}

export function objectMissingTransition(
  snapshot: FileOperationSnapshot,
  operationId: string,
  startedAt = new Date(),
): FileOperationSnapshot {
  if (snapshot.fileState === "repair_required" && snapshot.repairCode === "object_missing") return snapshot;
  if (snapshot.fileState !== "ready") throw new Error("Gallery photo is not ready");
  return {
    ...snapshot,
    fileState: "repair_required",
    operationKind: "replace",
    operationId,
    operationStartedAt: startedAt.toISOString(),
    pendingStoragePath: null,
    cleanupStoragePath: null,
    repairCode: "object_missing",
  };
}

export function assertReplaceHasPendingPath(snapshot: FileOperationSnapshot, operationId: string): string {
  if (!operationMatches(snapshot, operationId, "replace") || snapshot.pendingStoragePath === null || snapshot.repairCode === "object_missing") {
    throw new Error("Replacement file has not been reserved");
  }
  return snapshot.pendingStoragePath;
}

export function reserveReplacementTransition(
  snapshot: FileOperationSnapshot,
  operationId: string,
  pendingStoragePath: string,
  startedAt = new Date(),
): FileOperationSnapshot {
  if (snapshot.fileState !== "ready" && !(snapshot.fileState === "repair_required" && snapshot.repairCode === "object_missing")) {
    throw new Error("Gallery photo is not replaceable");
  }
  return { ...snapshot, fileState: "pending", operationKind: "replace", operationId, operationStartedAt: startedAt.toISOString(), pendingStoragePath, cleanupStoragePath: null, repairCode: null };
}

export function replacementCleanupTransition(snapshot: FileOperationSnapshot, operationId: string, oldStoragePath: string): FileOperationSnapshot {
  assertReplaceHasPendingPath(snapshot, operationId);
  return { ...snapshot, cleanupStoragePath: oldStoragePath };
}

export function beginDeleteTransition(snapshot: FileOperationSnapshot, operationId: string, storagePath: string, startedAt = new Date()): FileOperationSnapshot {
  if (snapshot.fileState === "pending") throw new Error("Gallery photo operation already pending");
  return { ...snapshot, fileState: "pending", operationKind: "delete", operationId, operationStartedAt: startedAt.toISOString(), pendingStoragePath: null, cleanupStoragePath: storagePath, repairCode: null };
}

export function deleteFinalizationDecision(
  snapshot: FileOperationSnapshot,
  operationId: string,
  objectPresence: "present" | "absent" | "unknown",
  rowDeleted = false,
): "remove_object" | "delete_row" | "complete" | "object_delete_unconfirmed" | "row_delete_unconfirmed" {
  if (!operationMatches(snapshot, operationId, "delete") || snapshot.cleanupStoragePath === null) throw new Error("Gallery delete operation conflict");
  if (objectPresence === "unknown") return "object_delete_unconfirmed";
  if (objectPresence === "present") return "remove_object";
  if (!rowDeleted) return "delete_row";
  return "complete";
}

export function deleteRowFailureDecision(snapshot: FileOperationSnapshot, operationId: string): "row_delete_unconfirmed" {
  if (!operationMatches(snapshot, operationId, "delete")) throw new Error("Gallery delete operation conflict");
  return "row_delete_unconfirmed";
}
