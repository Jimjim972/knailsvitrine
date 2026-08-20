import { expect, test, type Page, type Request } from "@playwright/test";

type ContactValues = { name: string; phone: string; email: string; message: string };
type MatrixCase = { id: string; field: keyof ContactValues; value: string; accepted: boolean };

const validEmail254 = `${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(61)}`;
const validEmail255 = `${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(62)}`;
const baseValues: ContactValues = {
  name: "Élodie Martin",
  phone: "0696 12 34 56",
  email: "elodie.martin@example.test",
  message: "Bonjour, je souhaite obtenir des renseignements.",
};

const matrix: MatrixCase[] = [
  { id: "V01", field: "name", value: "", accepted: false },
  { id: "V02", field: "name", value: "   ", accepted: false },
  { id: "V03", field: "name", value: "É", accepted: false },
  { id: "V04", field: "name", value: "Éa", accepted: true },
  { id: "V05", field: "name", value: "É".repeat(120), accepted: true },
  { id: "V06", field: "name", value: "É".repeat(121), accepted: false },
  { id: "V07", field: "email", value: "", accepted: false },
  { id: "V08", field: "email", value: "visiteur@domaine", accepted: false },
  { id: "V09", field: "email", value: validEmail254, accepted: true },
  { id: "V10", field: "email", value: validEmail255, accepted: false },
  { id: "V11", field: "phone", value: "", accepted: true },
  { id: "V12", field: "phone", value: "12 34 5", accepted: false },
  { id: "V13", field: "phone", value: "12 34 56", accepted: true },
  { id: "V14", field: "phone", value: "+596 696-12-34-56", accepted: true },
  { id: "V15", field: "phone", value: `123456${"-".repeat(25)}`, accepted: false },
  { id: "V16", field: "phone", value: "0696123456A", accepted: false },
  { id: "V17", field: "message", value: "123456789", accepted: false },
  { id: "V18", field: "message", value: "1234567890", accepted: true },
  { id: "V19", field: "message", value: "É".repeat(2_000), accepted: true },
  { id: "V20", field: "message", value: "É".repeat(2_001), accepted: false },
];

function isServerAction(request: Request) {
  return request.method() === "POST" && Boolean(request.headers()["next-action"]);
}

async function fillValues(page: Page, values: ContactValues) {
  await page.getByLabel("Prénom & nom").fill(values.name);
  await page.getByLabel(/Téléphone/).fill(values.phone);
  await page.getByLabel("E-mail").fill(values.email);
  await page.getByLabel("Message").fill(values.message);
}

for (const validationCase of matrix) {
  test(`${validationCase.id} is ${validationCase.accepted ? "accepted" : "rejected"} in the browser without truncation`, async ({
    page,
  }) => {
    await page.route("**/__forms.html", (route) => route.fulfill({ status: 204, body: "" }));
    await page.goto("/contact");
    const values = { ...baseValues, [validationCase.field]: validationCase.value };
    await fillValues(page, values);
    const field = page.locator(`[name="${validationCase.field}"]`);
    await expect(field).toHaveValue(validationCase.value);

    let actionPosts = 0;
    page.on("request", (request) => {
      if (isServerAction(request)) actionPosts += 1;
    });
    await page.locator('form.contact-form button[type="submit"]').click();

    if (validationCase.accepted) {
      await expect.poll(() => actionPosts).toBe(1);
      await expect(field).not.toHaveAttribute("aria-invalid", "true");
    } else {
      await expect(field).toHaveAttribute("aria-invalid", "true");
      await page.waitForTimeout(150);
      expect(actionPosts).toBe(0);
      await expect(field).toHaveValue(validationCase.value);
    }
  });
}

test("field errors are French, associated, announced once, and focus the first invalid field", async ({ page }) => {
  await page.goto("/contact");
  const form = page.locator("form.contact-form");
  await expect(form).toHaveAttribute("novalidate", "");
  await expect(form.locator("[aria-live]")).toHaveCount(1);

  await page.getByRole("button", { name: "Envoyer le message" }).click();
  const name = page.getByLabel("Prénom & nom");
  const email = page.getByLabel("E-mail");
  const message = page.getByLabel("Message");

  await expect(name).toBeFocused();
  for (const field of [name, email, message]) {
    await expect(field).toHaveAttribute("aria-invalid", "true");
    const describedBy = await field.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    for (const id of describedBy?.split(/\s+/).filter(Boolean) ?? []) {
      await expect(page.locator(`#${id}`)).toBeVisible();
    }
  }
  await expect(form.locator("[aria-live]")).toContainText(/corrigez|champ|erreur/i);
  await expect(form).not.toContainText(/invalid|required|provider|stack|netlify/i);
});

test("correcting one field clears only its own error and preserves every other value", async ({ page }) => {
  await page.goto("/contact");
  await fillValues(page, { ...baseValues, name: "É", email: "adresse-invalide" });
  await page.getByRole("button", { name: "Envoyer le message" }).click();

  const name = page.getByLabel("Prénom & nom");
  const email = page.getByLabel("E-mail");
  await expect(name).toHaveAttribute("aria-invalid", "true");
  await expect(email).toHaveAttribute("aria-invalid", "true");

  await name.fill("Élodie Martin");
  await expect(name).not.toHaveAttribute("aria-invalid", "true");
  await expect(email).toHaveAttribute("aria-invalid", "true");
  await expect(email).toHaveValue("adresse-invalide");
  await expect(page.getByLabel(/Téléphone/)).toHaveValue(baseValues.phone);
  await expect(page.getByLabel("Message")).toHaveValue(baseValues.message);
});
