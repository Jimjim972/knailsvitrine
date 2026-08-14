import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const SERVICE_SUCCESS_FLASH_COOKIE = "kn-service-success";
export const SERVICE_SUCCESS_FLASH_GUARD_COOKIE = "kn-service-success-guard";
export const SERVICE_SUCCESS_FLASH_CONSUMED_COOKIE = "kn-service-success-consumed";
export const SERVICE_SUCCESS_FLASH_HEADER = "x-kn-service-success";
export const GALLERY_SUCCESS_FLASH_COOKIE = "kn-gallery-success";
export const GALLERY_SUCCESS_FLASH_GUARD_COOKIE = "kn-gallery-success-guard";
export const GALLERY_SUCCESS_FLASH_CONSUMED_COOKIE = "kn-gallery-success-consumed";
export const GALLERY_SUCCESS_FLASH_HEADER = "x-kn-gallery-success";

export type ServiceSuccessKind = "create" | "edit" | "delete" | "category-create" | "category-edit" | "category-delete";
export type GallerySuccessKind = "gallery-create" | "gallery-edit" | "gallery-show" | "gallery-hide" | "gallery-replace" | "gallery-delete";
type AdminSuccessKind = ServiceSuccessKind | GallerySuccessKind;

const SERVICE_SUCCESS_MESSAGES: Record<ServiceSuccessKind, string> = {
  create: "La prestation a été créée.",
  edit: "La prestation a été modifiée.",
  delete: "La prestation a été supprimée.",
  "category-create": "La catégorie a été créée.",
  "category-edit": "La catégorie a été modifiée.",
  "category-delete": "La catégorie a été supprimée.",
};
const GALLERY_SUCCESS_MESSAGES: Record<GallerySuccessKind, string> = {
  "gallery-create": "La photo a été ajoutée.",
  "gallery-edit": "La photo a été modifiée.",
  "gallery-show": "La photo est active.",
  "gallery-hide": "La photo est masquée.",
  "gallery-replace": "La photo a été remplacée.",
  "gallery-delete": "La photo a été supprimée.",
};

const FLASH_VERSION = "v1";
const CONSUMED_REGISTRY_VERSION = "v2";
const FLASH_LIFETIME_MS = 60_000;
const FLASH_FUTURE_TOLERANCE_MS = 5_000;
const MINIMUM_SECRET_LENGTH = 32;
const NONCE_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;
const FINGERPRINT_PATTERN = /^[A-Za-z0-9_-]{22}$/;
const MAX_CONSUMED_ENTRIES = 48;
const MAX_CONSUMED_MARKER_LENGTH = 3_800;

type IssueOptions = {
  nowMs?: number;
  nonce?: string;
};

type VerifyOptions = {
  token: string | undefined;
  guard: string | undefined;
  consumedMarker: string | undefined;
  secret: string;
  nowMs?: number;
};

type ConsumedMarkerOptions = {
  consumedMarker?: string;
  nowMs?: number;
};

type ConsumedEntry = readonly [fingerprint: string, expiresAt: number];
type ConsumedRegistry =
  | { kind: "entries"; entries: ConsumedEntry[] }
  | { kind: "blocked"; blockedUntil: number };

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function signaturesMatch(actual: string, expected: string): boolean {
  const actualBytes = Buffer.from(actual);
  const expectedBytes = Buffer.from(expected);
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
}

function isValidSecret(secret: string): boolean {
  return secret.length >= MINIMUM_SECRET_LENGTH;
}

function nonceFingerprint(nonce: string, secret: string): string {
  return sign(`consumed-nonce:${nonce}`, secret).slice(0, 22);
}

function serializeConsumedRegistry(registry: ConsumedRegistry, secret: string): string {
  const compact = registry.kind === "entries"
    ? { e: registry.entries }
    : { b: registry.blockedUntil };
  const encoded = Buffer.from(JSON.stringify(compact)).toString("base64url");
  const payload = `${CONSUMED_REGISTRY_VERSION}.${encoded}`;
  return `${payload}.${sign(`consumed:${payload}`, secret)}`;
}

function parseConsumedRegistry(marker: string | undefined, secret: string): ConsumedRegistry | null {
  if (!marker) return { kind: "entries", entries: [] };
  if (marker.length > MAX_CONSUMED_MARKER_LENGTH) return null;
  const [version, encoded, signature, ...extra] = marker.split(".");
  if (extra.length > 0 || version !== CONSUMED_REGISTRY_VERSION || !encoded || !signature) return null;
  if (!signaturesMatch(signature, sign(`consumed:${version}.${encoded}`, secret))) return null;

  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length !== 1) return null;
  if (keys[0] === "b") {
    return Number.isSafeInteger(record.b) && Number(record.b) > 0
      ? { kind: "blocked", blockedUntil: Number(record.b) }
      : null;
  }
  if (keys[0] !== "e" || !Array.isArray(record.e) || record.e.length > MAX_CONSUMED_ENTRIES) return null;
  const entries: ConsumedEntry[] = [];
  const fingerprints = new Set<string>();
  for (const entry of record.e) {
    if (!Array.isArray(entry) || entry.length !== 2) return null;
    const [fingerprint, expiresAt] = entry;
    if (typeof fingerprint !== "string" || !FINGERPRINT_PATTERN.test(fingerprint)
      || !Number.isSafeInteger(expiresAt) || Number(expiresAt) <= 0 || fingerprints.has(fingerprint)) return null;
    fingerprints.add(fingerprint);
    entries.push([fingerprint, Number(expiresAt)]);
  }
  return { kind: "entries", entries };
}

