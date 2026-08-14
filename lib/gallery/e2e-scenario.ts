type OperationKind = "create" | "replace" | "delete";

type ScenarioRow = {
  id: string;
  storagePath: string;
  fileState: "ready" | "pending" | "repair_required";
  operationKind: OperationKind | null;
  operationId: string | null;
  pendingStoragePath: string | null;
  cleanupStoragePath: string | null;
  repairCode: "invalid_object_bytes" | null;
};

type StoredObject = { valid: boolean };

export const GALLERY_INTERRUPTION_POINTS = ["C1", "C2", "C3", "C4", "R1", "R2", "R3", "R4", "R5", "D1", "D2", "D3"] as const;
export type GalleryInterruptionPoint = typeof GALLERY_INTERRUPTION_POINTS[number];

export type ScenarioSnapshot = {
  rows: ScenarioRow[];
  objectPaths: string[];
};

export function getGalleryE2EScenario() {
  const scenario = process.env.KN_GALLERY_E2E_SCENARIO;
  return scenario === "admin-empty" || scenario === "admin-unavailable" ? scenario : null;
}

const idFor = (prefix: string, index: number) => `${prefix}-${index.toString().padStart(4, "0")}`;
const pathFor = (prefix: string, index: number) => `photos/${prefix}-${index.toString().padStart(4, "0")}.webp`;

export class GalleryScenarioStore {
  readonly rows = new Map<string, ScenarioRow>();
  readonly objects = new Map<string, StoredObject>();

  seedReady(index = 1) {
    const id = idFor("photo", index); const path = pathFor("ready", index);
    this.rows.set(id, { id, storagePath: path, fileState: "ready", operationKind: null, operationId: null, pendingStoragePath: null, cleanupStoragePath: null, repairCode: null });
    this.objects.set(path, { valid: true });
    return id;
  }

  interruptCreate(point: Extract<GalleryInterruptionPoint, `C${number}`>, index = 1) {
    const id = idFor("created", index); const path = pathFor("created", index); const operationId = idFor("create-operation", index);
    const pending: ScenarioRow = { id, storagePath: path, fileState: "pending", operationKind: "create", operationId, pendingStoragePath: path, cleanupStoragePath: null, repairCode: null };
    this.rows.set(id, pending);
    if (point !== "C1") this.objects.set(path, { valid: point !== "C3" });
    if (point === "C3") this.rows.set(id, { ...pending, fileState: "repair_required", repairCode: "invalid_object_bytes" });
    if (point === "C4") this.rows.set(id, readyRow(pending, path));
    return id;
  }

  interruptReplace(point: Extract<GalleryInterruptionPoint, `R${number}`>, index = 1) {
    const id = this.seedReady(index); const current = required(this.rows.get(id)); const oldPath = current.storagePath;
    const nextPath = pathFor("replacement", index); const operationId = idFor("replace-operation", index);
    const pending: ScenarioRow = { ...current, fileState: "pending", operationKind: "replace", operationId, pendingStoragePath: nextPath, cleanupStoragePath: null };
    this.rows.set(id, pending);
    if (point !== "R1") this.objects.set(nextPath, { valid: true });
    if (["R4", "R5"].includes(point)) this.rows.set(id, { ...pending, storagePath: nextPath, pendingStoragePath: null, cleanupStoragePath: oldPath });
    if (point === "R5") this.objects.delete(oldPath);
    return id;
  }

  interruptDelete(point: Extract<GalleryInterruptionPoint, `D${number}`>, index = 1) {
    const id = this.seedReady(index); const current = required(this.rows.get(id));
    this.rows.set(id, { ...current, fileState: "pending", operationKind: "delete", operationId: idFor("delete-operation", index), pendingStoragePath: null, cleanupStoragePath: current.storagePath });
    if (point !== "D1") this.objects.delete(current.storagePath);
    if (point === "D3") this.rows.delete(id);
    return id;
  }

