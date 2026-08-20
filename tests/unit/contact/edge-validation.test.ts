import assert from "node:assert/strict";
import test from "node:test";
import { validateContactRequest } from "../../../netlify/edge-functions/validate-contact.ts";

const validFields = {
  "form-name": "contact",
  "submission-id": "00000000-0000-4000-8000-000000000001",
  name: "  Marie Dupont  ",
  phone: "  +596 696 12 34 56  ",
  email: "  marie@example.com  ",
  message: "  Bonjour, je souhaite obtenir des informations.  ",
  "bot-field": "",
};

function urlEncodedRequest(path = "/__forms.html", patch: Record<string, string> = {}) {
  return new Request(`https://knails.example${path}`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", "content-length": "999" },
    body: new URLSearchParams({ ...validFields, ...patch }),
  });
}

function captureNext() {
  const calls: Array<Request | undefined> = [];
  return {
    calls,
    next: async (request?: Request) => {
      calls.push(request);
      return new Response(null, { status: 204 });
    },
  };
}

test("laisse un POST Next/non-contact intact et sans lire son corps", async () => {
  const request = new Request("https://knails.example/contact", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ "$ACTION_ID": "opaque", name: "Marie" }),
  });
  const spy = captureNext();
  const response = await validateContactRequest(request, spy.next);

  assert.equal(response.status, 204);
  assert.equal(spy.calls[0], request);
  assert.equal(await request.text(), "%24ACTION_ID=opaque&name=Marie");
});

test("laisse un Server Action multipart intact avant toute lecture Edge", async () => {
  const formData = new FormData();
  formData.set("$ACTION_ID", "opaque");
  formData.set("name", "Marie");
  const request = new Request("https://knails.example/contact", {
    method: "POST",
    headers: { "next-action": "opaque-action-id" },
    body: formData,
  });
  const spy = captureNext();

  const response = await validateContactRequest(request, spy.next);

  assert.equal(response.status, 204);
  assert.equal(spy.calls[0], request);
  const untouched = await request.formData();
  assert.equal(untouched.get("$ACTION_ID"), "opaque");
  assert.equal(untouched.get("name"), "Marie");
});

test("normalise un contact URL-encoded et reconstruit une Request consommable", async () => {
  const spy = captureNext();
  const response = await validateContactRequest(urlEncodedRequest(), spy.next);

  assert.equal(response.status, 204);
  assert.equal(spy.calls.length, 1);
  const forwarded = spy.calls[0];
  assert.ok(forwarded);
  assert.match(forwarded.headers.get("content-type") ?? "", /^application\/x-www-form-urlencoded/);
  assert.equal(forwarded.headers.has("content-length"), false);
  const body = new URLSearchParams(await forwarded.text());
  assert.equal(body.get("form-name"), "contact");
  assert.equal(body.get("name"), "Marie Dupont");
  assert.equal(body.get("phone"), "+596 696 12 34 56");
  assert.equal(body.get("email"), "marie@example.com");
  assert.equal(body.get("message"), "Bonjour, je souhaite obtenir des informations.");
});

test("normalise aussi un contact multipart sur un chemin alternatif", async () => {
  const formData = new FormData();
  for (const [key, value] of Object.entries(validFields)) formData.set(key, value);
  const request = new Request("https://knails.example/autre-chemin", { method: "POST", body: formData });
  const spy = captureNext();

  const response = await validateContactRequest(request, spy.next);
  assert.equal(response.status, 204);
  assert.equal(new URLSearchParams(await spy.calls[0]?.text()).get("name"), "Marie Dupont");
});

test("refuse en 422 une charge contact invalide sans exposer les valeurs", async () => {
  const secret = "message-secret-neuf";
  const spy = captureNext();
  const response = await validateContactRequest(urlEncodedRequest("/", {
    email: "adresse-invalide",
    message: secret,
  }), spy.next);

  assert.equal(response.status, 422);
  assert.equal(spy.calls.length, 0);
  assert.match(response.headers.get("content-type") ?? "", /application\/json/);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.doesNotMatch(await response.text(), /adresse-invalide|message-secret|Zod|stack/i);
});

test("refuse en 415 un contact détectable avec un média non pris en charge", async () => {
  const spy = captureNext();
  const response = await validateContactRequest(new Request("https://knails.example/__forms.html", {
    method: "POST",
    headers: { "content-type": "application/json", "x-netlify-form-name": "contact" },
    body: JSON.stringify({ "form-name": "contact" }),
  }), spy.next);

  assert.equal(response.status, 415);
  assert.equal(spy.calls.length, 0);
  assert.doesNotMatch(await response.text(), /application\/json|form-name/i);
});

test("transmet silencieusement le honeypot rempli sans diagnostic révélateur", async () => {
  const spy = captureNext();
  const response = await validateContactRequest(urlEncodedRequest("/__forms.html", {
    "bot-field": "robot",
    email: "invalide",
  }), spy.next);

  assert.equal(response.status, 204);
  assert.equal(spy.calls.length, 1);
  assert.ok(spy.calls[0]);
  assert.equal(new URLSearchParams(await spy.calls[0]?.text()).get("bot-field"), "robot");
});
