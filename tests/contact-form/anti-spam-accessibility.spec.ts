import { expect, test, type Page, type Request } from "@playwright/test";
import { expectAccessibilityScans } from "../helpers/accessibility";
import {
  CONTACT_PREVIEW_FORM_NAME,
  contactFormNameForNetlifyContext,
} from "../../lib/contact/constants";

const EXPECTED_FORM_NAME = contactFormNameForNetlifyContext(process.env.CONTEXT) ??
  CONTACT_PREVIEW_FORM_NAME;

const viewports = [
  { width: 320, height: 760 },
  { width: 768, height: 900 },
  { width: 1024, height: 900 },
] as const;

function isServerAction(request: Request) {
  return request.method() === "POST" && Boolean(request.headers()["next-action"]);
}

async function fillValidContactForm(page: Page) {
  await page.getByLabel("Prénom & nom").fill("Élodie Martin");
  await page.getByLabel("E-mail").fill("elodie.martin@example.test");
  await page.getByLabel("Message").fill("Bonjour, je souhaite obtenir des renseignements sur vos prestations.");
}

for (const viewport of viewports) {
  test(`the honeypot stays hidden from people and Axe at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto("/contact");

    const form = page.locator("form.contact-form");
    const honeypot = form.locator('input[name="bot-field"]');
    await expect(honeypot).toHaveCount(1);
    await expect(honeypot).toBeHidden();
    await expect(honeypot).toHaveValue("");
    await expect(honeypot).toHaveAttribute("autocomplete", "off");
    await expect(honeypot.locator("xpath=ancestor::*[@hidden][1]")).toHaveCount(1);

    await page.getByLabel("Prénom & nom").focus();
    const visitedNames: string[] = [];
    for (let step = 0; step < 4; step += 1) {
      await page.keyboard.press("Tab");
      visitedNames.push(
        await page.evaluate(() =>
          document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement
            ? document.activeElement.name
            : document.activeElement?.tagName.toLowerCase() ?? "",
        ),
      );
    }
    expect(visitedNames.slice(0, 3)).toEqual(["phone", "email", "message"]);
    expect(visitedNames).not.toContain("bot-field");
    const submit = form.getByRole("button", { name: "Envoyer le message" });
    await submit.focus();
    await expect(submit).toBeFocused();
    expect(await form.ariaSnapshot()).not.toMatch(/bot-field|honeypot|ne pas remplir/i);

    await expectAccessibilityScans(page, testInfo, `contact-honeypot-${viewport.width}`);
  });
}

test("the human submission sends one empty honeypot without exposing form-name in the browser form", async ({ page }) => {
  let providerBody = "";
  await page.route("**/__forms.html", async (route) => {
    providerBody = route.request().postData() ?? "";
    await route.fulfill({ status: 204, body: "" });
  });
  await page.goto("/contact");
  await fillValidContactForm(page);

  const form = page.locator("form.contact-form");
  await expect(form.locator('[name="form-name"]')).toHaveCount(0);
  const actionRequest = page.waitForRequest(isServerAction);
  await page.getByRole("button", { name: "Envoyer le message" }).click();
  const request = await actionRequest;
  expect(request.postData()).toContain("bot-field");
  await expect(form.locator('input[name="bot-field"]')).toHaveValue("");
  await expect(page.getByRole("status")).toHaveText("Merci, votre message a bien été envoyé.");
  expect(Object.fromEntries(new URLSearchParams(providerBody))).toMatchObject({
    "form-name": EXPECTED_FORM_NAME,
    "bot-field": "",
  });
});
