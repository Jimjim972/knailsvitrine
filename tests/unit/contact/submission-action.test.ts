import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { executeContactSubmission } from "../../../lib/contact/contact-action-core.ts";

const SUBMISSION_ID = "123e4567-e89b-42d3-a456-426614174000";
const RAW_VALUES = {
  name: "  Jeanne Martin  ",
  phone: "  +596 696 12 34 56  ",
  email: "  jeanne@example.com  ",
  message: "  Bonjour, je souhaite obtenir des renseignements.  ",
} as const;

function contactForm(overrides: Record<string, string> = {}) {
  const formData = new FormData();
  const values = {
    "submission-id": SUBMISSION_ID,
    ...RAW_VALUES,
    "bot-field": "",
    ...overrides,
  };
  for (const [key, value] of Object.entries(values)) formData.set(key, value);
  return formData;
}

test("the exported Server Action has the React useActionState signature", () => {
  const source = readFileSync("app/(public)/contact/_actions/contact-actions.ts", "utf8");
  assert.match(source, /^\s*["']use server["'];/);
  assert.match(
    source,
    /export\s+async\s+function\s+submitContactAction\s*\(\s*_?previousState\b[\s\S]*?\bformData\s*:\s*FormData/,
  );
  assert.doesNotMatch(source, /fetch\s*\(|submitContactToNetlify|resolveContactProviderOrigin/);
});

test("the action ignores provider-controlled fields and returns only an authorized normalized snapshot", async () => {
  const state = await executeContactSubmission(contactForm({
    "form-name": "attacker-form",
    origin: "https://attacker.example/",
  }));

  assert.deepEqual(state, {
    phase: "authorized",
    submissionId: SUBMISSION_ID,
    submission: {
      submissionId: SUBMISSION_ID,
      name: "Jeanne Martin",
      phone: "+596 696 12 34 56",
      email: "jeanne@example.com",
      message: "Bonjour, je souhaite obtenir des renseignements.",
      botField: "",
    },
  });
  assert.equal(JSON.stringify(state).includes("attacker.example"), false);
  assert.equal(JSON.stringify(state).includes("attacker-form"), false);
});

test("the action validates all untrusted fields without contacting a provider", async () => {
  const email254 = `${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(61)}`;
  const email255 = `${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(62)}`;
  const matrix = [
    { label: "name below minimum", patch: { name: "J" }, accepted: false },
    { label: "name at minimum", patch: { name: "JJ" }, accepted: true },
    { label: "name at maximum", patch: { name: "J".repeat(120) }, accepted: true },
    { label: "name above maximum", patch: { name: "J".repeat(121) }, accepted: false },
    { label: "missing email", patch: { email: "" }, accepted: false },
    { label: "malformed email", patch: { email: "jeanne.example.com" }, accepted: false },
    { label: "email at maximum", patch: { email: email254 }, accepted: true },
    { label: "email above maximum", patch: { email: email255 }, accepted: false },
    { label: "empty optional phone", patch: { phone: "" }, accepted: true },
    { label: "phone with five digits", patch: { phone: "+596 12" }, accepted: false },
    { label: "phone with six digits", patch: { phone: "+596 123" }, accepted: true },
    { label: "phone with forbidden characters", patch: { phone: "596/123" }, accepted: false },
    { label: "phone above maximum", patch: { phone: "1".repeat(31) }, accepted: false },
    { label: "message below minimum", patch: { message: "M".repeat(9) }, accepted: false },
    { label: "message at minimum", patch: { message: "M".repeat(10) }, accepted: true },
    { label: "message at maximum", patch: { message: "M".repeat(2_000) }, accepted: true },
    { label: "message above maximum", patch: { message: "M".repeat(2_001) }, accepted: false },
    { label: "invalid submission id", patch: { "submission-id": "not-an-uuid" }, accepted: false },
    { label: "trimmed boundaries", patch: { name: "  JJ  ", message: `  ${"M".repeat(10)}  ` }, accepted: true },
    { label: "missing message", patch: { message: "" }, accepted: false },
  ] as const;

  assert.equal(matrix.length, 20);
  for (const scenario of matrix) {
    const state = await executeContactSubmission(contactForm(scenario.patch));
    assert.equal(state.phase, scenario.accepted ? "authorized" : "error", scenario.label);
    if (!scenario.accepted) {
      if (state.phase !== "error") assert.fail(`${scenario.label} must return an error state`);
      assert.equal(state.errorKind, "validation", scenario.label);
      assert.deepEqual(state.values, {
        name: "name" in scenario.patch ? scenario.patch.name : RAW_VALUES.name,
        phone: "phone" in scenario.patch ? scenario.patch.phone : RAW_VALUES.phone,
        email: "email" in scenario.patch ? scenario.patch.email : RAW_VALUES.email,
        message: "message" in scenario.patch ? scenario.patch.message : RAW_VALUES.message,
      });
    }
  }
});

test("a filled honeypot remains opaque and is included in the authorized snapshot", async () => {
  const state = await executeContactSubmission(contactForm({ "bot-field": "filled" }));
  assert.equal(state.phase, "authorized");
  if (state.phase !== "authorized") assert.fail("expected an authorized state");
  assert.equal(state.submission.botField, "filled");
  assert.deepEqual(Object.keys(state).sort(), ["phase", "submission", "submissionId"]);
});
