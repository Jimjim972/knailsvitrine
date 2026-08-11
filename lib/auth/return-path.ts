const ADMIN_ORIGIN = "https://admin-return.invalid";
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/;
const AMBIGUOUS_ENCODING = /%(?:00|0[1-9a-f]|1[0-9a-f]|23|25|2e|2f|5c|7f)/i;

export function sanitizeAdminReturnPath(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 2048 ||
    value.includes("\\") ||
    value.includes("#") ||
    CONTROL_CHARACTER.test(value) ||
    AMBIGUOUS_ENCODING.test(value)
  ) {
    return "/admin";
  }

  try {
    const parsed = new URL(value, ADMIN_ORIGIN);
    if (parsed.origin !== ADMIN_ORIGIN || parsed.hash) return "/admin";
    if (parsed.pathname !== "/admin" && !parsed.pathname.startsWith("/admin/")) return "/admin";
    if (
      parsed.pathname === "/admin/connexion" ||
      parsed.pathname.startsWith("/admin/connexion/")
    ) {
      return "/admin";
    }
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return "/admin";
  }
}
