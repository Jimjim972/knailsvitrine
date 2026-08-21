import { expect, test, type Page } from "@playwright/test";
import {
  expectAccessibilityScans,
  expectMinimumTargets,
  expectNoHorizontalOverflow,
  expectReducedMotion,
  expectVisibleFocus,
  tabTo,
} from "../helpers/accessibility";

const VALID_CONTACT = {
  name: "Élodie Martin",
  phone: "0696 12 34 56",
  email: "elodie.martin@example.test",
  message: "Bonjour, je souhaite obtenir des renseignements sur vos prestations.",
} as const;

async function fillContact(page: Page) {
  const expectedCounters = {
    name: `${VALID_CONTACT.name.trim().length}/120`,
    phone: `${VALID_CONTACT.phone.trim().length}/30`,
    email: `${VALID_CONTACT.email.trim().length}/254`,
    message: `${VALID_CONTACT.message.trim().length}/2 000`,
  };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.getByLabel("Prénom & nom").fill(VALID_CONTACT.name);
    await page.getByLabel(/Téléphone/).fill(VALID_CONTACT.phone);
    await page.getByLabel("E-mail").fill(VALID_CONTACT.email);
    await page.getByLabel("Message").fill(VALID_CONTACT.message);
    const synchronized = await page.waitForFunction((expected) =>
      document.querySelector("#name-help")?.textContent?.includes(expected.name) &&
      document.querySelector("#phone-help")?.textContent?.includes(expected.phone) &&
      document.querySelector("#email-help")?.textContent?.includes(expected.email) &&
      document.querySelector("#message-help")?.textContent?.includes(expected.message),
    expectedCounters, { timeout: 1_500 }).then(() => true, () => false);
    if (synchronized) return;
  }

  throw new Error("The Contact form did not reach its hydrated controlled state");
}

async function submitContact(
  page: Page,
  browserName: string,
  activation: "keyboard" | "pointer" = "keyboard",
) {
  const submit = page.getByRole("button", { name: "Envoyer le message" });
  if (activation === "pointer") {
    await submit.click();
    return;
  }
  await tabTo(page, submit, { key: browserName === "webkit" ? "Alt+Tab" : "Tab" });
  await expectVisibleFocus(submit);
  await page.keyboard.press(browserName === "firefox" ? "Space" : "Enter");
}

