import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

function localSupabaseEnvironment() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return process.env;
  }

  const status = spawnSync("npx", ["supabase", "status", "--output", "json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  if (status.status !== 0) {
    throw new Error("Une configuration Supabase publique ou l’instance locale est requise pour construire les pages existantes.");
  }

  const values = JSON.parse(status.stdout);
  const url = new URL(values.API_URL);
  const loopback = new Set(["localhost", "127.0.0.1", "[::1]"]);
  if (url.protocol !== "http:" || !loopback.has(url.hostname) || url.username || url.password) {
    throw new Error("La cible Supabase découverte n’est pas un loopback local sûr.");
  }

  return {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: url.origin,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: values.PUBLISHABLE_KEY,
  };
}

const checkEnvironment = localSupabaseEnvironment();

function run(label, command, args) {
  process.stdout.write(`\n[contact:check] ${label}\n`);
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: checkEnvironment,
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function checkPrivacyContracts() {
  const client = readFileSync("components/contact-form.tsx", "utf8");
  const implementationFiles = [
    "app/(public)/contact/_actions/contact-actions.ts",
    "lib/contact/contact-action-core.ts",
    "lib/contact/netlify-forms-client.ts",
    "netlify/edge-functions/validate-contact.ts",
  ].map((path) => readFileSync(path, "utf8")).join("\n");

  const forbiddenClientPatterns = [
    /name=["']form-name["']/i,
    /SUPABASE_SERVICE_ROLE|service_role|sb_secret_/i,
    /NEXT_PUBLIC_.*(?:SECRET|TOKEN|PASSWORD)/i,
  ];
  const forbiddenServerPatterns = [
    /console\.(?:log|info|warn|error)\s*\(/,
    /authorization\s*:/i,
    /cookie\s*:/i,
  ];

  if (forbiddenClientPatterns.some((pattern) => pattern.test(client))) {
    throw new Error("Le bundle du formulaire contient un champ fournisseur ou un motif secret interdit.");
  }
  if (forbiddenServerPatterns.some((pattern) => pattern.test(implementationFiles))) {
    throw new Error("La chaîne Contact contient un log ou une propagation d’identifiants interdite.");
  }
}

run("ESLint", "npm", ["run", "lint"]);
run("TypeScript", "npm", ["run", "typecheck"]);
run("Tests unitaires Contact", "npm", ["run", "test:unit:contact"]);
run("Build Next.js", "npm", ["run", "build"]);
run("E2E Contact Chromium et WebKit", "npm", ["run", "test:e2e:contact:scenarios"]);
process.stdout.write("\n[contact:check] Confidentialité statique\n");
checkPrivacyContracts();
process.stdout.write("[contact:check] Tous les contrôles locaux ont réussi.\n");
