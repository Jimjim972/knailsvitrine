import assert from "node:assert/strict";
import test from "node:test";
import {
  assertArtifactIsRedacted,
  redactSensitiveText,
} from "../../../scripts/lib/production-readiness.mjs";

const fixtureSecretKey = ["sb", "secret", "examplevalue1234567890"].join("_");
const fixtureJwt = [
  "eyJhbGciOiJIUzI1NiJ9",
  "eyJzdWIiOiJhZG1pbiJ9",
  "signature",
].join(".");

const samples = [
  `SUPABASE_GALLERY_CONFIG_SECRET_KEY=${fixtureSecretKey}`,
  `Authorization: Bearer ${fixtureJwt}`,
  "Cookie: sb-session=very-sensitive-cookie",
  "admin@knails.example",
  "message=Bonjour%20je%20souhaite%20un%20rendez-vous",
  "storage_path=photos/11111111-1111-4111-8111-111111111111.webp",
  "https://project.supabase.co/storage/v1/object/sign/galerie/private.webp?token=signed-value",
  "NEXT_PUBLIC_FORBIDDEN_SECRET=top-secret-value",
  "password=Correct-Horse-Battery-Staple-42!",
  "SERVICE_SUCCESS_FLASH_SECRET=flash-secret-value-that-is-long-enough",
  "PostgrestError: relation private.hidden_table does not exist at /srv/app/server.js:42:7",
  "original_filename=portrait-client-confidentiel.webp",
];

test("la redaction masque clés, JWT, cookies, e-mails, Contact, Storage et variables interdites", () => {
  const raw = samples.join("\n");
  const redacted = redactSensitiveText(raw);
  assert.notEqual(redacted, raw);
  for (const sensitive of [
    fixtureSecretKey,
    "eyJhbGciOiJIUzI1NiJ9",
    "very-sensitive-cookie",
    "admin@knails.example",
    "Bonjour%20je%20souhaite",
    "photos/11111111-1111-4111-8111-111111111111.webp",
    "signed-value",
    "top-secret-value",
    "Correct-Horse-Battery-Staple-42!",
    "flash-secret-value-that-is-long-enough",
    "private.hidden_table",
    "portrait-client-confidentiel.webp",
  ]) assert.equal(redacted.includes(sensitive), false);
  assert.doesNotThrow(() => assertArtifactIsRedacted(redacted));
});

test("le scanner refuse l'artefact brut sans imprimer sa valeur", () => {
  for (const sample of samples) {
    assert.throws(() => assertArtifactIsRedacted(sample), /sensitive_artifact_detected/);
  }
});
