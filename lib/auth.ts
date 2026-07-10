import "server-only";

import { cookies, headers } from "next/headers";
import PocketBase, { type AuthRecord } from "pocketbase";

import { shouldUseSecureAuthCookie } from "@/lib/auth-cookie";
import { isAdminEmail } from "@/lib/auth-rules";
import {
  createAuthCookie,
  createPocketBase,
  getPocketBaseUrl,
  loadPocketBaseAuthCookie,
  PB_AUTH_COOKIE,
} from "@/lib/auth-session";

export { createAuthCookie, createPocketBase, getPocketBaseUrl, PB_AUTH_COOKIE };

export type ClubUser = {
  id: string;
  email: string;
  displayName: string;
  initials: string;
  avatarUrl: string | null;
  isAdmin: boolean;
};

export const DELETED_MEMBER_DISPLAY_NAME = "Deleted member";

export async function createPocketBaseFromCookie() {
  const pb = createPocketBase();
  const cookieStore = await cookies();
  const authCookie = cookieStore.get(PB_AUTH_COOKIE);
  loadPocketBaseAuthCookie(pb, authCookie?.value);

  return pb;
}

export async function getCurrentUser(): Promise<ClubUser | null> {
  let pb: PocketBase;

  try {
    pb = await createPocketBaseFromCookie();
  } catch {
    return null;
  }

  if (!pb.authStore.isValid) {
    return null;
  }

  try {
    const auth = await pb.collection("users").authRefresh<AuthRecord>({
      requestKey: null,
    });
    if (!auth.record || isDeactivatedUserRecord(auth.record)) {
      pb.authStore.clear();
      return null;
    }

    return mapClubUser(auth.record);
  } catch {
    pb.authStore.clear();
    return null;
  }
}

export async function getAuthenticatedPocketBase() {
  const pb = await createPocketBaseFromCookie();

  if (!pb.authStore.isValid) {
    throw new Error("Unauthorized.");
  }

  const auth = await pb.collection("users").authRefresh<AuthRecord>({
    requestKey: null,
  });
  if (!auth.record) {
    throw new Error("Unauthorized.");
  }
  if (isDeactivatedUserRecord(auth.record)) {
    pb.authStore.clear();
    throw new Error("Unauthorized.");
  }

  return {
    pb,
    user: mapClubUser(auth.record),
  };
}

export async function setAuthCookie(pb: PocketBase) {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const authCookie = createAuthCookie(pb, {
    secure: shouldUseSecureAuthCookie(headerStore),
  });

  cookieStore.set(authCookie);
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(PB_AUTH_COOKIE);
}

export async function createSuperuserPocketBase() {
  const email = process.env.PB_ADMIN_EMAIL;
  const password = process.env.PB_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("Missing PB_ADMIN_EMAIL or PB_ADMIN_PASSWORD.");
  }

  const pb = createPocketBase();
  await pb.collection("_superusers").authWithPassword(email, password, {
    requestKey: null,
  });

  return pb;
}

export function mapClubUser(record: NonNullable<AuthRecord>): ClubUser {
  const displayName = getClubUserDisplayName(record);
  const email = asString(record.email);

  return {
    id: record.id,
    email,
    displayName,
    initials: getClubUserInitials(record),
    avatarUrl: getClubUserAvatarUrl(record),
    isAdmin: isAdminEmail(email, process.env.PB_ADMIN_EMAIL),
  };
}

export function getClubUserAvatarUrl(record: { id: string; [key: string]: unknown }) {
  if (isDeactivatedUserRecord(record)) {
    return null;
  }

  const filename = asString(record.avatar);

  if (!filename) {
    return null;
  }

  const collection = asString(record.collectionName) || asString(record.collectionId) || "users";
  const baseUrl = getPocketBaseUrl().replace(/\/$/, "");

  return `${baseUrl}/api/files/${encodeURIComponent(collection)}/${encodeURIComponent(record.id)}/${encodeURIComponent(filename)}?thumb=96x96`;
}

export function getClubUserDisplayName(record: { [key: string]: unknown }) {
  if (isDeactivatedUserRecord(record)) {
    return DELETED_MEMBER_DISPLAY_NAME;
  }

  return asString(record.display_name) || asString(record.name) || asString(record.email) || "Crew";
}

export function getClubUserInitials(record: { [key: string]: unknown }) {
  if (isDeactivatedUserRecord(record)) {
    return "DM";
  }

  return getInitials(getClubUserDisplayName(record) || asString(record.email));
}

export function isDeactivatedUserRecord(record: { [key: string]: unknown }) {
  return Boolean(asString(record.deactivated_at));
}

function getInitials(value: string) {
  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "??";
  }

  return parts.map((part) => part[0]?.toUpperCase()).join("");
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
