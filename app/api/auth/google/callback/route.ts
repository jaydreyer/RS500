import crypto from "node:crypto";

import { NextRequest, NextResponse } from "next/server";
import type PocketBase from "pocketbase";
import type { AuthRecord, RecordModel } from "pocketbase";

import { createAuthCookie, createSuperuserPocketBase, isDeactivatedUserRecord } from "@/lib/auth";
import { shouldUseSecureAuthCookie } from "@/lib/auth-cookie";
import {
  decodeGoogleOAuthState,
  getGoogleOAuthConfig,
  GOOGLE_OAUTH_STATE_COOKIE,
  GOOGLE_TOKEN_URL,
  GOOGLE_USERINFO_URL,
  isExpiredGoogleOAuthState,
  normalizeGoogleUserInfo,
  type GoogleOAuthConfig,
  type GoogleOAuthState,
  type GoogleUserInfo,
} from "@/lib/google-oauth";
import { getSignupAlbumAssignment } from "@/lib/signup-album-assignment";
import { getIsoWeekKey } from "@/lib/week";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type OAuthUserRecord = AuthRecord & {
  google_sub?: unknown;
  verified?: unknown;
};

export async function GET(request: NextRequest) {
  const authError = request.nextUrl.searchParams.get("error");
  if (authError) {
    return redirectToAuth(request, "denied");
  }

  const code = request.nextUrl.searchParams.get("code");
  const returnedState = request.nextUrl.searchParams.get("state");
  const storedState = decodeGoogleOAuthState(request.cookies.get(GOOGLE_OAUTH_STATE_COOKIE)?.value);
  const config = getGoogleOAuthConfig(request.url);

  if (!code || !returnedState || !storedState || !config || isExpiredGoogleOAuthState(storedState)) {
    return redirectToAuth(request, "failed");
  }

  if (storedState.state !== returnedState) {
    return redirectToAuth(request, "failed");
  }

  try {
    const googleUser = await getGoogleUserInfo(config, storedState, code);

    if (!googleUser.emailVerified) {
      return redirectToAuth(request, "unverified");
    }

    const adminPb = await createSuperuserPocketBase();
    const user = await getOrCreateOAuthUser(adminPb, googleUser, storedState);
    const userPb = await adminPb.collection("users").impersonate(user.id, 0, {
      requestKey: null,
    });

    const response = NextResponse.redirect(new URL("/week", request.url), { status: 303 });
    response.cookies.set(
      createAuthCookie(userPb, {
        secure: shouldUseSecureAuthCookie(request.headers),
      }),
    );
    response.cookies.delete({
      name: GOOGLE_OAUTH_STATE_COOKIE,
      path: "/api/auth/google",
    });

    return response;
  } catch (error) {
    return redirectToAuth(request, getOAuthErrorCode(error));
  }
}

async function getGoogleUserInfo(
  config: GoogleOAuthConfig,
  state: GoogleOAuthState,
  code: string,
): Promise<GoogleUserInfo> {
  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      code_verifier: state.codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: config.redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    throw new OAuthCallbackError("failed");
  }

  const tokenData = await tokenResponse.json();
  const accessToken = asString(tokenData.access_token);

  if (!accessToken) {
    throw new OAuthCallbackError("failed");
  }

  const userInfoResponse = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });

  if (!userInfoResponse.ok) {
    throw new OAuthCallbackError("failed");
  }

  const googleUser = normalizeGoogleUserInfo(await userInfoResponse.json());

  if (!googleUser) {
    throw new OAuthCallbackError("failed");
  }

  return googleUser;
}

async function getOrCreateOAuthUser(
  adminPb: PocketBase,
  googleUser: GoogleUserInfo,
  state: GoogleOAuthState,
) {
  const existingUser = await findGoogleUser(adminPb, googleUser);

  if (existingUser) {
    if (isDeactivatedUserRecord(existingUser)) {
      throw new OAuthCallbackError("deactivated");
    }

    return await updateExistingGoogleUser(adminPb, existingUser, googleUser);
  }

  if (state.mode !== "signup") {
    throw new OAuthCallbackError("invite-required");
  }

  return await createGoogleUser(adminPb, googleUser, state);
}

