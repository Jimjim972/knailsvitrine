import type { DeploymentContext } from "../production-readiness/types.ts";

export const CONTACT_FORM_NAMES = ["contact", "contact-preview"] as const;
export type ContactFormName = (typeof CONTACT_FORM_NAMES)[number];

export const CONTACT_FORM_NAME = "contact" as const satisfies ContactFormName;
export const CONTACT_PREVIEW_FORM_NAME = "contact-preview" as const satisfies ContactFormName;
export const CONTACT_FORM_ENDPOINT = "/__forms.html" as const;
export const CONTACT_SUBMISSION_TIMEOUT_MS = 10_000;

const NETLIFY_CONTEXTS: Record<string, DeploymentContext> = {
  production: "production",
  "deploy-preview": "deploy_preview",
  "branch-deploy": "branch_deploy",
  dev: "local",
  local: "local",
};

export function contactFormNameForContext(context: DeploymentContext): ContactFormName {
  return context === "production" ? CONTACT_FORM_NAME : CONTACT_PREVIEW_FORM_NAME;
}

export function contactFormNameForNetlifyContext(
  rawContext: string | undefined,
): ContactFormName | null {
  const context = rawContext ? NETLIFY_CONTEXTS[rawContext.trim()] : undefined;
  return context ? contactFormNameForContext(context) : null;
}
