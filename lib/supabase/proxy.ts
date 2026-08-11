import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { CookieOptions } from "@supabase/ssr";
import type { Database } from "./database.types";
import { getPublicSupabaseEnv } from "./env";
import { fetchWithSupabaseTimeout } from "./fetch-with-timeout";
import {
  createServiceSuccessConsumedMarker,
  getServiceSuccessFlashSecret,
  SERVICE_SUCCESS_FLASH_CONSUMED_COOKIE,
  SERVICE_SUCCESS_FLASH_COOKIE,
  SERVICE_SUCCESS_FLASH_GUARD_COOKIE,
  SERVICE_SUCCESS_FLASH_HEADER,
  serviceSuccessCookieOptions,
  verifyServiceSuccessFlash,
} from "../services/success-flash";

type CookieMutation = {
  name: string;
  value: string;
  options: CookieOptions;
};

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
  Expires: "0",
  Pragma: "no-cache",
} as const;

export type RefreshedAdminRequest = {
  identityStatus: "validated" | "missing" | "unavailable";
  hadAuthCookie: boolean;
  response: NextResponse;
  applyAuthState: (target: NextResponse) => NextResponse;
};

export async function refreshAdminRequest(
  request: NextRequest,
): Promise<RefreshedAdminRequest> {
  const { url, publishableKey } = getPublicSupabaseEnv();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(SERVICE_SUCCESS_FLASH_HEADER);
  const secret = getServiceSuccessFlashSecret();
  const consumedMarker = request.cookies.get(SERVICE_SUCCESS_FLASH_CONSUMED_COOKIE)?.value;
  const successFlash = request.method === "GET" && request.nextUrl.pathname === "/admin/prestations" && secret
    ? verifyServiceSuccessFlash({
      token: request.cookies.get(SERVICE_SUCCESS_FLASH_COOKIE)?.value,
      guard: request.cookies.get(SERVICE_SUCCESS_FLASH_GUARD_COOKIE)?.value,
      consumedMarker,
      secret,
    })
    : null;
  if (successFlash) requestHeaders.set(SERVICE_SUCCESS_FLASH_HEADER, successFlash.kind);
  let response = NextResponse.next({ request: { headers: requestHeaders } });
  const cookieMutations = new Map<string, CookieMutation>();
  const responseHeaders = new Map<string, string>(Object.entries(PRIVATE_HEADERS));

  const applyAuthState = (target: NextResponse) => {
    for (const cookie of cookieMutations.values()) {
      target.cookies.set(cookie.name, cookie.value, cookie.options);
    }
    for (const [name, value] of responseHeaders) target.headers.set(name, value);
    return target;
  };

  const supabase = createServerClient<Database>(url, publishableKey, {
    global: { fetch: fetchWithSupabaseTimeout },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        for (const cookie of cookiesToSet) {
          cookieMutations.set(cookie.name, cookie);
        }
        for (const [name, value] of Object.entries(headers)) {
          responseHeaders.set(name, value);
        }
      },
    },
  });

  const hasAuthCookie = request.cookies
    .getAll()
    .some(({ name }) => /^sb-.+-auth-token(?:\.\d+)?$/.test(name));
  let identityStatus: RefreshedAdminRequest["identityStatus"] = "missing";
  let claimCheckCompleted = false;
  try {
    const { data, error } = await supabase.auth.getClaims();
    const subject = data?.claims?.sub;
    claimCheckCompleted = !error;
    identityStatus = error
      ? hasAuthCookie
        ? "unavailable"
        : "missing"
      : typeof subject === "string" && subject.length > 0
        ? "validated"
        : "missing";
  } catch {
    identityStatus = hasAuthCookie ? "unavailable" : "missing";
  }

  if (!claimCheckCompleted) {
    cookieMutations.clear();
  } else {
    for (const cookie of cookieMutations.values()) {
      request.cookies.set(cookie.name, cookie.value);
    }
    response = NextResponse.next({ request: { headers: requestHeaders } });
  }

  const consumesSuccess = request.method === "GET" && request.nextUrl.pathname === "/admin/prestations";
  if (consumesSuccess && (request.cookies.has(SERVICE_SUCCESS_FLASH_COOKIE) || request.cookies.has(SERVICE_SUCCESS_FLASH_GUARD_COOKIE))) {
    const expiredOptions = { ...serviceSuccessCookieOptions(0), expires: new Date(0) };
    cookieMutations.set(SERVICE_SUCCESS_FLASH_COOKIE, { name: SERVICE_SUCCESS_FLASH_COOKIE, value: "", options: expiredOptions });
    cookieMutations.set(SERVICE_SUCCESS_FLASH_GUARD_COOKIE, { name: SERVICE_SUCCESS_FLASH_GUARD_COOKIE, value: "", options: expiredOptions });
  }
  if (consumesSuccess && successFlash && secret) {
    cookieMutations.set(SERVICE_SUCCESS_FLASH_CONSUMED_COOKIE, {
      name: SERVICE_SUCCESS_FLASH_CONSUMED_COOKIE,
      value: createServiceSuccessConsumedMarker(successFlash.nonce, secret, { consumedMarker }),
      options: serviceSuccessCookieOptions(),
    });
  }
  response = applyAuthState(response);

  return {
    identityStatus,
    hadAuthCookie: hasAuthCookie,
    response,
    applyAuthState,
  };
}
