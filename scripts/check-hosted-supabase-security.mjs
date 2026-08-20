import { pathToFileURL } from "node:url";
import { emit, fail, pass } from "./run-foundation-checks.mjs";

const MANAGEMENT_ORIGIN = "https://api.supabase.com";
const EXPECTED_TABLES = ["categories_prestations", "photos_galerie", "prestations"];
const SAFE_METHODS = new Set(["GET", "POST"]);

const INVENTORY_QUERY = `
select jsonb_build_object(
  'tables', coalesce((
    select jsonb_agg(jsonb_build_object('name', c.relname, 'rls', c.relrowsecurity) order by c.relname)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relname in ('categories_prestations', 'photos_galerie', 'prestations')
  ), '[]'::jsonb),
  'policies', coalesce((
    select jsonb_agg(jsonb_build_object('table', tablename, 'name', policyname, 'command', cmd) order by tablename, policyname)
    from pg_policies
    where schemaname in ('public', 'storage')
      and (tablename in ('categories_prestations', 'photos_galerie', 'prestations') or tablename = 'objects')
  ), '[]'::jsonb),
  'grants', coalesce((
    select jsonb_agg(jsonb_build_object('table', table_name, 'role', grantee, 'privilege', privilege_type) order by table_name, grantee, privilege_type)
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name in ('categories_prestations', 'photos_galerie', 'prestations')
      and grantee in ('anon', 'authenticated')
  ), '[]'::jsonb),
  'bucket', coalesce((
    select jsonb_build_object(
      'exists', true,
      'public', public,
      'fileSizeLimit', file_size_limit,
      'allowedMimeTypes', allowed_mime_types
    )
    from storage.buckets
    where id = 'galerie'
  ), jsonb_build_object('exists', false))
) as inventory;
`;

function parseArguments(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith("--") || !argv[index + 1] || argv[index + 1].startsWith("--")) {
      throw new Error("invalid_hosted_security_arguments");
    }
    values.set(argument.slice(2), argv[index + 1]);
    index += 1;
  }
  return values;
}

export function hostedProjectIdentity(rawUrl, explicitRef) {
  const url = new URL(rawUrl);
  const match = url.hostname.match(/^([a-z0-9]{20})\.supabase\.co$/);
  if (url.protocol !== "https:" || url.origin !== rawUrl || !match) {
    throw new Error("invalid_hosted_supabase_origin");
  }
  const projectRef = match[1];
  if (explicitRef && explicitRef !== projectRef) throw new Error("hosted_project_ref_mismatch");
  return { origin: url.origin, projectRef };
}

