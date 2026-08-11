import { createHmac, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import {
  assertLoopback,
  assertUnlinked,
  emit,
  fail,
  pass,
} from "./run-foundation-checks.mjs";

const bucket = "galerie";
const imageBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);
const replacementBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3, 4]);

function readLocalStatus() {
  const child = spawnSync("npx", ["supabase", "status", "--output", "json"], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "pipe",
  });
  if (child.status !== 0) throw new Error("Local Supabase status is unavailable");
  const status = JSON.parse(child.stdout);
  assertLoopback(status.API_URL);
  const publicKey = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
  const fixtureCapability = status.SECRET_KEY ?? status.SERVICE_ROLE_KEY;
  if (!publicKey || !fixtureCapability) throw new Error("Local fixture capabilities are unavailable");
  if (!status.JWT_SECRET) throw new Error("Local JWT fixture capability is unavailable");
  const projectId = readFileSync("supabase/config.toml", "utf8").match(/^project_id\s*=\s*"([^"]+)"/m)?.[1];
  if (!projectId || !/^[A-Za-z0-9_-]+$/.test(projectId)) throw new Error("Local project identifier is unavailable");
  return { apiUrl: status.API_URL, publicKey, fixtureCapability, jwtSecret: status.JWT_SECRET, projectId };
}

