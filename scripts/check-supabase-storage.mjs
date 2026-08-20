import { createHmac, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { assertLoopback, emit, fail, pass } from "./run-foundation-checks.mjs";

const bucket = "galerie";
const webpBytes = new Uint8Array([82, 73, 70, 70, 4, 0, 0, 0, 87, 69, 66, 80]);
class UnusedRealtimeTransport {
  constructor() {
    throw new Error("Realtime is disabled in the Storage contract check");
  }
}

function readLocalStatus() {
  const child = spawnSync("npx", ["supabase", "status", "--output", "json"], {
    cwd: process.cwd(), encoding: "utf8", stdio: "pipe",
  });
  if (child.status !== 0) throw new Error("Local Supabase status is unavailable");
  const status = JSON.parse(child.stdout);
  assertLoopback(status.API_URL);
  const publicKey = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
  const fixtureCapability = status.SECRET_KEY ?? status.SERVICE_ROLE_KEY;
  if (!publicKey || !fixtureCapability || !status.JWT_SECRET) throw new Error("Local fixture capabilities are unavailable");
  const projectId = readFileSync("supabase/config.toml", "utf8").match(/^project_id\s*=\s*"([^"]+)"/m)?.[1];
  if (!projectId || !/^[A-Za-z0-9_-]+$/.test(projectId)) throw new Error("Local project identifier is unavailable");
  return { apiUrl: status.API_URL, publicKey, fixtureCapability, jwtSecret: status.JWT_SECRET, projectId };
}

function newClient(apiUrl, key) {
  return createClient(apiUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    realtime: { transport: UnusedRealtimeTransport },
  });
}

function runLocalSql(projectId, statement) {
  const child = spawnSync("docker", ["exec", `supabase_db_${projectId}`, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", statement], { encoding: "utf8", stdio: "pipe" });
  if (child.status !== 0) throw new Error("Local fixture SQL failed");
}

function signLocalJwt(payload, jwtSecret) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const unsigned = `${encode({ alg: "HS256", typ: "JWT" })}.${encode(payload)}`;
  const signature = createHmac("sha256", jwtSecret).update(unsigned).digest("base64url");
  return `${unsigned}.${signature}`;
}

async function createIdentity(fixtureClient, publicKey, apiUrl, jwtSecret, projectId, label, appMetadata = {}) {
  const created = await fixtureClient.auth.admin.createUser({
    email: `gallery-storage-${label}-${randomUUID()}@example.invalid`,
    password: `Local-${randomUUID()}-9!`, email_confirm: true, app_metadata: appMetadata,
  });
  if (created.error || !created.data.user) throw new Error("Local Auth fixture creation failed");
  const sessionId = randomUUID();
  runLocalSql(projectId, `insert into auth.sessions (id, user_id, created_at, updated_at, aal, not_after, refreshed_at) values ('${sessionId}'::uuid, '${created.data.user.id}'::uuid, now(), now(), 'aal1', now() + interval '1 hour', now());`);
  const now = Math.floor(Date.now() / 1000);
  const token = signLocalJwt({
    aud: "authenticated", exp: now + 3600, iat: now, iss: "supabase-demo", role: "authenticated",
    sub: created.data.user.id, session_id: sessionId,
    app_metadata: { provider: "email", providers: ["email"], ...appMetadata }, user_metadata: {},
  }, jwtSecret);
  return {
    id: created.data.user.id,
    sessionId,
    client: createClient(apiUrl, publicKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
      realtime: { transport: UnusedRealtimeTransport },
    }),
  };
}

async function objectExists(adminClient, path) {
  const separator = path.lastIndexOf("/");
  const listed = await adminClient.storage.from(bucket).list(path.slice(0, separator), { search: path.slice(separator + 1), limit: 100 });
  if (listed.error) throw new Error("Local Storage inspection failed");
  return listed.data.some((entry) => entry.name === path.slice(separator + 1));
}

async function reserve(adminClient, path, overrides = {}) {
  const photoId = randomUUID();
  const operationId = randomUUID();
  const result = await adminClient.from("photos_galerie").insert({
    id: photoId, storage_path: path, alt_text: "Storage contract fixture", variante_affichage: "small",
    width: 1, height: 1, mime_type: "image/webp", size_bytes: webpBytes.length,
    file_state: "pending", operation_kind: "create", operation_id: operationId,
    pending_storage_path: path, pending_width: 1, pending_height: 1, pending_size_bytes: webpBytes.length,
    operation_started_at: new Date().toISOString(), ...overrides,
  });
  if (result.error) throw new Error("Gallery reservation failed");
  return { photoId, operationId, path };
}

async function publish(adminClient, photoId) {
  const result = await adminClient.from("photos_galerie").update({
    file_state: "ready", operation_kind: null, operation_id: null, pending_storage_path: null,
    pending_width: null, pending_height: null, pending_size_bytes: null,
    cleanup_storage_path: null, operation_started_at: null, repair_code: null,
  }).eq("id", photoId);
  if (result.error) throw new Error("Gallery publication failed");
}

async function canDownload(client, path) {
  const result = await client.storage.from(bucket).download(path);
  return !result.error && result.data.size === webpBytes.length;
}

