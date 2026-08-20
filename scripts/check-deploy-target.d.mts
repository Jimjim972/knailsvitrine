import type { DeploymentContext } from "../lib/production-readiness/types.ts";
import type { ContactFormName } from "../lib/contact/constants.ts";

export type DeployTargetCheckInput = {
  candidateSha: string;
  context: DeploymentContext;
  siteOrigin: string;
  commitRef: string;
  supabaseProjectRef: string;
  productionSupabaseProjectRef: string;
  isProductionData: boolean;
  mutationAuthorized: boolean;
  formName: ContactFormName;
  canonicalMatch: boolean;
  operation: "read_only" | "mutable";
};

export function checkDeployTarget(input: DeployTargetCheckInput): {
  allowed: boolean;
  diagnosticCode: string;
  context?: DeploymentContext;
  candidateSha?: string;
};
