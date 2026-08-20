import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const BLUEPRINT_PATH = "public/__forms.html";

function getContactFormSource() {
  const source = readFileSync(BLUEPRINT_PATH, "utf8");
  const match = source.match(/<form\b[^>]*\bname=["']contact["'][^>]*>([\s\S]*?)<\/form>/i);

  assert.ok(match, "the static blueprint must contain the contact form");
  return { form: match[0], body: match[1] };
}

test("the static contact blueprint is detectable by Netlify", () => {
  const { form } = getContactFormSource();

  assert.match(form, /\bmethod=["']POST["']/i);
  assert.match(form, /(?:\bdata-netlify=["']true["']|\bnetlify(?:\s|=|>))/i);
  assert.match(form, /\bnetlify-honeypot=["']bot-field["']/i);
  assert.doesNotMatch(form, /\baction=["'](?:\/api|https?:)/i);
});

test("the blueprint declares exactly the seven provider fields", () => {
  const { body } = getContactFormSource();
  const fieldNames = [...body.matchAll(/<(?:input|textarea)\b[^>]*\bname=["']([^"']+)["'][^>]*>/gi)]
    .map((match) => match[1])
    .sort();

  assert.deepEqual(fieldNames, [
    "bot-field",
    "email",
    "form-name",
    "message",
    "name",
    "phone",
    "submission-id",
  ]);
  assert.match(body, /<input\b[^>]*\bname=["']form-name["'][^>]*\bvalue=["']contact["'][^>]*>/i);
  assert.match(body, /<input\b[^>]*\bname=["']bot-field["'][^>]*>/i);
});

test("the blueprint stays static and contains no visitor-facing behavior", () => {
  const source = readFileSync(BLUEPRINT_PATH, "utf8");

  assert.doesNotMatch(source, /<script\b/i);
  assert.doesNotMatch(source, /NEXT_PUBLIC_|SUPABASE|service_role|sb_secret_/i);
});