function managementClient(accessToken, fetchImpl = fetch) {
  if (typeof accessToken !== "string" || accessToken.length < 20) {
    throw new Error("missing_management_capability");
  }

  return async function request(path, { method = "GET", body } = {}) {
    if (!SAFE_METHODS.has(method) || (method === "POST" && path.split("?")[0].split("/").at(-1) !== "query")) {
      throw new Error("hosted_audit_refuses_mutation");
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetchImpl(`${MANAGEMENT_ORIGIN}${path}`, {
        method,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`management_read_failed_${response.status}`);
      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  };
}

function advisorEntries(payload) {
  if (Array.isArray(payload)) return payload;
  for (const key of ["lints", "advisors", "result", "data"]) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
}

function inventoryFromQuery(payload) {
  const firstRow = Array.isArray(payload) ? payload[0] : payload?.result?.[0];
  return firstRow?.inventory ?? null;
}

export async function auditHostedSupabaseSecurity({
  supabaseUrl,
  projectRef,
  accessToken,
  fetchImpl = fetch,
}) {
  const identity = hostedProjectIdentity(supabaseUrl, projectRef);
  const request = managementClient(accessToken, fetchImpl);
  const base = `/v1/projects/${identity.projectRef}`;
  const results = [];

  const project = await request(base);
  results.push(project?.ref === identity.projectRef
    ? pass("security.hosted.project", "Hosted project identity is verified")
    : fail("security.hosted.project", "authorization", "Hosted project identity did not match"));

  const queryPayload = await request(`${base}/database/query`, {
    method: "POST",
    body: { query: INVENTORY_QUERY, read_only: true },
  });
  const inventory = inventoryFromQuery(queryPayload);
  const tables = Array.isArray(inventory?.tables) ? inventory.tables : [];
  const tableNames = tables.map(({ name }) => name).sort();
  results.push(JSON.stringify(tableNames) === JSON.stringify(EXPECTED_TABLES) && tables.every(({ rls }) => rls === true)
    ? pass("security.hosted.catalog", "Expected exposed tables exist with RLS enabled")
    : fail("security.hosted.catalog", "privilege", "Hosted table or RLS inventory is incomplete"));
  results.push(Array.isArray(inventory?.policies) && inventory.policies.length >= 12
    ? pass("security.hosted.policies", "Hosted public and Storage policies are inventoried")
    : fail("security.hosted.policies", "privilege", "Hosted policy inventory is incomplete"));
  results.push(Array.isArray(inventory?.grants) && inventory.grants.length > 0
    ? pass("security.hosted.grants", "Hosted Data API grants are inventoried separately from RLS")
    : fail("security.hosted.grants", "privilege", "Hosted Data API grants are unavailable"));
  const bucket = inventory?.bucket;
  results.push(bucket?.exists === true && bucket.public === false && bucket.fileSizeLimit === 8_388_608
    ? pass("security.hosted.bucket", "Hosted gallery bucket is private and bounded")
    : fail("security.hosted.bucket", "privilege", "Hosted gallery bucket is absent, public or unbounded"));

  const auth = await request(`${base}/config/auth`);
  const signupClosed = auth?.disable_signup === true;
  const anonymousClosed = auth?.external_anonymous_users_enabled !== true;
  const smsClosed = auth?.external_phone_enabled !== true;
  results.push(signupClosed && anonymousClosed && smsClosed
    ? pass("security.hosted.auth", "Hosted email, OTP, SMS and anonymous account creation is closed")
    : fail("security.hosted.auth", "authorization", "Hosted Auth account creation is not fully closed"));

  for (const type of ["security", "performance"]) {
    const entries = advisorEntries(await request(`${base}/advisors/${type}`));
    const blocking = entries.filter((entry) => ["WARN", "WARNING", "ERROR"].includes(String(entry?.level ?? "").toUpperCase()));
    results.push(blocking.length === 0
      ? pass(`security.hosted.advisors.${type}`, `Hosted ${type} advisors contain no unresolved warning`)
      : fail(`security.hosted.advisors.${type}`, "privilege", `Hosted ${type} advisors contain ${blocking.length} unresolved warning(s)`));
  }

  const ssl = await request(`${base}/ssl-enforcement`);
  const sslEnabled = ssl?.currentConfig?.database === true || ssl?.database === true;
  results.push(sslEnabled
    ? pass("security.hosted.ssl", "Hosted database SSL enforcement is enabled")
    : fail("security.hosted.ssl", "privilege", "Hosted database SSL enforcement is disabled or unverifiable"));

  const network = await request(`${base}/network-restrictions`);
  const restrictions = network?.config?.dbAllowedCidrs ?? network?.dbAllowedCidrs ?? [];
  results.push(Array.isArray(restrictions)
    ? pass("security.hosted.network", `Hosted network restrictions were inspected (${restrictions.length} database rule(s))`)
    : fail("security.hosted.network", "privilege", "Hosted network restrictions were not inspectable"));

  return results;
}

async function main() {
  const results = [];
  try {
    const argumentsMap = parseArguments(process.argv.slice(2));
    results.push(...await auditHostedSupabaseSecurity({
      supabaseUrl: argumentsMap.get("url") ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
      projectRef: argumentsMap.get("project-ref") ?? process.env.SUPABASE_PROJECT_REF,
      accessToken: process.env.SUPABASE_ACCESS_TOKEN,
    }));
  } catch {
    results.push(fail("security.hosted.audit", "internal", "Hosted Supabase security audit could not complete"));
  }
  emit(results);
  process.exitCode = results.some(({ status }) => status === "fail") ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
