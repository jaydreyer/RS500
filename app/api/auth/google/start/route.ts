import { NextRequest, NextResponse } from "next/server";

import { shouldUseSecureAuthCookie } from "@/lib/auth-cookie";
import { validateInviteProfileInput } from "@/lib/auth-rules";
import {
  createGoogleOAuthState,
  encodeGoogleOAuthState,
  getGoogleOAuthConfig,
  getGoogleOAuthMode,
  GOOGLE_OAUTH_STATE_COOKIE,
  buildGoogleAuthorizationUrl,
} from "@/lib/google-oauth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const config = getGoogleOAuthConfig(request.url);

  if (!config) {
    return redirectToAuth(request, "missing-config");
  }

  const formData = await request.formData();
  const mode = getGoogleOAuthMode(formData.get("mode"));
  const displayName = getFormValue(formData, "displayName");

  if (mode === "signup") {
    const validationError = validateInviteProfileInput(
      {
        inviteCode: getFormValue(formData, "inviteCode"),
        displayName,
      },
      process.env.CREW_INVITE_CODE,
    );

    if (validationError) {
      return redirectToAuth(request, "invite");
    }
  }

  const state = createGoogleOAuthState(mode, displayName);
  const response = NextResponse.redirect(buildGoogleAuthorizationUrl(config, state), {
    status: 303,
  });

  response.cookies.set({
    name: GOOGLE_OAUTH_STATE_COOKIE,
    value: encodeGoogleOAuthState(state),
    httpOnly: true,
    secure: shouldUseSecureAuthCookie(request.headers),
    sameSite: "lax",
    path: "/api/auth/google",
    maxAge: 10 * 60,
  });

  return response;
}

function redirectToAuth(request: NextRequest, google: string) {
  const url = new URL("/auth", request.url);
  url.searchParams.set("google", google);

  return NextResponse.redirect(url, { status: 303 });
}

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}
