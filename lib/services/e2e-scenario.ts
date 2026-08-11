import "server-only";
import { resolveServiceE2EScenario } from "./e2e-scenario-core";

const selectedScenario = resolveServiceE2EScenario({
  scenario: process.env.KN_SERVICE_E2E_SCENARIO,
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  netlify: process.env.NETLIFY,
  context: process.env.CONTEXT,
});

export function getServiceE2EScenario() { return selectedScenario; }
