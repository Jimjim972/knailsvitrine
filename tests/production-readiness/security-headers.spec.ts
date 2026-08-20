import { expect, test, type APIResponse } from "@playwright/test";

const DOCUMENT_ROUTES = ["/services", "/galerie", "/contact", "/admin/connexion"] as const;
const REQUIRED_PERMISSIONS = [
  "camera=()",
  "geolocation=()",
  "microphone=()",
  "payment=()",
] as const;

function parseCsp(value: string) {
  return new Map(
    value
      .split(";")
      .map((directive) => directive.trim())
      .filter(Boolean)
      .map((directive) => {
        const [name, ...sources] = directive.split(/\s+/);
        return [name, sources] as const;
      }),
  );
}

function expectSecurityHeaders(response: APIResponse, route: string) {
  const headers = response.headers();
  const cspValue = headers["content-security-policy"] ?? "";
  const csp = parseCsp(cspValue);

  expect(cspValue, `${route} CSP`).not.toBe("");
  expect(csp.get("default-src"), `${route} default-src`).toEqual(["'self'"]);
  expect(csp.get("base-uri"), `${route} base-uri`).toEqual(["'self'"]);
  expect(csp.get("object-src"), `${route} object-src`).toEqual(["'none'"]);
  expect(csp.get("frame-ancestors"), `${route} frame-ancestors`).toEqual(["'none'"]);
  expect(csp.get("form-action"), `${route} form-action`).toEqual(["'self'"]);
  expect(csp.get("connect-src"), `${route} connect-src`).toContain("'self'");
  expect(csp.get("img-src"), `${route} img-src`).toContain("'self'");
  expect(cspValue.split(/\s+/), `${route} wildcard CSP`).not.toContain("*");

  expect(headers["x-frame-options"], `${route} anti-frame`).toBe("DENY");
  expect(headers["x-content-type-options"], `${route} MIME sniffing`).toBe("nosniff");
  expect(headers["referrer-policy"], `${route} referrer`).toBe("strict-origin-when-cross-origin");
  for (const permission of REQUIRED_PERMISSIONS) {
    expect(headers["permissions-policy"], `${route} ${permission}`).toContain(permission);
  }
}

test("les documents publics et Auth reçoivent le contrat complet d'en-têtes", async ({ request }) => {
  for (const route of DOCUMENT_ROUTES) {
    const response = await request.get(route, { maxRedirects: 0 });
    expect(response.status(), route).toBeLessThan(400);
    expectSecurityHeaders(response, route);
  }
});

test("les réponses admin et image privée ne sont jamais stockables", async ({ request }) => {
  const admin = await request.get("/admin", { maxRedirects: 0 });
  expect([200, 303, 307, 308]).toContain(admin.status());
  expect(admin.headers()["cache-control"] ?? "").toContain("private");
  expect(admin.headers()["cache-control"] ?? "").toContain("no-store");

  const missingImage = await request.get(
    "/api/gallery-images/00000000-0000-4000-8000-000000000000",
    { maxRedirects: 0 },
  );
  expect(missingImage.status()).toBe(404);
  expect(missingImage.headers()["cache-control"]).toBe("private, no-store");
  expect(missingImage.headers()["x-content-type-options"]).toBe("nosniff");
});

test("la CSP statique ne bloque pas les parcours publics, Auth, image et Contact", async ({ page }) => {
  const violations: string[] = [];
  page.on("console", (message) => {
    if (/content security policy|violat(?:e|ion).*directive/i.test(message.text())) {
      violations.push(message.text());
    }
  });

  for (const route of DOCUMENT_ROUTES) {
    const response = await page.goto(route, { waitUntil: "networkidle" });
    expect(response?.status(), route).toBeLessThan(400);
    await expect(page.locator("main")).toBeVisible();
  }

  expect(violations).toEqual([]);
});
