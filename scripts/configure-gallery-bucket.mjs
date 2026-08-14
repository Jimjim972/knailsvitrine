import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const BUCKET_ID = "galerie";
const EXPECTED = {
  public: false,
  file_size_limit: 8_388_608,
  allowed_mime_types: ["image/jpeg", "image/png", "image/webp"],
};

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}

function loopbackOrigin(rawUrl) {
  const url = new URL(rawUrl);
  if (url.protocol !== "http:" || !new Set(["127.0.0.1", "localhost", "[::1]"]).has(url.hostname) || url.username || url.password) {
    throw new Error("La configuration locale exige une URL HTTP loopback.");
  }
  return url.origin;
}

function hostedOrigin(rawUrl, projectRef) {
  if (!/^[a-z0-9]{20}$/.test(projectRef)) throw new Error("La référence Supabase hébergée est invalide.");
  const url = new URL(rawUrl);
  if (url.protocol !== "https:" || url.hostname !== `${projectRef}.supabase.co` || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("L’URL Supabase ne correspond pas exactement à la référence autorisée.");
  }
  return url.origin;
}

function readLocalConfiguration() {
  const config = readFileSync("supabase/config.toml", "utf8");
  const block = config.match(/\[storage\.buckets\.galerie\]([\s\S]*?)(?=\n\[|$)/)?.[1];
  if (!block
    || !/^public\s*=\s*false\s*$/m.test(block)
    || !/^file_size_limit\s*=\s*"8MiB"\s*$/m.test(block)
    || !/^allowed_mime_types\s*=\s*\["image\/jpeg",\s*"image\/png",\s*"image\/webp"\]\s*$/m.test(block)) {
    throw new Error("supabase/config.toml ne décrit pas le bucket galerie privé attendu.");
  }
  const statusCommand = spawnSync("npx", ["supabase", "status", "--output", "json"], { encoding: "utf8", stdio: "pipe" });
  if (statusCommand.status !== 0) throw new Error("La pile Supabase locale est indisponible.");
  const status = JSON.parse(statusCommand.stdout);
  const key = status.SECRET_KEY;
  if (typeof key !== "string" || !key.startsWith("sb_secret_")) throw new Error("La CLI locale n’a pas fourni sa clé éphémère attendue.");
  return { origin: loopbackOrigin(status.API_URL), key };
}

function readHostedConfiguration() {
  const rawUrl = process.env.SUPABASE_GALLERY_CONFIG_URL ?? "";
  const projectRef = process.env.SUPABASE_GALLERY_CONFIG_PROJECT_REF ?? "";
  const key = process.env.SUPABASE_GALLERY_CONFIG_SECRET_KEY ?? "";
  if (!rawUrl || !projectRef || !key) throw new Error("Les trois variables SUPABASE_GALLERY_CONFIG_* sont obligatoires.");
  if (!key.startsWith("sb_secret_") || key.split(".").length === 3) throw new Error("Une clé dédiée sb_secret_... est obligatoire ; les JWT service_role sont refusés.");
  return { origin: hostedOrigin(rawUrl, projectRef), key };
}

async function bucketRequest(origin, key, method = "GET", body) {
  const response = await fetch(`${origin}/storage/v1/bucket/${BUCKET_ID}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`L’API Storage a refusé la configuration (${response.status}).`);
  return response.status === 204 ? null : response.json();
}

function normalizedBucket(bucket) {
  return {
    public: bucket?.public === true,
    file_size_limit: Number(bucket?.file_size_limit),
    allowed_mime_types: [...(bucket?.allowed_mime_types ?? [])].sort(),
  };
}

function matchesExpected(bucket) {
  const normalized = normalizedBucket(bucket);
  return normalized.public === EXPECTED.public
    && normalized.file_size_limit === EXPECTED.file_size_limit
    && JSON.stringify(normalized.allowed_mime_types) === JSON.stringify([...EXPECTED.allowed_mime_types].sort());
}

async function main() {
  const local = process.argv.slice(2).includes("--local");
  const unknown = process.argv.slice(2).filter((argument) => argument !== "--local");
  if (unknown.length > 0) throw new Error("Option de configuration inconnue.");
  const { origin, key } = local ? readLocalConfiguration() : readHostedConfiguration();
  const current = await bucketRequest(origin, key);
  if (!matchesExpected(current)) {
    await bucketRequest(origin, key, "PUT", EXPECTED);
  }
  const verified = await bucketRequest(origin, key);
  if (!matchesExpected(verified)) throw new Error("La postcondition du bucket galerie n’est pas satisfaite.");
  process.stdout.write(JSON.stringify({ bucket: BUCKET_ID, target: local ? "local" : "hosted", status: "configured", changed: !matchesExpected(current) }) + "\n");
}

try {
  await main();
} catch (error) {
  fail(error instanceof Error ? error.message : "La configuration du bucket a échoué.");
}