export function parseServiceSuccessFlash(value: string | undefined): ServiceSuccessKind | null {
  return value === "create" || value === "edit" || value === "delete" || value === "category-create"
    || value === "category-edit" || value === "category-delete" ? value : null;
}

export function parseGallerySuccessFlash(value: string | undefined): GallerySuccessKind | null {
  return value === "gallery-create" || value === "gallery-edit" || value === "gallery-show" || value === "gallery-hide" || value === "gallery-replace" || value === "gallery-delete" ? value : null;
}

function parseAdminSuccessFlash(value: string | undefined): AdminSuccessKind | null {
  return parseServiceSuccessFlash(value) ?? parseGallerySuccessFlash(value);
}

export function serviceSuccessMessage(kind: ServiceSuccessKind): string {
  return SERVICE_SUCCESS_MESSAGES[kind];
}

export function gallerySuccessMessage(kind: GallerySuccessKind): string {
  return GALLERY_SUCCESS_MESSAGES[kind];
}

export function getServiceSuccessFlashSecret(): string | null {
  const secret = process.env.SERVICE_SUCCESS_FLASH_SECRET ?? "";
  return isValidSecret(secret) ? secret : null;
}

export function requireServiceSuccessFlashSecret(): string {
  const secret = getServiceSuccessFlashSecret();
  if (!secret) throw new Error("SERVICE_SUCCESS_FLASH_SECRET must contain at least 32 characters.");
  return secret;
}

export function issueServiceSuccessFlash(kind: AdminSuccessKind, secret: string, options: IssueOptions = {}) {
  if (!isValidSecret(secret)) throw new Error("The service success secret is too short.");
  const issuedAt = options.nowMs ?? Date.now();
  const nonce = options.nonce ?? randomBytes(24).toString("base64url");
  if (!NONCE_PATTERN.test(nonce)) throw new Error("The service success nonce is invalid.");
  const payload = `${FLASH_VERSION}.${kind}.${issuedAt}.${nonce}`;
  return { token: `${payload}.${sign(`flash:${payload}`, secret)}`, guard: nonce, nonce } as const;
}

export function createServiceSuccessConsumedMarker(nonce: string, secret: string, options: ConsumedMarkerOptions = {}): string {
  if (!isValidSecret(secret) || !NONCE_PATTERN.test(nonce)) throw new Error("The service success proof is invalid.");
  const nowMs = options.nowMs ?? Date.now();
  const parsed = parseConsumedRegistry(options.consumedMarker, secret);
  if (!parsed) return serializeConsumedRegistry({ kind: "blocked", blockedUntil: nowMs + FLASH_LIFETIME_MS }, secret);
  if (parsed.kind === "blocked" && parsed.blockedUntil > nowMs) return serializeConsumedRegistry(parsed, secret);
  const entries = parsed.kind === "entries" ? parsed.entries.filter(([, expiresAt]) => expiresAt > nowMs) : [];
  const fingerprint = nonceFingerprint(nonce, secret);
  if (entries.some(([existing]) => existing === fingerprint)) return serializeConsumedRegistry({ kind: "entries", entries }, secret);
  if (entries.length >= MAX_CONSUMED_ENTRIES) {
    const latestExpiry = Math.max(nowMs + FLASH_LIFETIME_MS, ...entries.map(([, expiresAt]) => expiresAt));
    return serializeConsumedRegistry({ kind: "blocked", blockedUntil: latestExpiry }, secret);
  }
  return serializeConsumedRegistry({ kind: "entries", entries: [...entries, [fingerprint, nowMs + FLASH_LIFETIME_MS]] }, secret);
}

export function verifyServiceSuccessFlash({ token, guard, consumedMarker, secret, nowMs = Date.now() }: VerifyOptions): { kind: AdminSuccessKind; nonce: string } | null {
  if (!token || !guard || !isValidSecret(secret)) return null;
  const [version, rawKind, rawIssuedAt, nonce, signature, ...extra] = token.split(".");
  const kind = parseAdminSuccessFlash(rawKind);
  if (extra.length > 0 || version !== FLASH_VERSION || !kind || !NONCE_PATTERN.test(nonce ?? "") || !signature || guard !== nonce) return null;
  if (!/^\d+$/.test(rawIssuedAt ?? "")) return null;
  const issuedAt = Number(rawIssuedAt);
  if (!Number.isSafeInteger(issuedAt) || issuedAt > nowMs + FLASH_FUTURE_TOLERANCE_MS || nowMs - issuedAt > FLASH_LIFETIME_MS) return null;
  const payload = `${version}.${kind}.${rawIssuedAt}.${nonce}`;
  if (!signaturesMatch(signature, sign(`flash:${payload}`, secret))) return null;
  const consumedRegistry = parseConsumedRegistry(consumedMarker, secret);
  if (!consumedRegistry) return null;
  if (consumedRegistry.kind === "blocked" && consumedRegistry.blockedUntil > nowMs) return null;
  if (consumedRegistry.kind === "entries") {
    const fingerprint = nonceFingerprint(nonce, secret);
    if (consumedRegistry.entries.some(([existing, expiresAt]) => existing === fingerprint && expiresAt > nowMs)) return null;
  }
  return { kind, nonce };
}

export function serviceSuccessCookieOptions(maxAge = 60) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/admin/prestations",
    maxAge,
  };
}

export function gallerySuccessCookieOptions(maxAge = 60) {
  return {
    ...serviceSuccessCookieOptions(maxAge),
    path: "/admin/galerie",
  };
}
