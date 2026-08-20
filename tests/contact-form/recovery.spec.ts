import { expect, test, type Page, type Request } from "@playwright/test";

const validValues = {
  name: "Élodie Martin",
  phone: "+596 696 12 34 56",
  email: "elodie.martin@example.test",
  message: "Bonjour, je souhaite conserver cette demande si le réseau échoue.",
};

async function fillValidContactForm(page: Page) {
  await page.getByLabel("Prénom & nom").fill(validValues.name);
  await page.getByLabel(/Téléphone/).fill(validValues.phone);
  await page.getByLabel("E-mail").fill(validValues.email);
  await page.getByLabel("Message").fill(validValues.message);
}

async function expectValuesPreserved(page: Page, expected = validValues) {
  await expect(page.getByLabel("Prénom & nom")).toHaveValue(expected.name);
  await expect(page.getByLabel(/Téléphone/)).toHaveValue(expected.phone);
  await expect(page.getByLabel("E-mail")).toHaveValue(expected.email);
  await expect(page.getByLabel("Message")).toHaveValue(expected.message);
}

function isServerAction(request: Request) {
  return request.method() === "POST" && Boolean(request.headers()["next-action"]);
}

for (const failureScenario of ["provider", "network"] as const) {
  test(`${failureScenario} failure is closed, preserves the draft, and never retries automatically`, async ({ page }) => {
    let providerPosts = 0;
    await page.route("**/__forms.html", async (route) => {
      providerPosts += 1;
      if (failureScenario === "network") await route.abort("connectionfailed");
      else await route.fulfill({ status: 503, body: "RAW_PROVIDER_BODY" });
    });
    await page.goto("/contact");
    await fillValidContactForm(page);

    let actionPosts = 0;
    page.on("request", (request) => {
      if (isServerAction(request)) actionPosts += 1;
    });
    await page.getByRole("button", { name: "Envoyer le message" }).click();

    const alert = page.locator("form.contact-form").getByRole("alert");
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(/réessayer|connexion|indisponible/i);
    await expect(alert).not.toContainText(/netlify|status|stack|fetch|provider|ECONN|https?:\/\//i);
    await expectValuesPreserved(page);
    expect(actionPosts).toBe(1);
    expect(providerPosts).toBe(1);
    await page.waitForTimeout(300);
    expect(actionPosts).toBe(1);
    expect(providerPosts).toBe(1);
  });
}

test("an ambiguous provider failure reuses its UUID until the draft changes", async ({ page }) => {
  const providerBodies: string[] = [];
  await page.route("**/__forms.html", async (route) => {
    providerBodies.push(route.request().postData() ?? "");
    await route.fulfill({ status: 503, body: "" });
  });
  await page.goto("/contact");
  await fillValidContactForm(page);

  const submit = page.getByRole("button", { name: "Envoyer le message" });
  await submit.click();
  await expect(page.locator("form.contact-form").getByRole("alert")).toBeVisible();
  await submit.click();
  await expect.poll(() => providerBodies.length).toBe(2);
  const firstId = new URLSearchParams(providerBodies[0]).get("submission-id");
  expect(new URLSearchParams(providerBodies[1]).get("submission-id")).toBe(firstId);

  await page.getByLabel("Message").fill(`${validValues.message} Nouveau détail.`);
  await submit.click();
  await expect.poll(() => providerBodies.length).toBe(3);
  expect(new URLSearchParams(providerBodies[2]).get("submission-id")).not.toBe(firstId);
});

test("the provider timeout appears after the 10 second deadline and keeps the draft", async ({ page }) => {
  test.setTimeout(20_000);
  await page.route("**/__forms.html", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 10_500));
    await route.fulfill({ status: 204, body: "" });
  });
  await page.goto("/contact");
  await fillValidContactForm(page);
  await page.getByRole("button", { name: "Envoyer le message" }).click();

  await expect(page.locator("form.contact-form").getByRole("alert")).toHaveText(
    "Nous n'avons pas pu confirmer la réception de votre message. Vérifiez votre connexion avant de réessayer.",
    { timeout: 12_000 },
  );
  await expectValuesPreserved(page);
});
