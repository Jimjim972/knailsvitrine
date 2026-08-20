import type { DeploymentContext } from "../production-readiness/types.ts";

export const CANONICAL_ORIGIN = "https://knailsbeauty.fr" as const;

export type NetlifyDeploymentContext = {
  context: DeploymentContext;
  rawContext: string | undefined;
  canonicalOrigin: typeof CANONICAL_ORIGIN;
  siteOrigin: string | null;
  deployPrimeOrigin: string | null;
  commitRef: string | null;
  isIndexable: boolean;
  valid: boolean;
  diagnosticCodes: string[];
};

type DeploymentEnvironment = Partial<Record<
  "CONTEXT" | "URL" | "DEPLOY_PRIME_URL" | "COMMIT_REF",
  string | undefined
>>;

const CONTEXT_MAP: Record<string, DeploymentContext> = {
  production: "production",
  "deploy-preview": "deploy_preview",
  "branch-deploy": "branch_deploy",
  dev: "local",
  local: "local",
};

function normalize(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function exactOrigin(value: string | undefined, allowLoopbackHttp = false): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const loopback = new Set(["localhost", "127.0.0.1", "[::1]"]);
    const protocolAllowed = url.protocol === "https:" ||
      (allowLoopbackHttp && url.protocol === "http:" && loopback.has(url.hostname));
    if (!protocolAllowed || url.username || url.password || url.pathname !== "/" ||
        url.search || url.hash || url.origin !== value) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function resolveDeploymentContext(
  environment: DeploymentEnvironment = process.env as DeploymentEnvironment,
): NetlifyDeploymentContext {
  const rawContext = normalize(environment.CONTEXT);
  const context = rawContext ? CONTEXT_MAP[rawContext] : "local";
  const diagnosticCodes: string[] = [];
  if (rawContext && !CONTEXT_MAP[rawContext]) diagnosticCodes.push("invalid_netlify_context");

  const rawUrl = normalize(environment.URL);
  const rawDeployPrimeUrl = normalize(environment.DEPLOY_PRIME_URL);
  const siteOrigin = exactOrigin(rawUrl, context === "local");
  const deployPrimeOrigin = exactOrigin(rawDeployPrimeUrl, context === "local");
  const commitRef = normalize(environment.COMMIT_REF) ?? null;

  if (context !== "local") {
    if (!siteOrigin) diagnosticCodes.push("invalid_netlify_url");
    if (!deployPrimeOrigin) diagnosticCodes.push("invalid_deploy_prime_url");
    if (!commitRef || !/^[0-9a-f]{40}$/.test(commitRef)) diagnosticCodes.push("invalid_commit_ref");
  }
  if (context === "production" && siteOrigin !== CANONICAL_ORIGIN) {
    diagnosticCodes.push("canonical_origin_mismatch");
  }

  const valid = diagnosticCodes.length === 0;
  return {
    context,
    rawContext,
    canonicalOrigin: CANONICAL_ORIGIN,
    siteOrigin,
    deployPrimeOrigin,
    commitRef,
    isIndexable: valid && context === "production" && siteOrigin === CANONICAL_ORIGIN,
    valid,
    diagnosticCodes,
  };
}

export function requireDeploymentContext(
  environment: DeploymentEnvironment = process.env as DeploymentEnvironment,
): NetlifyDeploymentContext {
  const deployment = resolveDeploymentContext(environment);
  if (!deployment.valid) throw new Error(`Invalid deployment context: ${deployment.diagnosticCodes.join(",")}`);
  return deployment;
}
