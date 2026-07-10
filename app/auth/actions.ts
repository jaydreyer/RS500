"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  clearAuthCookie,
  createPocketBase,
  createSuperuserPocketBase,
  setAuthCookie,
} from "@/lib/auth";
import { getSafeReturnPath } from "@/lib/auth-return";
import { validateSignupInput } from "@/lib/auth-rules";
import { consumeRateLimit, type RateLimitOptions } from "@/lib/rate-limit";
import { getSignupAlbumAssignment } from "@/lib/signup-album-assignment";
import { getIsoWeekKey } from "@/lib/week";

export type AuthFormState = {
  message: string | null;
};

const SIGNUP_RATE_LIMIT: RateLimitOptions = {
  limit: 8,
  windowMs: 15 * 60 * 1000,
};

const LOGIN_RATE_LIMIT: RateLimitOptions = {
  limit: 10,
  windowMs: 10 * 60 * 1000,
};

export async function signupAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const inviteCode = getFormValue(formData, "inviteCode");
  const displayName = getFormValue(formData, "displayName");
  const email = getFormValue(formData, "email").toLowerCase();
  const password = getFormValue(formData, "password");
  const nextPath = getSafeReturnPath(formData.get("next"));

  const rateLimitError = await checkAuthRateLimit("signup", email, SIGNUP_RATE_LIMIT);
  if (rateLimitError) {
    return { message: rateLimitError };
  }

  const validationError = validateSignup({
    inviteCode,
    displayName,
    email,
    password,
  });
  if (validationError) {
    return { message: validationError };
  }

  try {
    const adminPb = await createSuperuserPocketBase();
    const albumAssignment = getSignupAlbumAssignment(email);
    const assignedAlbum = albumAssignment
      ? await adminPb.collection("albums").getFirstListItem(
          adminPb.filter("artist = {:artist} && title = {:title}", albumAssignment),
          { requestKey: null },
        )
      : null;

    const user = await adminPb.collection("users").create(
      {
        email,
        password,
        passwordConfirm: password,
        display_name: displayName,
      },
      { requestKey: null },
    );

    if (assignedAlbum) {
      await adminPb.collection("listens").create(
        {
          user: user.id,
          album: assignedAlbum.id,
          kind: "fresh",
          status: "listening",
          take: "",
          week: getIsoWeekKey(),
        },
        { requestKey: null },
      );
    }

    const userPb = createPocketBase();
    await userPb.collection("users").authWithPassword(email, password, {
      requestKey: null,
    });
    await setAuthCookie(userPb);
  } catch (error) {
    return { message: formatPocketBaseError(error, "Could not create that account.") };
  }

  redirect(nextPath);
}

export async function loginAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = getFormValue(formData, "email").toLowerCase();
  const password = getFormValue(formData, "password");
  const nextPath = getSafeReturnPath(formData.get("next"));

  if (!email || !password) {
    return { message: "Enter your email and password." };
  }

  const rateLimitError = await checkAuthRateLimit("login", email, LOGIN_RATE_LIMIT);
  if (rateLimitError) {
    return { message: rateLimitError };
  }

  try {
    const pb = createPocketBase();
    await pb.collection("users").authWithPassword(email, password, {
      requestKey: null,
    });
    await setAuthCookie(pb);
  } catch (error) {
    return { message: formatPocketBaseError(error, "That login did not work.") };
  }

  redirect(nextPath);
}

export async function logoutAction() {
  await clearAuthCookie();
  redirect("/auth");
}

function validateSignup({
  inviteCode,
  displayName,
  email,
  password,
}: {
  inviteCode: string;
  displayName: string;
  email: string;
  password: string;
}) {
  return validateSignupInput(
    {
      inviteCode,
      displayName,
      email,
      password,
    },
    getCrewInviteCode(),
  );
}

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function formatPocketBaseError(error: unknown, fallback: string) {
  const responseData = getErrorResponseData(error);

  if (responseData && typeof responseData === "object") {
    const fieldMessages = Object.values(responseData)
      .map((detail) => {
        if (detail && typeof detail === "object" && "message" in detail) {
          return String(detail.message);
        }

        return "";
      })
      .filter(Boolean);

    if (fieldMessages.length > 0) {
      return fieldMessages.join(" ");
    }
  }

  return fallback;
}

function getErrorResponseData(error: unknown) {
  if (!error || typeof error !== "object") {
    return null;
  }

  if ("data" in error) {
    const data = error.data;
    if (data && typeof data === "object" && "data" in data) {
      return data.data;
    }
  }

  if ("response" in error) {
    const response = error.response;
    if (response && typeof response === "object" && "data" in response) {
      return response.data;
    }
  }

  return null;
}

function getCrewInviteCode() {
  return process.env.CREW_INVITE_CODE;
}

async function checkAuthRateLimit(scope: "signup" | "login", email: string, options: RateLimitOptions) {
  const identity = await getRequestIdentity();
  const normalizedEmail = email || "missing-email";
  const checks = [
    consumeRateLimit(`${scope}:ip:${identity}`, options),
    consumeRateLimit(`${scope}:email:${normalizedEmail}`, options),
  ];
  const blocked = checks.find((result) => !result.allowed);

  if (!blocked) {
    return null;
  }

  return `Too many attempts. Try again in ${formatRetryAfter(blocked.retryAfterSeconds)}.`;
}

async function getRequestIdentity() {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim();

  return (
    forwardedFor ||
    headerStore.get("x-real-ip")?.trim() ||
    headerStore.get("cf-connecting-ip")?.trim() ||
    "unknown-ip"
  );
}

function formatRetryAfter(seconds: number) {
  const minutes = Math.ceil(seconds / 60);

  if (minutes <= 1) {
    return "about 1 minute";
  }

  return `about ${minutes} minutes`;
}
