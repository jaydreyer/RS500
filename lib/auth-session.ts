import PocketBase, { getTokenPayload } from "pocketbase";

import { shouldUseSecureAuthCookie } from "@/lib/auth-cookie";

export const PB_AUTH_COOKIE = "pb_auth";
export const AUTH_SESSION_DAYS = 30;

export function getPocketBaseUrl() {
  const url = process.env.NEXT_PUBLIC_PB_URL;
  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_PB_URL.");
  }

  return url;
}

export function createPocketBase() {
  const pb = new PocketBase(getPocketBaseUrl());
  pb.autoCancellation(false);
  return pb;
}

export function loadPocketBaseAuthCookie(pb: PocketBase, value: string | undefined) {
  if (value) {
    pb.authStore.loadFromCookie(`${PB_AUTH_COOKIE}=${value}`, PB_AUTH_COOKIE);
  }
}

export function createAuthCookie(pb: PocketBase, options: { secure?: boolean } = {}) {
  const token = pb.authStore.token;
  const record = pb.authStore.record;

  if (!token || !record) {
    throw new Error("PocketBase auth store is empty.");
  }

  const expires = getTokenExpires(token);

  return {
    name: PB_AUTH_COOKIE,
    value: encodeURIComponent(JSON.stringify({ token, record })),
    httpOnly: true,
    secure: options.secure ?? shouldUseSecureAuthCookie(),
    sameSite: "lax",
    path: "/",
    ...(expires
      ? { expires }
      : { maxAge: 60 * 60 * 24 * AUTH_SESSION_DAYS }),
  } as const;
}

function getTokenExpires(token: string) {
  try {
    const payload = getTokenPayload(token);
    if (typeof payload.exp !== "number") {
      return null;
    }

    return new Date(payload.exp * 1000);
  } catch {
    return null;
  }
}
