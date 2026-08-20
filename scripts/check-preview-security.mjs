#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { checkDeployTarget } from "./check-deploy-target.mjs";
import { writeAtomicArtifact } from "./lib/production-readiness.mjs";

const BUCKET = "galerie";
const WEBP_BYTES = new Uint8Array([82, 73, 70, 70, 4, 0, 0, 0, 87, 69, 66, 80]);
const SHA_PATTERN = /^[0-9a-f]{40}$/;
const PROJECT_REF_PATTERN = /^[a-z0-9]{20}$/;

class UnusedRealtimeTransport {
  constructor() {
    throw new Error("Realtime is disabled in the preview security check");
  }
}

function client(url, apiKey) {
  return createClient(url, apiKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    realtime: { transport: UnusedRealtimeTransport },
  });
}

function projectRefFromUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:" || url.origin !== rawUrl) return "";
    return url.hostname.match(/^([a-z0-9]{20})\.supabase\.co$/)?.[1] ?? "";
  } catch {
    return "";
  }
}

function record(results, checkId, condition, passedSummary, failedSummary = passedSummary) {
  results.push({
    checkId,
    status: condition ? "passed" : "failed",
    summary: condition ? passedSummary : failedSummary,
  });
  return condition;
}

async function managementRequest(accessToken, projectRef, path) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error("management_request_failed");
  return response.json();
}

function exactApiKey(keys, type) {
  const matches = keys.filter((entry) => entry?.type === type && typeof entry.api_key === "string");
  if (matches.length !== 1) throw new Error("api_key_inventory_invalid");
  return matches[0].api_key;
}

async function listAllUsers(fixtureClient) {
  const users = [];
  for (let page = 1; ; page += 1) {
    const response = await fixtureClient.auth.admin.listUsers({ page, perPage: 1000 });
    if (response.error) throw new Error("fixture_user_inventory_failed");
    users.push(...response.data.users);
    if (response.data.users.length < 1000) return users;
  }
}

async function createIdentity(fixtureClient, url, publishableKey, label, appMetadata = {}, userMetadata = {}) {
  const id = randomUUID();
  const email = `readiness-${label}-${id}@example.invalid`;
  const password = `Preview-${randomUUID()}-9!`;
  const created = await fixtureClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: appMetadata,
    user_metadata: userMetadata,
  });
  if (created.error || !created.data.user) throw new Error("fixture_identity_creation_failed");
  const userClient = client(url, publishableKey);
  const login = await userClient.auth.signInWithPassword({ email, password });
  if (login.error || !login.data.session) throw new Error("fixture_identity_login_failed");
  return {
    id: created.data.user.id,
    client: userClient,
    accessToken: login.data.session.access_token,
  };
}

async function objectExists(fixtureClient, objectPath) {
  const separator = objectPath.lastIndexOf("/");
  const directory = objectPath.slice(0, separator);
  const fileName = objectPath.slice(separator + 1);
  const response = await fixtureClient.storage.from(BUCKET).list(directory, {
    search: fileName,
    limit: 100,
  });
  if (response.error) throw new Error("fixture_object_inventory_failed");
  return response.data.some((entry) => entry.name === fileName);
}

async function canDownload(targetClient, objectPath) {
  const response = await targetClient.storage.from(BUCKET).download(objectPath);
  return !response.error && response.data.size === WEBP_BYTES.length;
}

function evidenceMarkdown({ candidateSha, previewUrl, projectRef, results, cleanupPassed }) {
  const rows = results.map((result) => `| ${result.checkId} | ${result.status} | ${result.summary} |`).join("\n");
  return `# Sécurité mutable de la Deploy Preview\n\n` +
    `- SHA candidat : \`${candidateSha}\`\n` +
    `- Origine : \`${previewUrl}\`\n` +
    `- Projet Supabase : \`${projectRef}\` (preview isolée)\n` +
    `- Autorisation mutable : confirmée\n` +
    `- Fixtures : UUID jetables, sans donnée de production\n` +
    `- Nettoyage confirmé : ${cleanupPassed ? "oui" : "non"}\n` +
    `- Date UTC : ${new Date().toISOString()}\n\n` +
    `| Contrôle | Statut | Observation |\n| --- | --- | --- |\n${rows}\n`;
}

