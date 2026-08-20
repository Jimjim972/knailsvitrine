import type { DeploymentTarget } from "./types.ts";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function parseExactOrigin(rawOrigin: string): string {
  const url = new URL(rawOrigin);
  const isLocalHttp = url.protocol === "http:" && LOOPBACK_HOSTS.has(url.hostname);
  if ((url.protocol !== "https:" && !isLocalHttp) || url.username || url.password ||
      url.pathname !== "/" || url.search || url.hash || url.origin !== rawOrigin) {
    throw new Error("invalid_exact_origin");
  }
  return url.origin;
}

type TargetOperation = "read_only" | "mutable";
type TargetGuardOptions = {
  operation: TargetOperation;
  productionSupabaseProjectRef?: string;
};

export type TargetGuardResult = {
  allowed: boolean;
  diagnosticCode:
    | "target_allowed"
    | "invalid_origin"
    | "form_context_mismatch"
    | "production_mutation_forbidden"
    | "mutation_not_authorized"
    | "production_data_forbidden"
    | "project_identity_missing"
    | "project_not_isolated"
    | "production_canonical_mismatch"
    | "production_project_mismatch";
};

function denied(diagnosticCode: Exclude<TargetGuardResult["diagnosticCode"], "target_allowed">): TargetGuardResult {
  return { allowed: false, diagnosticCode };
}

export function evaluateDeploymentTarget(
  target: DeploymentTarget,
  options: TargetGuardOptions,
): TargetGuardResult {
  try {
    parseExactOrigin(target.siteOrigin);
  } catch {
    return denied("invalid_origin");
  }

  const expectedForm = target.context === "production" ? "contact" : "contact-preview";
  if (target.formName !== expectedForm) return denied("form_context_mismatch");

  if (!target.supabaseProjectRef || !options.productionSupabaseProjectRef) {
    return denied("project_identity_missing");
  }

  if (target.context === "production") {
    if (options.operation === "mutable") return denied("production_mutation_forbidden");
    if (!target.canonicalMatch) return denied("production_canonical_mismatch");
    if (target.supabaseProjectRef !== options.productionSupabaseProjectRef) {
      return denied("production_project_mismatch");
    }
    return { allowed: true, diagnosticCode: "target_allowed" };
  }

  if (target.supabaseProjectRef === options.productionSupabaseProjectRef) {
    return denied("project_not_isolated");
  }
  if (options.operation === "mutable") {
    if (!target.mutationAuthorized) return denied("mutation_not_authorized");
    if (target.isProductionData) return denied("production_data_forbidden");
  }
  return { allowed: true, diagnosticCode: "target_allowed" };
}
