export const GALLERY_E2E_SCENARIOS = ["admin-empty", "admin-unavailable"] as const;
export type GalleryE2EScenario = (typeof GALLERY_E2E_SCENARIOS)[number];

export function resolveGalleryE2EScenario(input: { scenario?: string; supabaseUrl?: string; netlify?: string; context?: string }): GalleryE2EScenario | null {
  const scenario = input.scenario?.trim();
  if (!scenario) return null;
  let url: URL;
  try { url = new URL(input.supabaseUrl ?? ""); } catch { throw new Error("Gallery E2E scenario is forbidden"); }
  const loopback = url.protocol === "http:" && new Set(["localhost", "127.0.0.1", "[::1]"]).has(url.hostname) && !url.username && !url.password && !url.hash;
  if (!GALLERY_E2E_SCENARIOS.includes(scenario as GalleryE2EScenario) || !loopback || input.netlify || input.context) {
    throw new Error("Gallery E2E scenario is forbidden");
  }
  return scenario as GalleryE2EScenario;
}
