import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  validateEnvironmentConfiguration,
} from "../../../lib/production-readiness/environment.ts";

const valid = {
  NEXT_PUBLIC_SUPABASE_URL: "https://previewprojectref.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_preview_example_123456789",
  SERVICE_SUCCESS_FLASH_SECRET: "preview-secret-value-with-more-than-32-chars",
  CONTEXT: "deploy-preview",
  URL: "https://knails.example",
  DEPLOY_PRIME_URL: "https://deploy-preview-42--knails.netlify.app",
  COMMIT_REF: "a".repeat(40),
};

test("valide les trois variables runtime sans retourner leurs valeurs", () => {
  const result = validateEnvironmentConfiguration(valid, {
    expectedContext: "deploy_preview",
    expectedSupabaseProjectRef: "previewprojectref",
  });
  assert.equal(result.valid, true);
  assert.deepEqual(result.variables.map((item) => item.variableName).sort(), [
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_URL",
    "SERVICE_SUCCESS_FLASH_SECRET",
  ]);
  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /preview-secret-value|sb_publishable_preview/);
});

test("refuse chaque variable obligatoire absente, vide ou invalide", () => {
  for (const name of [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SERVICE_SUCCESS_FLASH_SECRET",
  ] as const) {
    for (const value of [undefined, ""]) {
      const input = { ...valid, [name]: value };
      const result = validateEnvironmentConfiguration(input, {
        expectedContext: "deploy_preview",
        expectedSupabaseProjectRef: "previewprojectref",
      });
      assert.equal(result.valid, false);
      assert.ok(result.variables.some((item) => item.variableName === name && !item.valid));
    }
  }
});

test("observe les variables Netlify réservées sans les classer comme runtime applicatif", () => {
  const result = validateEnvironmentConfiguration(valid, {
    expectedContext: "deploy_preview",
    expectedSupabaseProjectRef: "previewprojectref",
  });
  assert.deepEqual(result.netlify.context, "deploy_preview");
  assert.equal(result.netlify.commitRefValid, true);
  assert.equal(result.netlify.deployPrimeUrlValid, true);
  assert.equal(result.variables.map((item) => String(item.variableName)).includes("CONTEXT"), false);
});

test("refuse toutes les variables ponctuelles galerie et tout secret public", () => {
  for (const forbiddenName of [
    "SUPABASE_GALLERY_CONFIG_URL",
    "SUPABASE_GALLERY_CONFIG_PROJECT_REF",
    "SUPABASE_GALLERY_CONFIG_SECRET_KEY",
    "NEXT_PUBLIC_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_INTERNAL_SECRET",
  ]) {
    const result = validateEnvironmentConfiguration({ ...valid, [forbiddenName]: "forbidden" }, {
      expectedContext: "deploy_preview",
      expectedSupabaseProjectRef: "previewprojectref",
    });
    assert.equal(result.valid, false, forbiddenName);
    assert.ok(result.diagnosticCodes.includes("forbidden_variable_present"));
  }
});

test("refuse URL distante non HTTPS et projet Supabase incohérent", () => {
  assert.equal(validateEnvironmentConfiguration({
    ...valid,
    NEXT_PUBLIC_SUPABASE_URL: "http://previewprojectref.supabase.co",
  }, {
    expectedContext: "deploy_preview",
    expectedSupabaseProjectRef: "previewprojectref",
  }).valid, false);

  assert.equal(validateEnvironmentConfiguration(valid, {
    expectedContext: "deploy_preview",
    expectedSupabaseProjectRef: "anotherprojectref",
  }).valid, false);
});

test("versionne le build Netlify, la garde Edge et toute la matrice canonique", () => {
  const source = readFileSync("netlify.toml", "utf8");

  assert.match(source, /\[build\]\s*command\s*=\s*["']npm run build["']/);
  for (const context of ["production", "deploy-preview", "branch-deploy"]) {
    assert.match(source, new RegExp(`\\[context\\.${context}\\]\\s*command\\s*=\\s*["']npm run build["']`));
  }
  assert.match(source, /\[\[edge_functions\]\][\s\S]*path\s*=\s*["']\/\*["'][\s\S]*function\s*=\s*["']validate-contact["']/);
  const redirectingOrigins = [
    "http://knailsbeauty.fr",
    "http://www.knailsbeauty.fr",
    "https://www.knailsbeauty.fr",
    "http://knailsbeauty.com",
    "https://knailsbeauty.com",
    "http://www.knailsbeauty.com",
    "https://www.knailsbeauty.com",
    "http://friendly-cactus-227b77.netlify.app",
    "https://friendly-cactus-227b77.netlify.app",
  ];

  for (const origin of redirectingOrigins) {
    const escapedOrigin = origin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(
      source,
      new RegExp(
        `\\[\\[redirects\\]\\]\\s*from\\s*=\\s*["']${escapedOrigin}/\\*["']\\s*` +
        `to\\s*=\\s*["']https://knailsbeauty\\.fr/:splat["']\\s*` +
        `status\\s*=\\s*301\\s*force\\s*=\\s*true`,
      ),
      origin,
    );
  }
  assert.doesNotMatch(source, /from\s*=\s*["']https:\/\/knailsbeauty\.fr\/\*["']/);
  assert.doesNotMatch(source, /NEXT_PUBLIC_SUPABASE|SERVICE_SUCCESS_FLASH_SECRET|service_role|sb_secret_/i);
});

test("configure un bucket galerie absent avec une clé secret non-JWT", () => {
  const source = readFileSync("scripts/configure-gallery-bucket.mjs", "utf8");

  assert.match(source, /apikey:\s*key/);
  assert.doesNotMatch(source, /Authorization:\s*`Bearer \$\{key\}`/);
  assert.match(source, /method === "POST"/);
  assert.match(source, /\{ id: BUCKET_ID, name: BUCKET_ID, \.\.\.EXPECTED \}/);
  assert.match(source, /payload\?\.message === "Bucket not found"/);
});