function authEvidenceMarkdown({ candidateSha, projectRef, results, cleanupPassed }) {
  const authResults = results.filter(({ checkId }) => checkId.startsWith("authorization.auth."));
  const rows = authResults.map((result) => `| ${result.checkId} | ${result.status} | ${result.summary} |`).join("\n");
  return `# Auth hébergée — refus canari\n\n` +
    `- SHA candidat : \`${candidateSha}\`\n` +
    `- Projet Supabase : \`${projectRef}\` (preview isolée)\n` +
    `- Nettoyage des identités canari : ${cleanupPassed ? "confirmé" : "échoué"}\n` +
    `- Date UTC : ${new Date().toISOString()}\n\n` +
    `| Contrôle | Statut | Observation |\n| --- | --- | --- |\n${rows}\n`;
}

export async function runPreviewSecurity(environment = process.env) {
  const results = [];
  const userIds = new Set();
  const serviceIds = new Set();
  const photoIds = new Set();
  const objectPaths = new Set();
  let fixtureClient;
  let cleanupPassed = false;
  let stage = "initialization";

  const candidateSha = environment.PRODUCTION_CANDIDATE_SHA ?? environment.COMMIT_REF ?? "";
  const previewUrl = environment.DEPLOY_PRIME_URL ?? "";
  const supabaseUrl = environment.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const projectRef = projectRefFromUrl(supabaseUrl);
  const productionProjectRef = environment.PRODUCTION_SUPABASE_PROJECT_REF ?? "";
  const publishableKey = environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
  const accessToken = environment.SUPABASE_ACCESS_TOKEN ?? "";

  if (!SHA_PATTERN.test(candidateSha) || !PROJECT_REF_PATTERN.test(projectRef)
      || !PROJECT_REF_PATTERN.test(productionProjectRef) || projectRef === productionProjectRef
      || !publishableKey || accessToken.length < 20) {
    throw new Error("preview_security_environment_invalid");
  }

  const target = checkDeployTarget({
    candidateSha,
    context: "deploy_preview",
    siteOrigin: previewUrl,
    commitRef: environment.COMMIT_REF,
    supabaseProjectRef: projectRef,
    productionSupabaseProjectRef: productionProjectRef,
    isProductionData: false,
    mutationAuthorized: environment.MUTATION_AUTHORIZED === "true",
    formName: "contact-preview",
    canonicalMatch: false,
    operation: "mutable",
  });
  if (!target.allowed) throw new Error("preview_target_not_authorized");

  try {
    stage = "key-inventory";
    const keysPayload = await managementRequest(accessToken, projectRef, "/api-keys?reveal=true");
    const keys = Array.isArray(keysPayload) ? keysPayload : keysPayload?.keys ?? [];
    const managedPublishableKey = exactApiKey(keys, "publishable");
    const fixtureSecretKey = exactApiKey(keys, "secret");
    if (managedPublishableKey !== publishableKey) throw new Error("preview_publishable_key_mismatch");
    fixtureClient = client(supabaseUrl, fixtureSecretKey);
    const anonymousClient = client(supabaseUrl, publishableKey);

    stage = "signup-canaries";
    const usersBefore = new Set((await listAllUsers(fixtureClient)).map(({ id }) => id));
    const canaryId = randomUUID();
    const canaryPassword = `Preview-${randomUUID()}-9!`;
    const emailSignup = await anonymousClient.auth.signUp({
      email: `readiness-signup-${canaryId}@example.invalid`,
      password: canaryPassword,
    });
    record(results, "authorization.auth.email_signup",
      Boolean(emailSignup.error) && !emailSignup.data.user && !emailSignup.data.session,
      "Email signup is refused without identity or session");
    const anonymousSignup = await anonymousClient.auth.signInAnonymously();
    record(results, "authorization.auth.anonymous_signup",
      Boolean(anonymousSignup.error) && !anonymousSignup.data.user && !anonymousSignup.data.session,
      "Anonymous signup is refused");
    const otpSignup = await anonymousClient.auth.signInWithOtp({
      email: `readiness-otp-${canaryId}@example.invalid`,
      options: { shouldCreateUser: true },
    });
    record(results, "authorization.auth.otp_signup",
      Boolean(otpSignup.error) && !otpSignup.data.user && !otpSignup.data.session,
      "OTP identity creation is refused");
    const smsSignup = await anonymousClient.auth.signInWithOtp({ phone: `+1555${canaryId.replaceAll("-", "").slice(0, 7)}` });
    record(results, "authorization.auth.sms_signup",
      Boolean(smsSignup.error) && !smsSignup.data.user && !smsSignup.data.session,
      "SMS identity creation is refused");
    const canaryUsers = (await listAllUsers(fixtureClient)).filter(({ id }) => !usersBefore.has(id));
    for (const user of canaryUsers) userIds.add(user.id);
    record(results, "authorization.auth.signup_no_residue", canaryUsers.length === 0,
      "Signup canaries leave no identity residue");

    stage = "identity-matrix";
    const admin = await createIdentity(fixtureClient, supabaseUrl, publishableKey, "admin", { role: "admin" });
    const member = await createIdentity(fixtureClient, supabaseUrl, publishableKey, "member");
    const spoof = await createIdentity(fixtureClient, supabaseUrl, publishableKey, "spoof", {}, { role: "admin" });
    const downgraded = await createIdentity(fixtureClient, supabaseUrl, publishableKey, "downgraded", { role: "admin" });
    const revoked = await createIdentity(fixtureClient, supabaseUrl, publishableKey, "revoked", { role: "admin" });
    for (const identity of [admin, member, spoof, downgraded, revoked]) userIds.add(identity.id);

    const [adminAuthority, memberAuthority, spoofAuthority] = await Promise.all([
      admin.client.rpc("is_current_admin"),
      member.client.rpc("is_current_admin"),
      spoof.client.rpc("is_current_admin"),
    ]);
    record(results, "authorization.auth.current_admin",
      !adminAuthority.error && adminAuthority.data === true,
      "Current admin session is authorized");
    record(results, "authorization.auth.member",
      !memberAuthority.error && memberAuthority.data === false,
      "Authenticated non-admin remains unauthorized");
    record(results, "authorization.auth.user_metadata_spoof",
      !spoofAuthority.error && spoofAuthority.data === false,
      "User metadata cannot grant administration");

    const downgrade = await fixtureClient.auth.admin.updateUserById(downgraded.id, { app_metadata: { role: "member" } });
    if (downgrade.error) throw new Error("fixture_downgrade_failed");
    const downgradedAuthority = await downgraded.client.rpc("is_current_admin");
    record(results, "authorization.auth.downgrade",
      !downgradedAuthority.error && downgradedAuthority.data === false,
      "Database-side downgrade defeats stale claims");
    const revocation = await fixtureClient.auth.admin.signOut(revoked.accessToken, "global");
    if (revocation.error) throw new Error("fixture_revocation_failed");
    const revokedAuthority = await revoked.client.rpc("is_current_admin");
    record(results, "authorization.auth.revoked_session",
      revokedAuthority.data !== true,
      "Revoked session loses administration on the next check");

    stage = "data-api-matrix";
    const activeServiceId = randomUUID();
    const hiddenServiceId = randomUUID();
    serviceIds.add(activeServiceId);
    serviceIds.add(hiddenServiceId);
    const serviceInsert = await admin.client.from("prestations").insert([
      { id: activeServiceId, nom: "Fixture active", description: "Fixture preview", categorie: "soins_corps", prix: "1.00", type_prix: "fixed", duree_minutes: 30, ordre_affichage: 0, actif: true },
      { id: hiddenServiceId, nom: "Fixture masquée", description: "Fixture preview", categorie: "soins_corps", prix: "2.00", type_prix: "fixed", duree_minutes: 30, ordre_affichage: 1, actif: false },
    ]);
    if (serviceInsert.error) throw new Error("fixture_service_insert_failed");
    const [anonRows, memberRows, adminRows] = await Promise.all([
      anonymousClient.from("prestations").select("id").in("id", [activeServiceId, hiddenServiceId]),
      member.client.from("prestations").select("id").in("id", [activeServiceId, hiddenServiceId]),
      admin.client.from("prestations").select("id").in("id", [activeServiceId, hiddenServiceId]),
    ]);
    record(results, "authorization.rls.anon_visibility",
      !anonRows.error && anonRows.data.length === 1 && anonRows.data[0].id === activeServiceId,
      "Anonymous role sees only the active service");
    record(results, "authorization.rls.member_visibility",
      !memberRows.error && memberRows.data.length === 1 && memberRows.data[0].id === activeServiceId,
      "Authenticated non-admin sees only the active service");
    record(results, "privilege.rls.admin_visibility",
      !adminRows.error && adminRows.data.length === 2,
      "Administrator sees active and hidden services");

    const deniedId = randomUUID();
    serviceIds.add(deniedId);
    const deniedMutation = await member.client.from("prestations").insert({
      id: deniedId, nom: "Mutation refusée", description: "Fixture preview", categorie: "soins_corps",
      prix: "3.00", type_prix: "fixed", duree_minutes: 30, ordre_affichage: 2, actif: true,
    });
    const deniedResidue = await fixtureClient.from("prestations").select("id").eq("id", deniedId);
    record(results, "authorization.rls.member_mutation",
      Boolean(deniedMutation.error) && !deniedResidue.error && deniedResidue.data.length === 0,
      "Authenticated non-admin mutation is refused without residue");
    const adminUpdate = await admin.client.from("prestations").update({ nom: "Fixture administrée" }).eq("id", activeServiceId);
    record(results, "privilege.rls.admin_mutation", !adminUpdate.error,
      "Administrator can mutate the owned fixture");

    stage = "storage-matrix";
    const objectPath = `photos/${randomUUID()}.webp`;
    const photoId = randomUUID();
    const operationId = randomUUID();
    objectPaths.add(objectPath);
    photoIds.add(photoId);
    const reservation = await admin.client.from("photos_galerie").insert({
      id: photoId,
      storage_path: objectPath,
      alt_text: "Fixture preview",
      variante_affichage: "small",
      width: 1,
      height: 1,
      mime_type: "image/webp",
      size_bytes: WEBP_BYTES.length,
      actif: true,
      file_state: "pending",
      operation_kind: "create",
      operation_id: operationId,
      pending_storage_path: objectPath,
      pending_width: 1,
      pending_height: 1,
      pending_size_bytes: WEBP_BYTES.length,
      operation_started_at: new Date().toISOString(),
    });
    if (reservation.error) throw new Error("fixture_photo_reservation_failed");
    const upload = await admin.client.storage.from(BUCKET).upload(objectPath, WEBP_BYTES, { contentType: "image/webp", upsert: false });
    record(results, "privilege.storage.admin_insert",
      !upload.error && await objectExists(fixtureClient, objectPath),
      "Administrator uploads the exact reserved WebP");
    const replacement = await admin.client.storage.from(BUCKET).upload(objectPath, WEBP_BYTES, { contentType: "image/webp", upsert: true });
    record(results, "privilege.storage.admin_update", !replacement.error,
      "Administrator replaces the exact reserved WebP");
    const publication = await admin.client.from("photos_galerie").update({
      file_state: "ready",
      operation_kind: null,
      operation_id: null,
      pending_storage_path: null,
      pending_width: null,
      pending_height: null,
      pending_size_bytes: null,
      cleanup_storage_path: null,
      operation_started_at: null,
      repair_code: null,
    }).eq("id", photoId);
    if (publication.error) throw new Error("fixture_photo_publication_failed");
    record(results, "privilege.storage.public_download", await canDownload(anonymousClient, objectPath),
      "Anonymous object GET succeeds only for active ready metadata");
    const anonymousList = await anonymousClient.storage.from(BUCKET).list("photos", { limit: 100 });
    record(results, "authorization.storage.anon_list",
      Boolean(anonymousList.error) || anonymousList.data.length === 0,
      "Anonymous listing cannot discover objects");
    for (const [label, targetClient] of [["anon", anonymousClient], ["member", member.client]]) {
      const deniedPath = `photos/${randomUUID()}.webp`;
      objectPaths.add(deniedPath);
      const deniedUpload = await targetClient.storage.from(BUCKET).upload(deniedPath, WEBP_BYTES, { contentType: "image/webp" });
      record(results, `authorization.storage.${label}_upload`,
        Boolean(deniedUpload.error) && !(await objectExists(fixtureClient, deniedPath)),
        `${label} upload is refused without residue`);
    }
    const hidePhoto = await admin.client.from("photos_galerie").update({ actif: false }).eq("id", photoId);
    if (hidePhoto.error) throw new Error("fixture_photo_hide_failed");
    record(results, "authorization.storage.hidden_download", !(await canDownload(anonymousClient, objectPath)),
      "Object GET is revoked immediately after masking");
    const deleteObject = await admin.client.storage.from(BUCKET).remove([objectPath]);
    record(results, "privilege.storage.admin_delete",
      !deleteObject.error && !(await objectExists(fixtureClient, objectPath)),
      "Administrator deletes the exact referenced object");
  } catch {
    results.push({
      checkId: "security.preview.execution",
      status: "failed",
      summary: `Preview security matrix stopped during ${stage}`,
    });
  } finally {
    if (fixtureClient) {
      try {
        if (objectPaths.size > 0) await fixtureClient.storage.from(BUCKET).remove([...objectPaths]);
        if (photoIds.size > 0) await fixtureClient.from("photos_galerie").delete().in("id", [...photoIds]);
        if (serviceIds.size > 0) await fixtureClient.from("prestations").delete().in("id", [...serviceIds]);
        await Promise.all([...userIds].map((id) => fixtureClient.auth.admin.deleteUser(id)));
        const [remainingPhotos, remainingServices, remainingUsers] = await Promise.all([
          photoIds.size > 0 ? fixtureClient.from("photos_galerie").select("id").in("id", [...photoIds]) : { data: [], error: null },
          serviceIds.size > 0 ? fixtureClient.from("prestations").select("id").in("id", [...serviceIds]) : { data: [], error: null },
          listAllUsers(fixtureClient),
        ]);
        cleanupPassed = !remainingPhotos.error && remainingPhotos.data.length === 0
          && !remainingServices.error && remainingServices.data.length === 0
          && !remainingUsers.some(({ id }) => userIds.has(id));
      } catch {
        cleanupPassed = false;
      }
    }
  }

  record(results, "security.preview.cleanup", cleanupPassed,
    "All UUID rows, objects and identities were removed",
    "Preview fixture cleanup is incomplete");
  writeAtomicArtifact({
    sha: candidateSha,
    relativePath: "manual/security-preview.md",
    content: evidenceMarkdown({ candidateSha, previewUrl, projectRef, results, cleanupPassed }),
  });
  writeAtomicArtifact({
    sha: candidateSha,
    relativePath: "manual/hosted-auth.md",
    content: authEvidenceMarkdown({ candidateSha, projectRef, results, cleanupPassed }),
  });
  return results;
}

async function main() {
  let results;
  try {
    results = await runPreviewSecurity();
  } catch {
    results = [{
      checkId: "security.preview.guard",
      status: "failed",
      summary: "Preview security target was not authorized",
    }];
  }
  for (const result of results) process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exitCode = results.some(({ status }) => status !== "passed") ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