async function main() {
  const results = [];
  const userIds = [];
  const paths = new Set();
  const photoIds = new Set();
  let fixtureClient;
  let stage = "initialization";

  try {
    stage = "local-status";
    const { apiUrl, publicKey, fixtureCapability, jwtSecret, projectId } = readLocalStatus();
    fixtureClient = newClient(apiUrl, fixtureCapability);
    const anonymousClient = newClient(apiUrl, publicKey);
    stage = "identity-fixtures";
    const admin = await createIdentity(fixtureClient, publicKey, apiUrl, jwtSecret, projectId, "admin", { role: "admin" });
    const member = await createIdentity(fixtureClient, publicKey, apiUrl, jwtSecret, projectId, "member");
    const revoked = await createIdentity(fixtureClient, publicKey, apiUrl, jwtSecret, projectId, "revoked", { role: "admin" });
    userIds.push(admin.id, member.id, revoked.id);
    runLocalSql(projectId, `delete from auth.sessions where id = '${revoked.sessionId}'::uuid;`);

    stage = "bucket-contract";
    const buckets = await fixtureClient.storage.listBuckets();
    const galleryBucket = buckets.data?.find(({ id }) => id === bucket);
    results.push(galleryBucket && galleryBucket.public === false && galleryBucket.file_size_limit === 8_388_608
      ? pass("privilege.storage.private_bucket", "Gallery bucket is private with the 8 MiB infrastructure limit")
      : fail("privilege.storage.private_bucket", "privilege", "Gallery bucket configuration is not private and bounded"));

    stage = "reserved-webp-upload";
    const readyPath = `photos/${randomUUID()}.webp`;
    paths.add(readyPath);
    const readyReservation = await reserve(admin.client, readyPath);
    photoIds.add(readyReservation.photoId);
    const upload = await admin.client.storage.from(bucket).upload(readyPath, webpBytes, { contentType: "image/webp", upsert: false });
    results.push(!upload.error && await objectExists(admin.client, readyPath)
      ? pass("privilege.storage.admin_insert", "Administrator can INSERT the exact reserved WebP")
      : fail("privilege.storage.admin_insert", "privilege", "Reserved administrator INSERT failed"));

    stage = "reserved-webp-select";
    const adminSelection = await admin.client.storage.from(bucket).download(readyPath);
    results.push(!adminSelection.error && adminSelection.data.size === webpBytes.length
      ? pass("privilege.storage.admin_select", "Administrator can SELECT the exact referenced object")
      : fail("privilege.storage.admin_select", "privilege", "Referenced administrator SELECT failed"));

    stage = "reserved-webp-update";
    const replacement = await admin.client.storage.from(bucket).upload(readyPath, webpBytes, {
      contentType: "image/webp",
      upsert: true,
    });
    results.push(!replacement.error && await objectExists(admin.client, readyPath)
      ? pass("privilege.storage.admin_update", "Administrator can UPDATE the exact reserved object by upsert")
      : fail("privilege.storage.admin_update", "privilege", "Referenced administrator UPDATE failed"));

    stage = "unreserved-upload";
    const unreservedPath = `photos/${randomUUID()}.webp`;
    paths.add(unreservedPath);
    const unreserved = await admin.client.storage.from(bucket).upload(unreservedPath, webpBytes, { contentType: "image/webp", upsert: false });
    results.push(unreserved.error && !(await objectExists(admin.client, unreservedPath))
      ? pass("authorization.storage.unreserved_upload", "Unreserved administrator upload is refused without residue")
      : fail("authorization.storage.unreserved_upload", "authorization", "An unreserved path was accepted"));

    stage = "new-format-contract";
    const pngPath = `photos/${randomUUID()}.png`;
    paths.add(pngPath);
    const pngAttempt = await admin.client.storage.from(bucket).upload(pngPath, webpBytes, { contentType: "image/png" });
    results.push(pngAttempt.error && !(await objectExists(admin.client, pngPath))
      ? pass("validation.storage.new_webp_only", "New PNG uploads are refused")
      : fail("validation.storage.new_webp_only", "validation", "A non-WebP new upload was accepted"));

    await publish(admin.client, readyReservation.photoId);
    stage = "public-object-get";
    results.push(await canDownload(anonymousClient, readyPath)
      ? pass("privilege.storage.active_ready_download", "Anonymous object download succeeds for an active ready row")
      : fail("privilege.storage.active_ready_download", "privilege", "Active ready object download failed"));
    const anonymousListing = await anonymousClient.storage.from(bucket).list("photos", { limit: 100 });
    results.push(anonymousListing.error || anonymousListing.data.length === 0
      ? pass("authorization.storage.anon_listing", "Anonymous listing cannot discover gallery objects")
      : fail("authorization.storage.anon_listing", "authorization", "Anonymous listing exposed gallery objects"));

    stage = "download-revocation";
    await admin.client.from("photos_galerie").update({ actif: false }).eq("id", readyReservation.photoId);
    results.push(!(await canDownload(anonymousClient, readyPath))
      ? pass("authorization.storage.hidden_download", "The same object download is refused after masking")
      : fail("authorization.storage.hidden_download", "authorization", "A masked object remained downloadable"));
    await admin.client.from("photos_galerie").update({ actif: true, file_state: "repair_required", operation_kind: "replace", operation_id: randomUUID(), operation_started_at: new Date().toISOString(), repair_code: "object_missing" }).eq("id", readyReservation.photoId);
    results.push(!(await canDownload(anonymousClient, readyPath))
      ? pass("authorization.storage.non_ready_download", "The same object download is refused outside ready state")
      : fail("authorization.storage.non_ready_download", "authorization", "A non-ready object remained downloadable"));

    for (const [label, client] of [["anon", anonymousClient], ["member", member.client], ["revoked", revoked.client]]) {
      stage = `${label}-mutations`;
      const deniedPath = `photos/${randomUUID()}.webp`;
      paths.add(deniedPath);
      const attempt = await client.storage.from(bucket).upload(deniedPath, webpBytes, { contentType: "image/webp" });
      results.push(attempt.error && !(await objectExists(admin.client, deniedPath))
        ? pass(`authorization.storage.${label}_upload`, `${label} upload is refused without residue`)
        : fail(`authorization.storage.${label}_upload`, "authorization", `${label} upload was not safely refused`));
      const deletion = await client.storage.from(bucket).remove([readyPath]);
      results.push((deletion.error || await objectExists(admin.client, readyPath)) && await objectExists(admin.client, readyPath)
        ? pass(`authorization.storage.${label}_delete`, `${label} deletion is refused without changing the object`)
        : fail(`authorization.storage.${label}_delete`, "authorization", `${label} deletion changed the object`));
    }

    stage = "third-party-delete";
    const thirdPartyPath = `photos/${randomUUID()}.webp`;
    paths.add(thirdPartyPath);
    const fixtureUpload = await fixtureClient.storage.from(bucket).upload(thirdPartyPath, webpBytes, { contentType: "image/webp" });
    if (fixtureUpload.error) throw new Error("Third-party fixture upload failed");
    const thirdPartyDelete = await admin.client.storage.from(bucket).remove([thirdPartyPath]);
    results.push((thirdPartyDelete.error || await objectExists(admin.client, thirdPartyPath)) && await objectExists(admin.client, thirdPartyPath)
      ? pass("authorization.storage.third_party_delete", "Administrator cannot delete an unreferenced third-party path")
      : fail("authorization.storage.third_party_delete", "authorization", "An unreferenced path was deleted"));

    stage = "legacy-delete";
    const legacyPath = `photos/${randomUUID()}.jpg`;
    paths.add(legacyPath);
    const legacyPhotoId = randomUUID();
    photoIds.add(legacyPhotoId);
    const legacyMetadata = await admin.client.from("photos_galerie").insert({ id: legacyPhotoId, storage_path: legacyPath, alt_text: "Legacy", variante_affichage: "small", width: 1, height: 1, mime_type: "image/jpeg", size_bytes: webpBytes.length, actif: false });
    const legacyUpload = await fixtureClient.storage.from(bucket).upload(legacyPath, webpBytes, { contentType: "image/jpeg" });
    if (legacyMetadata.error || legacyUpload.error) throw new Error("Legacy fixture failed");
    const legacyDelete = await admin.client.storage.from(bucket).remove([legacyPath]);
    results.push(!legacyDelete.error && !(await objectExists(admin.client, legacyPath))
      ? pass("privilege.storage.legacy_delete", "Administrator can delete a referenced legacy object")
      : fail("privilege.storage.legacy_delete", "privilege", "Referenced legacy object deletion failed"));

    stage = "referenced-delete";
    const readyDelete = await admin.client.storage.from(bucket).remove([readyPath]);
    results.push(!readyDelete.error && !(await objectExists(admin.client, readyPath))
      ? pass("privilege.storage.admin_delete", "Administrator can DELETE an exact referenced path")
      : fail("privilege.storage.admin_delete", "privilege", "Exact referenced path DELETE failed"));
    await admin.client.from("photos_galerie").delete().eq("id", readyReservation.photoId);
    results.push(!(await canDownload(anonymousClient, readyPath))
      ? pass("authorization.storage.deleted_download", "Deleted metadata and object are no longer downloadable")
      : fail("authorization.storage.deleted_download", "authorization", "Deleted object remained downloadable"));
  } catch {
    results.push(fail("internal.storage.check", "internal", `Local Storage verification stopped at ${stage}`));
  } finally {
    if (fixtureClient) {
      try {
        if (paths.size > 0) await fixtureClient.storage.from(bucket).remove([...paths]);
        if (photoIds.size > 0) await fixtureClient.from("photos_galerie").delete().in("id", [...photoIds]);
        await Promise.all(userIds.map((id) => fixtureClient.auth.admin.deleteUser(id)));
      } catch {
        results.push(fail("internal.storage.cleanup", "internal", "Local Storage fixture cleanup failed"));
      }
    }
  }
  emit(results);
  process.exitCode = results.some((result) => result.status === "fail") ? 1 : 0;
}

await main();
