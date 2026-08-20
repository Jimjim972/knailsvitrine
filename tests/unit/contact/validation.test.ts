import assert from "node:assert/strict";
import test from "node:test";
import {
  contactFormValues,
  validateContactValues,
  type ContactFormValues,
} from "../../../lib/validations/contact.ts";

const submissionId = "00000000-0000-4000-8000-000000000001";
const email254 = `${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(61)}`;

const valid: ContactFormValues = {
  submissionId,
  name: "Marie Dupont",
  phone: "+596 696 12 34 56",
  email: "marie@example.com",
  message: "Bonjour, je souhaite obtenir des informations.",
  botField: "",
};

type MatrixCase = {
  id: string;
  patch: Partial<ContactFormValues>;
  accepted: boolean;
  field?: keyof ContactFormValues;
};

const cases: MatrixCase[] = [
  { id: "V01", patch: { name: "" }, accepted: false, field: "name" },
  { id: "V02", patch: { name: "   " }, accepted: false, field: "name" },
  { id: "V03", patch: { name: "A" }, accepted: false, field: "name" },
  { id: "V04", patch: { name: "Al" }, accepted: true },
  { id: "V05", patch: { name: "N".repeat(120) }, accepted: true },
  { id: "V06", patch: { name: "N".repeat(121) }, accepted: false, field: "name" },
  { id: "V07", patch: { email: "" }, accepted: false, field: "email" },
  { id: "V08", patch: { email: "marie@localhost" }, accepted: false, field: "email" },
  { id: "V09", patch: { email: email254 }, accepted: true },
  { id: "V10", patch: { email: `${email254}x` }, accepted: false, field: "email" },
  { id: "V11", patch: { phone: "" }, accepted: true },
  { id: "V12", patch: { phone: "12 34 5" }, accepted: false, field: "phone" },
  { id: "V13", patch: { phone: "123456" }, accepted: true },
  { id: "V14", patch: { phone: "0696 12-34-56" }, accepted: true },
  { id: "V15", patch: { phone: "1".repeat(31) }, accepted: false, field: "phone" },
  { id: "V16", patch: { phone: "06961234A!" }, accepted: false, field: "phone" },
  { id: "V17", patch: { message: "M".repeat(9) }, accepted: false, field: "message" },
  { id: "V18", patch: { message: "M".repeat(10) }, accepted: true },
  { id: "V19", patch: { message: "M".repeat(2_000) }, accepted: true },
  { id: "V20", patch: { message: "M".repeat(2_001) }, accepted: false, field: "message" },
];

test("exécute sans substitution la matrice contrôlée V01–V20", async (t) => {
  assert.equal(cases.length, 20);

  for (const item of cases) {
    await t.test(item.id, () => {
      const result = validateContactValues({ ...valid, ...item.patch });
      assert.equal(result.success, item.accepted);
      if (!result.success && item.field) assert.ok(result.fieldErrors[item.field]?.length);
    });
  }
});

test("normalise uniquement les espaces périphériques sans tronquer ni modifier l’Unicode", () => {
  const values = {
    ...valid,
    name: "  Élodie D’Arc-en-Ciel  ",
    phone: "  +596 (696) 12.34-56  ",
    email: "  elodie@example.com  ",
    message: "  Bonjour, j’aimerais un rendez-vous pour Noël.  ",
    botField: "  piège  ",
  };
  const result = validateContactValues(values);

  assert.equal(result.success, true);
  if (!result.success) return;
  assert.deepEqual(result.data, {
    submissionId,
    name: "Élodie D’Arc-en-Ciel",
    phone: "+596 (696) 12.34-56",
    email: "elodie@example.com",
    message: "Bonjour, j’aimerais un rendez-vous pour Noël.",
    botField: "piège",
  });
  assert.equal(values.message, "  Bonjour, j’aimerais un rendez-vous pour Noël.  ");
});

test("refuse un UUID invalide avec un diagnostic français expurgé", () => {
  const secretMessage = "contenu-confidentiel-à-ne-jamais-répéter";
  const result = validateContactValues({ ...valid, submissionId: "../attaque", message: secretMessage });

  assert.equal(result.success, false);
  if (result.success) return;
  assert.match(result.fieldErrors.submissionId?.[0] ?? "", /identifiant/i);
  assert.doesNotMatch(JSON.stringify(result.fieldErrors), /attaque|contenu-confidentiel/i);
});

test("extrait seulement des chaînes nommées depuis FormData et garde le téléphone absent vide", () => {
  const formData = new FormData();
  formData.set("submission-id", submissionId);
  formData.set("name", "  Marie Dupont  ");
  formData.set("email", "marie@example.com");
  formData.set("message", "Message suffisamment long");
  formData.set("bot-field", "");
  formData.set("form-name", "contact");
  formData.set("origin", "https://attaquant.example");

  assert.deepEqual(contactFormValues(formData), {
    submissionId,
    name: "  Marie Dupont  ",
    phone: "",
    email: "marie@example.com",
    message: "Message suffisamment long",
    botField: "",
  });
});

