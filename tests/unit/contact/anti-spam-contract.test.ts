import assert from "node:assert/strict";
import test from "node:test";
import { executeContactSubmission } from "../../../lib/contact/contact-action-core.ts";
import { validateContactRequest } from "../../../netlify/edge-functions/validate-contact.ts";

const SUBMISSION_ID = "123e4567-e89b-42d3-a456-426614174000";

function botForm() {
  const formData = new FormData();
  formData.set("submission-id", SUBMISSION_ID);
  formData.set("name", "Robot discret");
  formData.set("phone", "");
  formData.set("email", "robot@example.com");
  formData.set("message", "Ce message remplit le champ leurre.");
  formData.set("bot-field", "https://spam.example/");
  return formData;
}

test("a filled honeypot is forwarded by the action without revealing detection", async () => {
  const state = await executeContactSubmission(botForm());
  assert.equal(state.phase, "authorized");
  if (state.phase !== "authorized") assert.fail("expected an authorized state");
  assert.equal(state.submission.botField, "https://spam.example/");
  assert.equal("errorKind" in state, false);
});

test("the Edge guard forwards a filled honeypot without 422 or diagnostic response", async () => {
  const body = new URLSearchParams({
    "form-name": "contact",
    "submission-id": SUBMISSION_ID,
    name: "Robot discret",
    phone: "",
    email: "robot@example.com",
    message: "Ce message remplit le champ leurre.",
    "bot-field": "https://spam.example/",
  });
  const request = new Request("https://deploy-preview-5--knails.netlify.app/__forms.html", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body,
  });
  let nextCalls = 0;
  let forwardedRequest: Request | undefined;

  const response = await validateContactRequest(request, async (forwarded) => {
    nextCalls += 1;
    forwardedRequest = forwarded;
    return new Response(null, { status: 204 });
  });

  assert.equal(response.status, 204);
  assert.equal(nextCalls, 1);
  assert.equal(forwardedRequest, request, "the native Netlify spam filter must receive the original request");
  assert.equal(await response.text(), "");
});

test("a non-contact Server Action POST passes through the Edge guard unchanged", async () => {
  const request = new Request("https://deploy-preview-5--knails.netlify.app/contact", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: new URLSearchParams({
      "submission-id": SUBMISSION_ID,
      name: "Jeanne Martin",
      email: "jeanne@example.com",
      message: "Un message suffisamment long",
      "bot-field": "",
    }),
  });
  let forwardedRequest: Request | undefined;

  const response = await validateContactRequest(request, async (forwarded) => {
    forwardedRequest = forwarded;
    return new Response(null, { status: 204 });
  });

  assert.equal(response.status, 204);
  assert.equal(forwardedRequest, request);
});
