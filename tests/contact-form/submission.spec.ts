import { expect, test, type Page, type Request } from "@playwright/test";

const SUCCESS_MESSAGE = "Merci, votre message a bien été envoyé.";
const PENDING_MESSAGE = "Envoi du message en cours…";

async function fillValidContactForm(page: Page, phone = "") {
  await page.getByLabel("Prénom & nom").fill("Élodie Martin");
  await page.getByLabel(/Téléphone/).fill(phone);
  await page.getByLabel("E-mail").fill("elodie.martin@example.test");
  await page.getByLabel("Message").fill("Bonjour, je souhaite obtenir des renseignements sur vos prestations.");
}

function isServerAction(request: Request) {
  return request.method() === "POST" && Boolean(request.headers()["next-action"]);
}

test.describe("contact submission", () => {
  test("a valid request stays pending across the Action and provider POST, succeeds, resets, and accepts another request", async ({
    page,
  }) => {
    const providerBodies: string[] = [];
    await page.route("**/__forms.html", async (route) => {
      providerBodies.push(route.request().postData() ?? "");
      await new Promise((resolve) => setTimeout(resolve, 300));
      await route.fulfill({ status: 204, body: "" });
    });
    await page.goto("/contact");
    const form = page.locator("form.contact-form");
    const submit = form.locator('button[type="submit"]');

    await expect(form.locator('[name="form-name"]')).toHaveCount(0);
    await fillValidContactForm(page);

    let actionPosts = 0;
    page.on("request", (request) => {
      if (isServerAction(request)) actionPosts += 1;
    });

    const startedAt = Date.now();
    await submit.evaluate((button) => (button as HTMLButtonElement).click());
    await expect(page.getByRole("status")).toContainText(PENDING_MESSAGE, { timeout: 1_000 });
    expect(Date.now() - startedAt).toBeLessThan(1_000);
    await expect(submit).toBeDisabled();
    await expect(page.getByLabel("Prénom & nom")).toHaveAttribute("readonly", "");

    await expect(page.getByRole("status")).toHaveText(SUCCESS_MESSAGE);
    expect(actionPosts).toBe(1);
    expect(providerBodies).toHaveLength(1);
    expect(Object.fromEntries(new URLSearchParams(providerBodies[0]))).toMatchObject({
      "form-name": "contact",
      phone: "",
      "bot-field": "",
    });
    for (const name of ["name", "phone", "email", "message"]) {
      await expect(form.locator(`[name="${name}"]`)).toHaveValue("");
    }

    await fillValidContactForm(page, "+596 696 12 34 56");
    await page.getByLabel("Message").fill("Bonjour, voici une seconde demande indépendante avec téléphone.");
    await submit.click();
    await expect(page.getByRole("status")).toHaveText(SUCCESS_MESSAGE);
    expect(actionPosts).toBe(2);
    expect(providerBodies).toHaveLength(2);
  });

  test("twenty rapid activations create one Action, one provider POST, and one correlation identifier", async ({ page }) => {
    const providerBodies: string[] = [];
    await page.route("**/__forms.html", async (route) => {
      providerBodies.push(route.request().postData() ?? "");
      await new Promise((resolve) => setTimeout(resolve, 300));
      await route.fulfill({ status: 204, body: "" });
    });
    await page.goto("/contact");
    await fillValidContactForm(page, "0696 12 34 56");

    let actionPosts = 0;
    page.on("request", (request) => {
      if (isServerAction(request)) actionPosts += 1;
    });

    const submit = page.locator('form.contact-form button[type="submit"]');
    await submit.evaluate((button) => {
      for (let activation = 0; activation < 20; activation += 1) {
        (button as HTMLButtonElement).click();
      }
    });

    await expect(page.getByRole("status")).toContainText(PENDING_MESSAGE, { timeout: 1_000 });
    await expect(page.getByRole("status")).toHaveText(SUCCESS_MESSAGE);
    expect(actionPosts).toBe(1);
    expect(providerBodies).toHaveLength(1);
    const body = new URLSearchParams(providerBodies[0]);
    expect(body.get("submission-id")).toMatch(/^[0-9a-f-]{36}$/i);
  });
});
