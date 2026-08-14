import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { rgbToLuminance, structuralSimilarity } from "../lib/gallery/ssim.ts";
import { GALLERY_BOOTSTRAP_ITEMS, GALLERY_BOOTSTRAP_MIN_SSIM } from "./bootstrap-gallery-data.mjs";
import { assertUnlinkedLoopbackGalleryTarget } from "./gallery-target-guard.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
function validateBootstrapWebp(bytes) {
  if (bytes.length > 1_048_576 || bytes.subarray(0, 4).toString("ascii") !== "RIFF" || bytes.subarray(8, 12).toString("ascii") !== "WEBP" || bytes.readUInt32LE(4) !== bytes.length - 8) throw new Error("Malformed WebP");
  const allowed = new Set(["VP8X", "ALPH", "VP8 ", "VP8L"]); let imageChunks = 0;
  for (let offset = 12; offset < bytes.length;) {
    if (offset + 8 > bytes.length) throw new Error("Truncated WebP chunk"); const type = bytes.subarray(offset, offset + 4).toString("ascii"); const length = bytes.readUInt32LE(offset + 4); const next = offset + 8 + length + (length & 1);
    if (!allowed.has(type) || next > bytes.length || type === "ANIM" || type === "ANMF") throw new Error("Forbidden WebP chunk"); if (type === "VP8 " || type === "VP8L") imageChunks += 1; offset = next;
  }
  if (imageChunks !== 1) throw new Error("WebP must contain exactly one still image");
}
class UnusedRealtimeTransport { constructor() { throw new Error("Realtime is disabled during the gallery bootstrap"); } }
const clientOptions = { auth: { persistSession: false, autoRefreshToken: false }, realtime: { transport: UnusedRealtimeTransport } };
const local = process.argv.includes("--local");
if (!local) throw new Error("Only --local is enabled until an explicit hosted test target is authorized");
const statusCommand = spawnSync("npx", ["supabase", "status", "--output", "json"], { encoding: "utf8" });
if (statusCommand.status !== 0) throw new Error("Local Supabase is unavailable");
const runtime = JSON.parse(statusCommand.stdout); const origin = assertUnlinkedLoopbackGalleryTarget(runtime.API_URL);
const provisioner = createClient(origin, runtime.SECRET_KEY, clientOptions);
const email = `gallery-bootstrap-${randomUUID()}@example.invalid`; const password = `B-${randomUUID()}-a9!`; let fixtureId;
try {
  const fixture = await provisioner.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { role: "admin" } });
  if (fixture.error || !fixture.data.user) throw new Error("Unable to provision local bootstrap identity"); fixtureId = fixture.data.user.id;
  const client = createClient(origin, runtime.PUBLISHABLE_KEY, clientOptions);
  const login = await client.auth.signInWithPassword({ email, password }); if (login.error) throw new Error("Unable to authenticate bootstrap identity");
  for (const item of GALLERY_BOOTSTRAP_ITEMS) {
    const source = await readFile(item.sourcePath); if (sha256(source) !== item.sourceSha256) throw new Error(`Source drift: ${item.name}`);
    const output = await sharp(source, { failOn: "error" }).rotate().toColourspace("srgb").resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer({ resolveWithObject: true });
    if (output.info.width !== item.width || output.info.height !== item.height || output.data.length !== item.sizeBytes || sha256(output.data) !== item.outputSha256) throw new Error(`Output drift: ${item.name}`);
    try { validateBootstrapWebp(output.data); } catch { throw new Error(`Invalid WebP: ${item.name}`); }
    const reference = await sharp(source, { failOn: "error" }).rotate().toColourspace("srgb").resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const decoded = await sharp(output.data, { failOn: "error" }).toColourspace("srgb").removeAlpha().raw().toBuffer({ resolveWithObject: true });
    if (reference.info.width !== item.width || reference.info.height !== item.height || decoded.info.width !== item.width || decoded.info.height !== item.height || reference.info.channels !== 3 || decoded.info.channels !== 3) throw new Error(`Visual dimensions drift: ${item.name}`);
    const ssim = structuralSimilarity(rgbToLuminance(reference.data, item.width, item.height, 3), rgbToLuminance(decoded.data, item.width, item.height, 3), item.width, item.height);
    if (ssim < GALLERY_BOOTSTRAP_MIN_SSIM) throw new Error(`Visual fidelity drift: ${item.name}`);
    const existing = await client.from("photos_galerie").select("id,storage_path,file_state,width,height,size_bytes").eq("id", item.id).maybeSingle();
    if (existing.error) throw new Error(`Read failed: ${item.name}`);
    if (existing.data) {
      if (existing.data.storage_path !== item.storagePath || existing.data.file_state !== "ready" || existing.data.width !== item.width || existing.data.height !== item.height || existing.data.size_bytes !== item.sizeBytes) throw new Error(`Row drift: ${item.name}`);
      const downloaded = await client.storage.from("galerie").download(item.storagePath); if (downloaded.error || sha256(Buffer.from(await downloaded.data.arrayBuffer())) !== item.outputSha256) throw new Error(`Object drift: ${item.name}`);
      process.stdout.write(`unchanged ${item.name}\n`); continue;
    }
    const operationId = randomUUID(); const inserted = await client.from("photos_galerie").insert({ id: item.id, storage_path: item.storagePath, alt_text: item.altText, titre: item.title, libelle: item.label, lien_externe: null, variante_affichage: item.variant, width: item.width, height: item.height, mime_type: "image/webp", size_bytes: item.sizeBytes, ordre_affichage: item.displayOrder, actif: true, file_state: "pending", operation_kind: "create", operation_id: operationId, operation_started_at: new Date().toISOString(), pending_storage_path: item.storagePath, pending_width: item.width, pending_height: item.height, pending_size_bytes: item.sizeBytes }).select("id").single();
    if (inserted.error) throw new Error(`Reservation failed: ${item.name}`);
    const uploaded = await client.storage.from("galerie").upload(item.storagePath, output.data, { contentType: "image/webp", upsert: false });
    if (uploaded.error) throw new Error(`Upload failed: ${item.name}`);
    const downloaded = await client.storage.from("galerie").download(item.storagePath); if (downloaded.error || sha256(Buffer.from(await downloaded.data.arrayBuffer())) !== item.outputSha256) throw new Error(`Verification failed: ${item.name}`);
    const finalized = await client.from("photos_galerie").update({ file_state: "ready", operation_kind: null, operation_id: null, operation_started_at: null, pending_storage_path: null, pending_width: null, pending_height: null, pending_size_bytes: null }).eq("id", item.id).eq("operation_id", operationId).select("id").single();
    if (finalized.error) throw new Error(`Finalization failed: ${item.name}`); process.stdout.write(`created ${item.name}\n`);
  }
} finally { if (fixtureId) await provisioner.auth.admin.deleteUser(fixtureId); }
