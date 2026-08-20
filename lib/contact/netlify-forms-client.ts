import {
  CONTACT_FORM_ENDPOINT,
  CONTACT_FORM_NAME,
  CONTACT_SUBMISSION_TIMEOUT_MS,
} from "./constants.ts";
import type {
  ContactErrorKind,
  NormalizedContactSubmission,
} from "../validations/contact.ts";

export type ContactProviderResult =
  | { ok: true }
  | {
      ok: false;
      errorKind: Extract<ContactErrorKind, "network" | "timeout" | "provider">;
    };

type TimerHandle = ReturnType<typeof setTimeout>;

type TransportDependencies = {
  fetchImpl?: typeof fetch;
  setTimeoutImpl?: (callback: () => void, delay: number) => TimerHandle;
  clearTimeoutImpl?: (handle: TimerHandle) => void;
};

export async function submitContactToNetlify(
  submission: NormalizedContactSubmission,
  dependencies: TransportDependencies = {},
): Promise<ContactProviderResult> {
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const setTimeoutImpl = dependencies.setTimeoutImpl ?? setTimeout;
  const clearTimeoutImpl = dependencies.clearTimeoutImpl ?? clearTimeout;
  const controller = new AbortController();
  let didTimeout = false;

  const timeoutHandle = setTimeoutImpl(() => {
    didTimeout = true;
    controller.abort();
  }, CONTACT_SUBMISSION_TIMEOUT_MS);

  const body = new URLSearchParams({
    "form-name": CONTACT_FORM_NAME,
    "submission-id": submission.submissionId,
    name: submission.name,
    phone: submission.phone,
    email: submission.email,
    message: submission.message,
    "bot-field": submission.botField,
  });

  try {
    const response = await fetchImpl(CONTACT_FORM_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body: body.toString(),
      cache: "no-store",
      credentials: "omit",
      redirect: "manual",
      signal: controller.signal,
    });

    return response.ok ? { ok: true } : { ok: false, errorKind: "provider" };
  } catch {
    return {
      ok: false,
      errorKind: didTimeout ? "timeout" : "network",
    };
  } finally {
    clearTimeoutImpl(timeoutHandle);
  }
}