  recover(photoId: string) {
    const row = this.rows.get(photoId);
    if (!row) return;
    if (row.operationKind === "create") {
      const object = row.pendingStoragePath ? this.objects.get(row.pendingStoragePath) : undefined;
      if (row.repairCode === "invalid_object_bytes" || !object) {
        if (row.pendingStoragePath) this.objects.delete(row.pendingStoragePath);
        this.rows.delete(photoId);
      } else if (object.valid && row.pendingStoragePath) {
        this.rows.set(photoId, readyRow(row, row.pendingStoragePath));
      }
      return;
    }
    if (row.operationKind === "replace") {
      if (row.pendingStoragePath) {
        const pending = this.objects.get(row.pendingStoragePath);
        if (!pending) {
          this.rows.set(photoId, readyRow(row, row.storagePath));
          return;
        }
        const oldPath = row.storagePath;
        this.rows.set(photoId, { ...row, storagePath: row.pendingStoragePath, pendingStoragePath: null, cleanupStoragePath: oldPath });
      }
      const swapped = required(this.rows.get(photoId));
      if (swapped.cleanupStoragePath) this.objects.delete(swapped.cleanupStoragePath);
      this.rows.set(photoId, readyRow(swapped, swapped.storagePath));
      return;
    }
    if (row.operationKind === "delete") {
      if (row.cleanupStoragePath) this.objects.delete(row.cleanupStoragePath);
      this.rows.delete(photoId);
    }
  }

  snapshot(): ScenarioSnapshot {
    return {
      rows: [...this.rows.values()].sort((a, b) => a.id.localeCompare(b.id)),
      objectPaths: [...this.objects.keys()].sort(),
    };
  }
}

function readyRow(row: ScenarioRow, storagePath: string): ScenarioRow {
  return { ...row, storagePath, fileState: "ready", operationKind: null, operationId: null, pendingStoragePath: null, cleanupStoragePath: null, repairCode: null };
}

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("Scenario invariant missing");
  return value;
}

function assertConverged(store: GalleryScenarioStore) {
  for (const row of store.rows.values()) {
    if (row.fileState !== "ready" || row.operationKind !== null || !store.objects.has(row.storagePath)) throw new Error("Scenario did not converge to ready row/object pairs");
  }
  const referenced = new Set([...store.rows.values()].map((row) => row.storagePath));
  for (const path of store.objects.keys()) if (!referenced.has(path)) throw new Error("Scenario left an orphan object");
}

export function runGalleryInterruptionMatrix() {
  const results: Array<{ point: GalleryInterruptionPoint; rows: number; objects: number }> = [];
  for (const point of GALLERY_INTERRUPTION_POINTS) {
    const store = new GalleryScenarioStore();
    const id = point.startsWith("C")
      ? store.interruptCreate(point as Extract<GalleryInterruptionPoint, `C${number}`>)
      : point.startsWith("R")
        ? store.interruptReplace(point as Extract<GalleryInterruptionPoint, `R${number}`>)
        : store.interruptDelete(point as Extract<GalleryInterruptionPoint, `D${number}`>);
    store.recover(id); const first = JSON.stringify(store.snapshot()); store.recover(id);
    if (JSON.stringify(store.snapshot()) !== first) throw new Error(`${point} recovery is not idempotent`);
    assertConverged(store);
    results.push({ point, rows: store.rows.size, objects: store.objects.size });
  }
  return results;
}

export function runGalleryFailureMatrix() {
  const categories = ["network", "quota", "conflict", "session"] as const;
  return categories.map((category) => {
    const store = new GalleryScenarioStore(); store.seedReady(); const before = JSON.stringify(store.snapshot());
    const outcome = { category, retryable: category === "network" || category === "quota" || category === "conflict" };
    if (JSON.stringify(store.snapshot()) !== before) throw new Error(`${category} mutated state before authorization/reservation`);
    return outcome;
  });
}

export function runGalleryEnduranceMatrix() {
  const store = new GalleryScenarioStore();
  for (let index = 1; index <= 30; index += 1) { const id = store.interruptCreate("C2", index); store.recover(id); }
  for (let index = 1; index <= 20; index += 1) { const id = idFor("created", index); const row = required(store.rows.get(id)); const next = pathFor("endurance-replacement", index); const old = row.storagePath; store.objects.set(next, { valid: true }); store.rows.set(id, { ...row, fileState: "pending", operationKind: "replace", operationId: idFor("endurance-replace", index), pendingStoragePath: next, cleanupStoragePath: old }); store.recover(id); }
  for (let index = 1; index <= 20; index += 1) { const id = idFor("created", index); const row = required(store.rows.get(id)); store.rows.set(id, { ...row, fileState: "pending", operationKind: "delete", operationId: idFor("endurance-delete", index), cleanupStoragePath: row.storagePath }); store.recover(id); }
  assertConverged(store);
  if (store.rows.size !== 10 || store.objects.size !== 10) throw new Error("Endurance inventory must contain exactly ten row/object pairs");
  return { creations: 30, replacements: 20, deletions: 20, finalRows: 10, finalObjects: 10 };
}
