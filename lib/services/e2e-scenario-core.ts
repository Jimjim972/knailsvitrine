export const SERVICE_E2E_SCENARIOS = ["admin-empty", "admin-unavailable", "public-unavailable"] as const;
export type ServiceE2EScenario = (typeof SERVICE_E2E_SCENARIOS)[number];

type ScenarioEnvironment = { scenario?: string; supabaseUrl?: string; netlify?: string; context?: string };
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function resolveServiceE2EScenario(input: ScenarioEnvironment): ServiceE2EScenario | null {
  const scenario = input.scenario?.trim();
  if (!scenario) return null;
  let url: URL;
  try { url = new URL(input.supabaseUrl ?? ""); } catch { throw new Error("Service E2E scenario is forbidden"); }
  const isKnown = SERVICE_E2E_SCENARIOS.includes(scenario as ServiceE2EScenario);
  const isExactLoopback = url.protocol === "http:" && LOOPBACK_HOSTS.has(url.hostname) && !url.username && !url.password && !url.hash;
  if (!isKnown || !isExactLoopback || input.netlify || input.context) throw new Error("Service E2E scenario is forbidden");
  return scenario as ServiceE2EScenario;
}