async function findGoogleUser(adminPb: PocketBase, googleUser: GoogleUserInfo) {
  const byGoogleSub = await getFirstUser<OAuthUserRecord>(
    adminPb,
    adminPb.filter("google_sub = {:googleSub}", { googleSub: googleUser.sub }),
  );

  if (byGoogleSub) {
    return byGoogleSub;
  }

  return await getFirstUser<OAuthUserRecord>(
    adminPb,
    adminPb.filter("email = {:email}", { email: googleUser.email }),
  );
}

async function updateExistingGoogleUser(
  adminPb: PocketBase,
  user: OAuthUserRecord,
  googleUser: GoogleUserInfo,
) {
  const userGoogleSub = asString(user.google_sub);

  if (userGoogleSub && userGoogleSub !== googleUser.sub) {
    throw new OAuthCallbackError("account-mismatch");
  }

  const updateData: Record<string, unknown> = {};

  if (!userGoogleSub) {
    updateData.google_sub = googleUser.sub;
  }

  if (user.verified !== true) {
    updateData.verified = true;
  }

  if (Object.keys(updateData).length === 0) {
    return user;
  }

  return await adminPb.collection("users").update<OAuthUserRecord>(user.id, updateData, {
    requestKey: null,
  });
}

async function createGoogleUser(
  adminPb: PocketBase,
  googleUser: GoogleUserInfo,
  state: GoogleOAuthState,
) {
  const password = crypto.randomBytes(32).toString("base64url");
  const displayName = state.displayName || googleUser.name || googleUser.email;
  const assignedAlbum = await getSignupAssignedAlbum(adminPb, googleUser.email);
  const user = await adminPb.collection("users").create<OAuthUserRecord>(
    {
      email: googleUser.email,
      password,
      passwordConfirm: password,
      display_name: displayName,
      google_sub: googleUser.sub,
      verified: true,
    },
    { requestKey: null },
  );

  if (assignedAlbum) {
    await assignSignupAlbum(adminPb, user.id, assignedAlbum.id);
  }

  return user;
}

async function getSignupAssignedAlbum(adminPb: PocketBase, email: string) {
  const albumAssignment = getSignupAlbumAssignment(email);

  if (!albumAssignment) {
    return null;
  }

  return await adminPb.collection("albums").getFirstListItem(
    adminPb.filter("artist = {:artist} && title = {:title}", albumAssignment),
    { requestKey: null },
  );
}

async function assignSignupAlbum(adminPb: PocketBase, userId: string, albumId: string) {
  await adminPb.collection("listens").create(
    {
      user: userId,
      album: albumId,
      kind: "fresh",
      status: "listening",
      take: "",
      week: getIsoWeekKey(),
    },
    { requestKey: null },
  );
}

async function getFirstUser<T extends RecordModel>(adminPb: PocketBase, filter: string) {
  try {
    return await adminPb.collection("users").getFirstListItem<T>(filter, {
      requestKey: null,
    });
  } catch (error) {
    if (getErrorStatus(error) === 404) {
      return null;
    }

    throw error;
  }
}

function redirectToAuth(request: NextRequest, google: string) {
  const url = new URL("/auth", request.url);
  url.searchParams.set("google", google);

  const response = NextResponse.redirect(url, { status: 303 });
  response.cookies.delete({
    name: GOOGLE_OAUTH_STATE_COOKIE,
    path: "/api/auth/google",
  });

  return response;
}

function getOAuthErrorCode(error: unknown) {
  if (error instanceof OAuthCallbackError) {
    return error.code;
  }

  return "failed";
}

function getErrorStatus(error: unknown) {
  if (error && typeof error === "object" && "status" in error && typeof error.status === "number") {
    return error.status;
  }

  return null;
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

class OAuthCallbackError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}
