import { NextRequest, NextResponse } from "next/server";

import { shouldUseSecureAuthCookie } from "@/lib/auth-cookie";
import { createAuthCookie, createPocketBase, getPocketBaseUrl } from "@/lib/auth";

export const dynamic = "force-dynamic";

const DEV_USER_PASSWORD = "spin500-dev";

const DEV_USERS = {
  maya: "maya.dev@example.com",
  ben: "ben.dev@example.com",
  lena: "lena.dev@example.com",
  omar: "omar.dev@example.com",
  ivy: "ivy.dev@example.com",
  nate: "nate.dev@example.com",
  zoe: "zoe.dev@example.com",
  eli: "eli.dev@example.com",
  rhea: "rhea.dev@example.com",
  sam: "sam.dev@example.com",
  jules: "jules.dev@example.com",
  tess: "tess.dev@example.com",
} as const;

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export async function GET(request: NextRequest) {
  if (!isDevLoginAllowed(request)) {
    return new NextResponse("Not found.", { status: 404 });
  }

  const email = getDevUserEmail(request);
  if (!email) {
    return NextResponse.json(
      {
        message: `Unknown dev user. Use one of: ${Object.keys(DEV_USERS).join(", ")}.`,
      },
      { status: 400 },
    );
  }

  const pb = createPocketBase();
  await pb.collection("users").authWithPassword(email, DEV_USER_PASSWORD, {
    requestKey: null,
  });

  const response = NextResponse.redirect(new URL(getSafeNextPath(request), request.url));
  response.cookies.set(
    createAuthCookie(pb, {
      secure: shouldUseSecureAuthCookie(request.headers),
    }),
  );

  return response;
}

function isDevLoginAllowed(request: NextRequest) {
  return (
    process.env.ENABLE_DEV_LOGIN === "1" &&
    process.env.NODE_ENV !== "production" &&
    isLocalHost(request.nextUrl.hostname) &&
    isLocalPocketBaseUrl()
  );
}

function getDevUserEmail(request: NextRequest) {
  const user = request.nextUrl.searchParams.get("user")?.trim().toLowerCase() || "maya";

  if (user in DEV_USERS) {
    return DEV_USERS[user as keyof typeof DEV_USERS];
  }

  const email = request.nextUrl.searchParams.get("email")?.trim().toLowerCase();
  if (email && Object.values(DEV_USERS).includes(email as (typeof DEV_USERS)[keyof typeof DEV_USERS])) {
    return email;
  }

  return null;
}

function getSafeNextPath(request: NextRequest) {
  const nextPath = request.nextUrl.searchParams.get("next")?.trim();

  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "/week";
  }

  return nextPath;
}

function isLocalPocketBaseUrl() {
  try {
    const url = new URL(getPocketBaseUrl());
    return url.protocol === "http:" && isLocalHost(url.hostname);
  } catch {
    return false;
  }
}

function isLocalHost(hostname: string) {
  return LOCAL_HOSTS.has(hostname);
}
