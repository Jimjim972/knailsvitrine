import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page, type Request } from "@playwright/test";

const viewports = [
  { width: 320, height: 760 },
  { width: 768, height: 900 },
  { width: 1024, height: 900 },
] as const;
const states = ["neutral", "invalid", "pending", "success", "error", "retry"] as const;
type ContactState = (typeof states)[number];

const validValues = {
  name: "Élodie Martin",
  phone: "0696 12 34 56",
  email: "elodie.martin@example.test",
  message: "Bonjour, je souhaite obtenir des renseignements sur vos prestations.",
};

function isServerAction(request: Request) {
  return request.method() === "POST" && Boolean(request.headers()["next-action"]);
}

async function fillValidContactForm(page: Page) {
  await page.getByLabel("Prénom & nom").fill(validValues.name);
  await page.getByLabel(/Téléphone/).fill(validValues.phone);
  await page.getByLabel("E-mail").fill(validValues.email);
  await page.getByLabel("Message").fill(validValues.message);
}

async function submitWithKeyboard(page: Page) {
  const submit = page.locator('form.contact-form button[type="submit"]');
  await submit.focus();
  await expect(submit).toBeFocused();
  await page.keyboard.press("Enter");
}

async function expectMinimumTarget(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect.soft(box?.width ?? 0).toBeGreaterThanOrEqual(44);
  expect.soft(box?.height ?? 0).toBeGreaterThanOrEqual(44);
}

async function expectSharedAccessibility(page: Page, state: ContactState) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);

  for (const label of ["Prénom & nom", "Téléphone", "E-mail", "Message"]) {
    const control = page.getByLabel(label, { exact: label !== "Téléphone" });
    await expect(control).toBeVisible();
    await expectMinimumTarget(control);
  }
  await expectMinimumTarget(page.locator('form.contact-form button[type="submit"]'));

  const form = page.locator("form.contact-form");
  if (state === "invalid" || state === "error" || state === "retry") {
    await expect(form.locator('[role="alert"], [aria-live="assertive"]')).toContainText(/\S/);
  }
  if (state === "pending" || state === "success") {
    await expect(form.getByRole("status")).toContainText(/\S/);
  }

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
}

async function exerciseState(page: Page, state: ContactState) {
  const form = page.locator("form.contact-form");
  const submit = form.locator('button[type="submit"]');

  if (state === "neutral") {
    await expect(form.getByRole("status")).toHaveText("");
    await page.getByLabel("Prénom & nom").focus();
    const focusStyle = await page.getByLabel("Prénom & nom").evaluate((element) => {
      const style = getComputedStyle(element);
      return { outlineWidth: Number.parseFloat(style.outlineWidth), boxShadow: style.boxShadow };
    });
    expect(focusStyle.outlineWidth >= 2 || focusStyle.boxShadow !== "none").toBe(true);
    return;
  }

  if (state === "invalid") {
    await submitWithKeyboard(page);
    await expect(page.getByLabel("Prénom & nom")).toBeFocused();
    await expect(page.getByLabel("Prénom & nom")).toHaveAttribute("aria-invalid", "true");
    return;
  }

  await fillValidContactForm(page);
  if (state === "pending") {
    await submitWithKeyboard(page);
    await expect(form.getByRole("status")).toHaveText("Envoi du message en cours…", { timeout: 1_000 });
    await expect(submit).toBeDisabled();
    await expect(page.getByLabel("Message")).toHaveAttribute("readonly", "");
    return;
  }

  if (state === "success") {
    await submitWithKeyboard(page);
    await expect(form.getByRole("status")).toHaveText("Merci, votre message a bien été envoyé.");
    await expect(page.getByLabel("Message")).toHaveValue("");
    return;
  }

  if (state === "error") {
    await submitWithKeyboard(page);
    await expect(form.getByRole("alert")).toBeVisible();
    await expect(page.getByLabel("Message")).toHaveValue(validValues.message);
    await expect(submit).toBeEnabled();
    return;
  }

  let actionPosts = 0;
  page.on("request", (request) => {
    if (isServerAction(request)) actionPosts += 1;
  });
  await submitWithKeyboard(page);
  await expect(form.getByRole("alert")).toBeVisible();
  await submitWithKeyboard(page);
  await expect.poll(() => actionPosts).toBe(2);
  await expect(form.getByRole("alert")).toBeVisible();
  await expect(page.getByLabel("Message")).toHaveValue(validValues.message);
}

for (const viewport of viewports) {
  for (const state of states) {
    test(`${state} is keyboard-operable and accessible at ${viewport.width}px`, async ({ page }) => {
      if (state === "pending") {
        await page.route("**/__forms.html", async (route) => {
          await new Promise((resolve) => setTimeout(resolve, 2_000));
          await route.fulfill({ status: 204, body: "" });
        });
      } else if (state === "success") {
        await page.route("**/__forms.html", (route) => route.fulfill({ status: 204, body: "" }));
      } else if (state === "error" || state === "retry") {
        await page.route("**/__forms.html", (route) => route.fulfill({ status: 503, body: "" }));
      }

      await page.setViewportSize(viewport);
      await page.goto("/contact");
      await exerciseState(page, state);
      await expectSharedAccessibility(page, state);
    });
  }
}

test("services, gallery, and non-form contact content keep their public structure", async ({ page }) => {
  for (const route of ["/services", "/galerie", "/contact"]) {
    const response = await page.goto(route);
    expect(response?.status(), route).toBe(200);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByRole("navigation").getByRole("link", { name: "Contact" })).toHaveAttribute("href", "/contact");
  }

  await page.goto("/contact");
  await expect(page.getByRole("heading", { name: "Contact & Rendez-vous" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Informations pratiques" })).toBeVisible();
  await expect(page.getByText("N°371, Chemin La Hubert, Saint-Joseph 97212, Martinique").first()).toBeVisible();
  await expect(page.getByText("Lundi – mardi : 09h00 – 17h00").first()).toBeVisible();
  await expect(page.getByText("Mercredi : Fermé").first()).toBeVisible();
  await expect(page.getByText("Samedi : 08h00 – 12h00").first()).toBeVisible();
  await expect(page.getByText("Dimanche : Fermé").first()).toBeVisible();
  await expect(page.locator(".contact-sidebar").getByRole("link", { name: "+33 1 23 45 67 89" })).toHaveAttribute("href", "tel:+33123456789");
  await expect(page.getByAltText("Plan stylisé de Saint-Joseph en Martinique")).toBeVisible();
});
