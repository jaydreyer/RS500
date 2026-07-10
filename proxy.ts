import { NextRequest, NextResponse } from "next/server";

import { shouldUseSecureAuthCookie } from "@/lib/auth-cookie";
import {
  createAuthCookie,
  createPocketBase,
  loadPocketBaseAuthCookie,
  PB_AUTH_COOKIE,
} from "@/lib/auth-session";

export async function proxy(request: NextRequest) {
  const value = request.cookies.get(PB_AUTH_COOKIE)?.value;
  if (!value) {
    return NextResponse.next();
  }

  const pb = createPocketBase();
  loadPocketBaseAuthCookie(pb, value);

  if (!pb.authStore.isValid) {
    return clearExpiredSession(request);
  }

  try {
    await pb.collection("users").authRefresh({ requestKey: null });

    const authCookie = createAuthCookie(pb, {
      secure: shouldUseSecureAuthCookie(request.headers),
    });
    request.cookies.set(authCookie.name, authCookie.value);

    const response = NextResponse.next({ request });
    response.cookies.set(authCookie);
    return response;
  } catch {
    return clearExpiredSession(request);
  }
}

function clearExpiredSession(request: NextRequest) {
  request.cookies.delete(PB_AUTH_COOKIE);
  const response = NextResponse.next({ request });
  response.cookies.delete(PB_AUTH_COOKIE);
  return response;
}

export const config = {
  matcher: [
    "/((?!api/auth|api/dev|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
