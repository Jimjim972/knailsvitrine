import { NextResponse, type NextRequest } from "next/server";
import { refreshAdminRequest } from "./lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const refreshed = await refreshAdminRequest(request);
  const pathname = request.nextUrl.pathname;
  const isPublicAdminPage =
    pathname === "/admin/connexion" || pathname === "/admin/deconnexion";
  const isDocumentRequest = request.method === "GET" || request.method === "HEAD";

  if (isDocumentRequest && refreshed.identityStatus === "missing" && !isPublicAdminPage) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/admin/connexion";
    loginUrl.search = "";
    loginUrl.searchParams.set("returnTo", `${pathname}${request.nextUrl.search}`);
    if (refreshed.hadAuthCookie) loginUrl.searchParams.set("session", "expired");
    return refreshed.applyAuthState(NextResponse.redirect(loginUrl));
  }

  return refreshed.response;
}

export const config = {
  matcher: "/admin/:path*",
};
