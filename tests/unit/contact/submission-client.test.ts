import assert from "node:assert/strict";
import test from "node:test";
import { CONTACT_SUBMISSION_TIMEOUT_MS } from "../../../lib/contact/constants.ts";
import { submitContactToNetlify } from "../../../lib/contact/netlify-forms-client.ts";
import type { NormalizedContactSubmission } from "../../../lib/validations/contact.ts";

const SUBMISSION: NormalizedContactSubmission = {
  submissionId: "123e4567-e89b-42d3-a456-426614174000",
  name: "Jeanne Martin",
  phone: "+596 696 12 34 56",
  email: "jeanne@example.com",
  message: "Bonjour, je souhaite obtenir des renseignements.",
  botField: "",
};

test("the browser transport posts the exact URL-encoded contract to a fixed relative target", async () => {
  let capturedInput: string | URL | Request = "";
  let capturedInit: RequestInit | undefined;
  const result = await submitContactToNetlify(SUBMISSION, {
    fetchImpl: async (input, init) => {
      capturedInput = input;
      capturedInit = init;
      return new Response(null, { status: 204 });
    },
  });

  assert.deepEqual(result, { ok: true });
  assert.equal(String(capturedInput), "/__forms.html");
  assert.equal(capturedInit?.method, "POST");
  assert.equal(capturedInit?.cache, "no-store");
  assert.equal(capturedInit?.redirect, "manual");
  assert.equal(capturedInit?.credentials, "omit");
  assert.match(new Headers(capturedInit?.headers).get("content-type") ?? "", /^application\/x-www-form-urlencoded/i);
  assert.deepEqual(Object.fromEntries(new URLSearchParams(String(capturedInit?.body))), {
    "form-name": "contact",
    "submission-id": SUBMISSION.submissionId,
    name: SUBMISSION.name,
    phone: SUBMISSION.phone,
    email: SUBMISSION.email,
    message: SUBMISSION.message,
    "bot-field": "",
  });
});

test("only 2xx is accepted and failures remain closed without retry", async () => {
  const scenarios = [
    { label: "redirect", response: () => new Response(null, { status: 302 }), errorKind: "provider" },
    { label: "provider", response: () => new Response("RAW_PROVIDER_BODY", { status: 503 }), errorKind: "provider" },
    { label: "network", response: () => Promise.reject(new Error("RAW_NETWORK_DETAIL")), errorKind: "network" },
  ] as const;

  for (const scenario of scenarios) {
    let calls = 0;
    const result = await submitContactToNetlify(SUBMISSION, {
      fetchImpl: async () => {
        calls += 1;
        return scenario.response();
      },
    });
    assert.deepEqual(result, { ok: false, errorKind: scenario.errorKind }, scenario.label);
    assert.equal(calls, 1, scenario.label);
    assert.equal(JSON.stringify(result).includes("RAW_"), false);
  }
});

test("the browser fetch aborts at the unique 10 000 ms deadline", async () => {
  let scheduledDelay = -1;
  let timeoutCallback: (() => void) | undefined;
  let fetchCalls = 0;
  let markFetchStarted: (() => void) | undefined;
  const fetchStarted = new Promise<void>((resolve) => { markFetchStarted = resolve; });

  const operation = submitContactToNetlify(SUBMISSION, {
    fetchImpl: async (_input, init) => {
      fetchCalls += 1;
      markFetchStarted?.();
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("RAW_ABORT_DETAIL", "AbortError"));
        }, { once: true });
      });
    },
    setTimeoutImpl: (callback, delay) => {
      scheduledDelay = delay;
      timeoutCallback = callback;
      return 1 as unknown as ReturnType<typeof setTimeout>;
    },
    clearTimeoutImpl: () => undefined,
  });

  await fetchStarted;
  assert.equal(CONTACT_SUBMISSION_TIMEOUT_MS, 10_000);
  assert.equal(scheduledDelay, 10_000);
  assert.equal(await Promise.race([operation.then(() => "settled"), Promise.resolve("pending")]), "pending");
  assert.ok(timeoutCallback);
  timeoutCallback();
  assert.deepEqual(await operation, { ok: false, errorKind: "timeout" });
  assert.equal(fetchCalls, 1);
});
