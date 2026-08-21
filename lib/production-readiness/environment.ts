import type {
  DeploymentContext,
  EnvironmentConfiguration,
  RuntimeVariableName,
} from "./types.ts";

const RUNTIME_VARIABLES: readonly RuntimeVariableName[] = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SERVICE_SUCCESS_FLASH_SECRET",
];

const FORBIDDEN_VARIABLES = new Set([
  "SUPABASE_GALLERY_CONFIG_URL",
  "SUPABASE_GALLERY_CONFIG_PROJECT_REF",
  "SUPABASE_GALLERY_CONFIG_SECRET_KEY",
]);

const NETLIFY_CONTEXTS: Record<string, DeploymentContext> = {
  production: "production",
  "deploy-preview": "deploy_preview",
  "branch-deploy": "branch_deploy",
  dev: "local",
  local: "local",
};

type EnvironmentInput = Record<string, string | undefined>;
type ValidationOptions = {
  expectedContext: DeploymentContext;
  expectedSupabaseProjectRef: string;
};

function valuePresent(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

function exactUrl(value: string | undefined, allowLocalHttp = false): URL | null {
  if (!valuePresent(value)) return null;
  try {
    const url = new URL(value!);
    const loopback = new Set(["localhost", "127.0.0.1", "[::1]"]);
    const allowedProtocol = url.protocol === "https:" ||
      (allowLocalHttp && url.protocol === "http:" && loopback.has(url.hostname));
    if (!allowedProtocol || url.username || url.password || url.pathname !== "/" ||
        url.search || url.hash || url.origin !== value) return null;
    return url;
  } catch {
    return null;
  }
}

function supabaseProjectRef(url: URL | null): string | null {
  if (!url) return null;
  const match = url.hostname.match(/^([a-z0-9]{8,})\.supabase\.co$/);
  if (match) return match[1];
  return new Set(["localhost", "127.0.0.1", "[::1]"]).has(url.hostname) ? "local" : null;
}

function diagnosticVariable(
  context: DeploymentContext,
  variableName: RuntimeVariableName,
  classification: EnvironmentConfiguration["classification"],
  present: boolean,
  valid: boolean,
  diagnosticCode?: string,
  sourceFingerprint?: string,
): EnvironmentConfiguration {
  return {
    context,
    variableName,
    classification,
    present,
    valid,
    ...(diagnosticCode ? { diagnosticCode } : {}),
    ...(sourceFingerprint ? { sourceFingerprint } : {}),
  };
}

export function validateEnvironmentConfiguration(
  input: EnvironmentInput,
  options: ValidationOptions,
) {
  const diagnosticCodes: string[] = [];
  const rawContext = input.CONTEXT?.trim();
  const observedContext = rawContext ? NETLIFY_CONTEXTS[rawContext] : "local";
  if (!observedContext || observedContext !== options.expectedContext) {
    diagnosticCodes.push("deployment_context_mismatch");
  }

  const allowLocalHttp = options.expectedContext === "local";
  const supabaseUrl = exactUrl(input.NEXT_PUBLIC_SUPABASE_URL, allowLocalHttp);
  const observedProjectRef = supabaseProjectRef(supabaseUrl);
  const urlPresent = valuePresent(input.NEXT_PUBLIC_SUPABASE_URL);
  const urlValid = Boolean(supabaseUrl && observedProjectRef === options.expectedSupabaseProjectRef);
  if (!urlValid) diagnosticCodes.push(urlPresent ? "supabase_target_mismatch" : "required_variable_missing");

  const keyPresent = valuePresent(input.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  const keyValue = input.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";
  const keyValid = keyPresent && !/^eyJ/i.test(keyValue) && !/service_role|sb_secret_/i.test(keyValue);
  if (!keyValid) diagnosticCodes.push(keyPresent ? "invalid_publishable_key" : "required_variable_missing");

  const secretPresent = valuePresent(input.SERVICE_SUCCESS_FLASH_SECRET);
  const secretValid = secretPresent && (input.SERVICE_SUCCESS_FLASH_SECRET?.trim().length ?? 0) >= 32;
  if (!secretValid) diagnosticCodes.push(secretPresent ? "invalid_server_secret" : "required_variable_missing");

  const forbiddenNames = Object.entries(input)
    .filter(([name, value]) => valuePresent(value) && (
      FORBIDDEN_VARIABLES.has(name) ||
      (name.startsWith("NEXT_PUBLIC_") && /(?:SECRET|SERVICE_ROLE)/.test(name)) ||
      /^(?:SUPABASE_SERVICE_ROLE_KEY|SERVICE_ROLE_KEY)$/.test(name)
    ))
    .map(([name]) => name);
  if (forbiddenNames.length > 0) diagnosticCodes.push("forbidden_variable_present");

  const netlifyUrl = exactUrl(input.URL, allowLocalHttp);
  const deployPrimeUrl = exactUrl(input.DEPLOY_PRIME_URL, allowLocalHttp);
  const commitRefValid = options.expectedContext === "local"
    ? !valuePresent(input.COMMIT_REF) || /^[0-9a-f]{40}$/.test(input.COMMIT_REF!.trim())
    : /^[0-9a-f]{40}$/.test(input.COMMIT_REF?.trim() ?? "");
  const deployPrimeUrlValid = options.expectedContext === "local" || Boolean(deployPrimeUrl);
  const netlifyUrlValid = options.expectedContext === "local" || Boolean(netlifyUrl);
  if (!commitRefValid) diagnosticCodes.push("invalid_commit_ref");
  if (!deployPrimeUrlValid) diagnosticCodes.push("invalid_deploy_prime_url");
  if (!netlifyUrlValid) diagnosticCodes.push("invalid_netlify_url");

  const context = observedContext ?? options.expectedContext;
  const variables: EnvironmentConfiguration[] = [
    diagnosticVariable(context, RUNTIME_VARIABLES[0], "public", urlPresent, urlValid,
      urlValid ? undefined : "invalid_supabase_url", observedProjectRef ?? undefined),
    diagnosticVariable(context, RUNTIME_VARIABLES[1], "public", keyPresent, keyValid,
      keyValid ? undefined : "invalid_publishable_key"),
    diagnosticVariable(context, RUNTIME_VARIABLES[2], "server_secret", secretPresent, secretValid,
      secretValid ? undefined : "invalid_server_secret"),
  ];

  return {
    valid: diagnosticCodes.length === 0 && variables.every((item) => item.valid),
    variables,
    netlify: {
      context: observedContext ?? null,
      urlValid: netlifyUrlValid,
      deployPrimeUrlValid,
      commitRefValid,
    },
    forbiddenVariableNames: forbiddenNames,
    diagnosticCodes: [...new Set(diagnosticCodes)],
  };
}
