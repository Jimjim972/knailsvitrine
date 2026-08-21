import type { Config, Context } from "@netlify/edge-functions";
import { validateContactProviderValues } from "../../lib/validations/contact.ts";
import {
  CONTACT_FORM_NAMES,
  contactFormNameForNetlifyContext,
  type ContactFormName,
} from "../../lib/contact/constants.ts";

type NextRequest = (request?: Request) => Promise<Response>;

const SUPPORTED_MEDIA_TYPES = new Set([
  "application/x-www-form-urlencoded",
  "multipart/form-data",
]);

const providerFieldNames = [
  "form-name",
  "submission-id",
  "name",
  "phone",
  "email",
  "message",
  "bot-field",
] as const;

function closedError(status: 415 | 422): Response {
  return Response.json(
    { error: "La demande ne peut pas être traitée." },
    {
      status,
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}

function mediaType(request: Request): string {
  return request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() ?? "";
}

function hasDetectableContactDeclaration(request: Request): boolean {
  const url = new URL(request.url);
  const queryName = url.searchParams.get("form-name");
  const headerName = request.headers.get("x-netlify-form-name");
  return CONTACT_FORM_NAMES.some((name) => queryName === name || headerName === name);
}

function hasDuplicateOrFile(formData: FormData, fieldName: string): boolean {
  const values = formData.getAll(fieldName);
  return values.length > 1 || values.some((value) => typeof value !== "string");
}

function providerRecord(formData: FormData): Record<string, unknown> {
  return Object.fromEntries(providerFieldNames.map((fieldName) => [
    fieldName,
    formData.get(fieldName) ?? "",
  ]));
}

function normalizedProviderBody(data: {
  submissionId: string;
  name: string;
  phone: string;
  email: string;
  message: string;
  botField: string;
}, formName: ContactFormName): URLSearchParams {
  return new URLSearchParams({
    "form-name": formName,
    "submission-id": data.submissionId,
    name: data.name,
    phone: data.phone,
    email: data.email,
    message: data.message,
    "bot-field": data.botField,
  });
}

export async function validateContactRequest(
  request: Request,
  next: NextRequest,
  rawDeploymentContext = "production",
): Promise<Response> {
  if (request.method !== "POST") return next(request);

  // Netlify's Edge runtime can truncate a streamed multipart Server Action
  // even when only a clone is parsed. A request carrying Next's action header
  // is routed to the framework handler, not Netlify Forms, so it must remain
  // byte-for-byte untouched. Provider POSTs never carry this header and are
  // still parsed and revalidated below on every path.
  if (request.headers.has("next-action")) return next(request);

  if (!SUPPORTED_MEDIA_TYPES.has(mediaType(request))) {
    return hasDetectableContactDeclaration(request) ? closedError(415) : next(request);
  }

  let formData: FormData;
  try {
    formData = await request.clone().formData();
  } catch {
    return hasDetectableContactDeclaration(request) ? closedError(422) : next(request);
  }

  const formNames = formData.getAll("form-name");
  const declaresContact = formNames.some((value) =>
    typeof value === "string" && CONTACT_FORM_NAMES.includes(value as ContactFormName)
  );
  if (!declaresContact) return next(request);

  if (formNames.length !== 1 || typeof formNames[0] !== "string") return closedError(422);
  const allowedFormName = contactFormNameForNetlifyContext(rawDeploymentContext);
  if (!allowedFormName || formNames[0] !== allowedFormName) return closedError(422);

  const botValues = formData.getAll("bot-field");
  if (botValues.length === 1 && typeof botValues[0] === "string" && botValues[0].trim() !== "") {
    return next(request);
  }

  if (providerFieldNames.some((fieldName) => hasDuplicateOrFile(formData, fieldName))) {
    return closedError(422);
  }

  const parsed = validateContactProviderValues(providerRecord(formData), allowedFormName);
  if (!parsed.success) return closedError(422);

  const headers = new Headers(request.headers);
  headers.delete("content-length");
  headers.set("content-type", "application/x-www-form-urlencoded;charset=UTF-8");

  const forwardedRequest = new Request(request, {
    body: normalizedProviderBody(parsed.data, allowedFormName),
    headers,
  });
  return next(forwardedRequest);
}

export default function validateContact(
  request: Request,
  context: Context,
): Promise<Response> {
  return validateContactRequest(
    request,
    (nextRequest) => nextRequest ? context.next(nextRequest) : context.next(),
    context.deploy.context,
  );
}

// `method` is supported by inline Edge configuration. The matching TOML
// declaration fixes the function order; Netlify merges both declarations.
export const config = {
  path: "/*",
  method: "POST",
} satisfies Config;