function newClient(apiUrl, key) {
  return createClient(apiUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

function runLocalSql(projectId, statement) {
  const child = spawnSync(
    "docker",
    ["exec", `supabase_db_${projectId}`, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", statement],
    { encoding: "utf8", stdio: "pipe" },
  );
  if (child.status !== 0) throw new Error("Local Auth session fixture failed");
}

function signLocalJwt(payload, jwtSecret) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const unsigned = `${encode({ alg: "HS256", typ: "JWT" })}.${encode(payload)}`;
  const signature = createHmac("sha256", jwtSecret).update(unsigned).digest("base64url");
  return `${unsigned}.${signature}`;
}

async function createIdentity(fixtureClient, publicKey, apiUrl, jwtSecret, projectId, label, appMetadata = {}) {
  const email = `foundation-storage-${label}-${randomUUID()}@example.invalid`;
  const password = `Local-${randomUUID()}-9!`;
  const created = await fixtureClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: appMetadata,
  });
  if (created.error || !created.data.user) throw new Error("Local Auth fixture creation failed");

  const sessionId = randomUUID();
  runLocalSql(
    projectId,
    `insert into auth.sessions (id, user_id, created_at, updated_at, aal, not_after, refreshed_at) values ('${sessionId}'::uuid, '${created.data.user.id}'::uuid, now(), now(), 'aal1', now() + interval '1 hour', now());`,
  );
  const now = Math.floor(Date.now() / 1000);
  const accessToken = signLocalJwt({
    aud: "authenticated",
    exp: now + 3600,
    iat: now,
    iss: "supabase-demo",
    role: "authenticated",
    sub: created.data.user.id,
    session_id: sessionId,
    app_metadata: { provider: "email", providers: ["email"], ...appMetadata },
    user_metadata: {},
  }, jwtSecret);
  const client = createClient(apiUrl, publicKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  return { id: created.data.user.id, sessionId, client, accessToken };
}

async function objectExists(adminClient, path) {
  const separator = path.lastIndexOf("/");
  const directory = path.slice(0, separator);
  const name = path.slice(separator + 1);
  const listed = await adminClient.storage.from(bucket).list(directory, { search: name, limit: 100 });
  if (listed.error) throw new Error("Local Storage inspection failed");
  return listed.data.some((entry) => entry.name === name);
}

async function main() {
  const results = [];
  const userIds = [];
  const paths = new Set();
  let fixtureClient;
  let adminClient;
  let stage = "initialization";

  try {
    assertUnlinked();
    stage = "local-status";
    const { apiUrl, publicKey, fixtureCapability, jwtSecret, projectId } = readLocalStatus();
    fixtureClient = newClient(apiUrl, fixtureCapability);
    const anonymousClient = newClient(apiUrl, publicKey);
    stage = "identity-fixtures";
    const admin = await createIdentity(fixtureClient, publicKey, apiUrl, jwtSecret, projectId, "admin", { role: "admin" });
    const member = await createIdentity(fixtureClient, publicKey, apiUrl, jwtSecret, projectId, "member");
    const revoked = await createIdentity(fixtureClient, publicKey, apiUrl, jwtSecret, projectId, "revoked", { role: "admin" });
    userIds.push(admin.id, member.id, revoked.id);
    adminClient = admin.client;
    stage = "session-revocation";
    runLocalSql(projectId, `delete from auth.sessions where id = '${revoked.sessionId}'::uuid;`);

    stage = "admin-upload";
    const mainPath = `photos/${randomUUID()}.png`;
    paths.add(mainPath);
    const upload = await adminClient.storage.from(bucket).upload(mainPath, imageBytes, { contentType: "image/png" });
    results.push(
      !upload.error && await objectExists(adminClient, mainPath)
        ? pass("privilege.storage.admin_upload", "Current administrator can upload a canonical object")
        : fail("privilege.storage.admin_upload", "privilege", "Administrator upload did not succeed"),
    );

    const publicUrl = anonymousClient.storage.from(bucket).getPublicUrl(mainPath).data.publicUrl;
    stage = "public-fetch";
    const publicResponse = await fetch(publicUrl);
    const publicBody = new Uint8Array(await publicResponse.arrayBuffer());
    results.push(
      publicResponse.ok && publicBody.length === imageBytes.length
        ? pass("privilege.storage.public_fetch", "Known public object URL returns its bytes")
        : fail("privilege.storage.public_fetch", "privilege", "Public object bytes were unavailable"),
    );

    for (const [label, client] of [
      ["anon", anonymousClient],
      ["member", member.client],
      ["revoked", revoked.client],
    ]) {
      stage = `${label}-boundaries`;
      const deniedPath = `photos/${randomUUID()}.png`;
      paths.add(deniedPath);
      const attempt = await client.storage.from(bucket).upload(deniedPath, imageBytes, { contentType: "image/png" });
      const noResidue = !(await objectExists(adminClient, deniedPath));
      results.push(
        attempt.error && noResidue
          ? pass(`authorization.storage.${label}_upload`, `${label} upload is refused without residue`)
          : fail(`authorization.storage.${label}_upload`, "authorization", `${label} upload was not safely refused`),
      );

      const listing = await client.storage.from(bucket).list("photos", { limit: 100 });
      results.push(
        listing.error || listing.data.length === 0
          ? pass(`authorization.storage.${label}_listing`, `${label} cannot discover gallery objects`)
          : fail(`authorization.storage.${label}_listing`, "authorization", `${label} could discover gallery objects`),
      );

      const replaceAttempt = await client.storage.from(bucket).upload(mainPath, replacementBytes, {
        contentType: "image/png",
        upsert: true,
      });
      const unchangedResponse = await fetch(publicUrl);
      const unchangedBody = new Uint8Array(await unchangedResponse.arrayBuffer());
      results.push(
        replaceAttempt.error && unchangedResponse.ok && unchangedBody.at(-1) === imageBytes.at(-1)
          ? pass(`authorization.storage.${label}_upsert`, `${label} replacement is refused without changing bytes`)
          : fail(`authorization.storage.${label}_upsert`, "authorization", `${label} replacement was not safely refused`),
      );

      const deleteAttempt = await client.storage.from(bucket).remove([mainPath]);
      const deleteLeftObject = await objectExists(adminClient, mainPath);
      results.push(
        (deleteAttempt.error || deleteLeftObject) && deleteLeftObject
          ? pass(`authorization.storage.${label}_delete`, `${label} deletion is refused without residue change`)
          : fail(`authorization.storage.${label}_delete`, "authorization", `${label} deletion was not safely refused`),
      );
    }

    const invalidPaths = [
      `other/${randomUUID()}.png`,
      `photos/nested/${randomUUID()}.png`,
      "photos/not-a-uuid.png",
      "photos/11111111-1111-1111-8111-111111111111.png",
      `photos/${randomUUID().toUpperCase()}.png`,
    ];
    stage = "path-validation";
    let invalidPathsRefused = true;
    for (const invalidPath of invalidPaths) {
      paths.add(invalidPath);
      const attempt = await adminClient.storage.from(bucket).upload(invalidPath, imageBytes, { contentType: "image/png" });
      invalidPathsRefused &&= Boolean(attempt.error) && !(await objectExists(adminClient, invalidPath));
    }
    results.push(
      invalidPathsRefused
        ? pass("validation.storage.paths", "Invalid gallery paths are refused")
        : fail("validation.storage.paths", "validation", "An invalid gallery path was accepted"),
    );

    const gifPath = `photos/${randomUUID()}.png`;
    stage = "mime-validation";
    paths.add(gifPath);
    const gifAttempt = await adminClient.storage.from(bucket).upload(gifPath, imageBytes, { contentType: "image/gif" });
    results.push(
      gifAttempt.error && !(await objectExists(adminClient, gifPath))
        ? pass("validation.storage.mime", "Unsupported MIME is refused")
        : fail("validation.storage.mime", "validation", "Unsupported MIME was accepted"),
    );

    const oversizedPath = `photos/${randomUUID()}.png`;
    stage = "size-validation";
    paths.add(oversizedPath);
    const oversizedAttempt = await adminClient.storage.from(bucket).upload(
      oversizedPath,
      new Uint8Array(8_388_609),
      { contentType: "image/png" },
    );
    results.push(
      oversizedAttempt.error && !(await objectExists(adminClient, oversizedPath))
        ? pass("validation.storage.size", "Object larger than 8 MiB is refused")
        : fail("validation.storage.size", "validation", "Oversized object was accepted"),
    );

    const upsert = await adminClient.storage.from(bucket).upload(mainPath, replacementBytes, {
      contentType: "image/png",
      upsert: true,
    });
    stage = "admin-upsert";
    const replacedResponse = await fetch(publicUrl);
    const replacedBody = new Uint8Array(await replacedResponse.arrayBuffer());
    results.push(
      !upsert.error && replacedResponse.ok && replacedBody.at(-1) === replacementBytes.at(-1)
        ? pass("privilege.storage.admin_upsert", "Administrator upsert replaces object bytes")
        : fail("privilege.storage.admin_upsert", "privilege", "Administrator upsert did not complete"),
    );

    const metadata = {
      storage_path: mainPath,
      alt_text: "Foundation storage fixture",
      variante_affichage: "featured",
      width: 1,
      height: 1,
      mime_type: "image/png",
      size_bytes: replacementBytes.length,
    };
    stage = "metadata-fixture";
    const metadataInsert = await adminClient.from("photos_galerie").insert(metadata);
    if (metadataInsert.error) throw new Error("Local metadata fixture creation failed");

    const objectDelete = await adminClient.storage.from(bucket).remove([mainPath]);
    stage = "object-delete-independence";
    const metadataStillExists = await adminClient.from("photos_galerie").select("id").eq("storage_path", mainPath).maybeSingle();
    results.push(
      !objectDelete.error && Boolean(metadataStillExists.data)
        ? pass("privilege.storage.object_delete_independent", "Object deletion leaves metadata unchanged")
        : fail("privilege.storage.object_delete_independent", "privilege", "Object deletion independence was not proven"),
    );

    const restore = await adminClient.storage.from(bucket).upload(mainPath, imageBytes, { contentType: "image/png" });
    stage = "metadata-delete-independence";
    if (restore.error) throw new Error("Local Storage fixture restoration failed");
    const metadataDelete = await adminClient.from("photos_galerie").delete().eq("storage_path", mainPath);
    const remainingObject = await fetch(publicUrl);
    results.push(
      !metadataDelete.error && remainingObject.ok
        ? pass("privilege.storage.metadata_delete_independent", "Metadata deletion leaves public object bytes available")
        : fail("privilege.storage.metadata_delete_independent", "privilege", "Metadata deletion independence was not proven"),
    );

    const finalDelete = await adminClient.storage.from(bucket).remove([mainPath]);
    stage = "final-delete";
    results.push(
      !finalDelete.error && !(await objectExists(adminClient, mainPath))
        ? pass("privilege.storage.admin_delete", "Administrator can delete a canonical object")
        : fail("privilege.storage.admin_delete", "privilege", "Administrator delete did not complete"),
    );
  } catch {
    results.push(fail("internal.storage.check", "internal", `Local Storage verification stopped at ${stage}`));
  } finally {
    if (fixtureClient) {
      try {
        await fixtureClient.storage.from(bucket).remove([...paths]);
        await fixtureClient.from("photos_galerie").delete().in("storage_path", [...paths]);
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