test("Services, Galerie, Contact et le menu restent accessibles dans le profil courant", async ({
  page,
}, testInfo) => {
  await page.goto("/services");
  await expect(page.getByRole("heading", { level: 1, name: "Nos Prestations" })).toBeVisible();
  if (process.env.KN_SERVICE_E2E_SCENARIO === "public-unavailable") {
    await expect(page.getByRole("heading", { name: "Prestations indisponibles" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Réessayer" })).toBeVisible();
  } else {
    await expect(page.locator(".service-section").first()).toBeVisible();
  }
  await expectNoHorizontalOverflow(page);
  await expectMinimumTargets(page);
  await expectAccessibilityScans(page, testInfo, "public-services");

  await page.goto("/galerie");
  await expect(page.getByRole("heading", { level: 1, name: "L'Art Sublimé" })).toBeVisible();
  const galleryCards = page.locator(".gallery-card");
  if (await galleryCards.count()) {
    await expect(galleryCards.first().getByRole("heading")).toBeVisible();
  } else {
    await expect(page.getByRole("heading", { name: "Galerie en préparation" })).toBeVisible();
  }
  await expectNoHorizontalOverflow(page);
  await expectMinimumTargets(page);
  await expectAccessibilityScans(page, testInfo, "public-gallery");

  await page.goto("/contact");
  await expect(page.getByRole("heading", { level: 1, name: "Contact & Rendez-vous" })).toBeVisible();
  await expect(page.locator('input[name="bot-field"]')).toBeHidden();
  await expectNoHorizontalOverflow(page);
  await expectMinimumTargets(page);
  await expectAccessibilityScans(page, testInfo, "public-contact-neutral");

  const viewport = page.viewportSize();
  if (viewport?.width === 320) {
    const menu = page.locator(".menu-button");
    await expect(menu).toHaveAccessibleName("Ouvrir le menu");
    await menu.tap();
    await expect(menu).toHaveAttribute("aria-expanded", "true");
    await expect(menu).toHaveAccessibleName("Fermer le menu");
    await expect(page.getByRole("navigation", { name: "Navigation mobile" })).toBeVisible();
    await expectAccessibilityScans(page, testInfo, "public-menu-open");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("navigation", { name: "Navigation mobile" })).toBeHidden();
    await expect(page.getByRole("button", { name: "Ouvrir le menu" })).toBeFocused();
  } else {
    await expect(page.getByRole("navigation", { name: "Navigation principale" })).toBeVisible();
  }

  await expectReducedMotion(page);
});

test("Contact associe les erreurs de validation aux champs", async ({
  page,
  browserName,
}, testInfo) => {
  await page.goto("/contact");
  await submitContact(page, browserName);
  await expect(page.getByLabel("Prénom & nom")).toBeFocused();
  await expect(page.locator("form.contact-form").getByRole("alert")).toContainText("Corrigez les champs indiqués");
  await expectAccessibilityScans(page, testInfo, "contact-invalid");
});

test("Contact annonce l'attente et le succès sans double soumission", async ({
  page,
  browserName,
}, testInfo) => {
  await page.goto("/contact");
  await fillContact(page);
  await page.evaluate(() => {
    const originalFetch = window.fetch.bind(window);
    let releaseProvider: (response: Response) => void = () => {};
    const pendingProvider = new Promise<Response>((resolve) => { releaseProvider = resolve; });
    const control = window as typeof window & { __releaseContactProvider?: () => void };
    control.__releaseContactProvider = () => {
      window.fetch = originalFetch;
      releaseProvider(new Response(null, { status: 204 }));
      delete control.__releaseContactProvider;
    };
    window.fetch = (input, init) => {
      const rawUrl = typeof input === "string" || input instanceof URL ? input.toString() : input.url;
      return new URL(rawUrl, window.location.href).pathname === "/__forms.html"
        ? pendingProvider
        : originalFetch(input, init);
    };
  });
  await submitContact(page, browserName, "pointer");
  try {
    await expect(page.getByRole("status")).toHaveText("Envoi du message en cours…", { timeout: 3_000 });
    await expect(page.getByRole("button", { name: "Envoi en cours…" })).toBeDisabled();
    await expectAccessibilityScans(page, testInfo, "contact-pending");
  } finally {
    await page.evaluate(() => {
      (window as typeof window & { __releaseContactProvider?: () => void }).__releaseContactProvider?.();
    });
  }
  await expect(page.getByRole("status")).toHaveText("Merci, votre message a bien été envoyé.");
  await expectAccessibilityScans(page, testInfo, "contact-success");
});

test("Contact annonce l'erreur et permet une nouvelle tentative", async ({
  page,
  browserName,
}, testInfo) => {
  await page.goto("/contact");
  await fillContact(page);
  await page.route("**/__forms.html", (route) => route.fulfill({ status: 503, body: "" }));
  await submitContact(page, browserName, "pointer");
  await expect(page.locator("form.contact-form").getByRole("alert")).toContainText("momentanément indisponible");
  await expect(page.getByLabel("Message")).toHaveValue(VALID_CONTACT.message);
  await expectAccessibilityScans(page, testInfo, "contact-error");
  await page.unrouteAll({ behavior: "wait" });

  await page.goto("/contact");
  let providerCalls = 0;
  await fillContact(page);
  await page.route("**/__forms.html", (route) => {
    providerCalls += 1;
    return route.fulfill({ status: providerCalls === 1 ? 503 : 204, body: "" });
  });
  await submitContact(page, browserName, "pointer");
  await expect(page.locator("form.contact-form").getByRole("alert")).toBeVisible();
  await submitContact(page, browserName, "pointer");
  await expect(page.getByRole("status")).toHaveText("Merci, votre message a bien été envoyé.");
  expect(providerCalls).toBe(2);
  await expectAccessibilityScans(page, testInfo, "contact-retry-success");
});
