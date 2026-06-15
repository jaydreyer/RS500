"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { consumeUserActionLimit } from "@/lib/action-rate-limit";
import {
  clearAuthCookie,
  createSuperuserPocketBase,
  getAuthenticatedPocketBase,
} from "@/lib/auth";
import { validateDisplayName } from "@/lib/auth-rules";

const AVATAR_MAX_SIZE = 5 * 1024 * 1024;
const AVATAR_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const PROFILE_UPDATE_RATE_LIMIT = {
  limit: 10,
  windowMs: 15 * 60 * 1000,
};
const AVATAR_UPLOAD_RATE_LIMIT = {
  limit: 4,
  windowMs: 60 * 60 * 1000,
};
const ACCOUNT_DEACTIVATION_CONFIRMATION = "DELETE";

export async function updateProfileAction(formData: FormData) {
  const displayName = getFormValue(formData, "displayName");
  const removeAvatar = formData.get("removeAvatar") === "on";
  const avatar = getFileValue(formData, "avatar");

  const displayNameError = validateDisplayName(displayName);
  if (displayNameError) {
    redirectWithError(displayNameError);
  }

  if (avatar && !AVATAR_MIME_TYPES.has(avatar.type)) {
    redirectWithError("Avatar must be a JPG, PNG, WebP, or GIF.");
  }

  if (avatar && avatar.size > AVATAR_MAX_SIZE) {
    redirectWithError("Avatar must be 5 MB or smaller.");
  }

  let auth: Awaited<ReturnType<typeof getAuthenticatedPocketBase>>;

  try {
    auth = await getAuthenticatedPocketBase();
  } catch (error) {
    redirectWithError(formatProfileError(error));
  }

  const profileLimitError = consumeUserActionLimit(
    "profile:update",
    auth.user.id,
    PROFILE_UPDATE_RATE_LIMIT,
  );
  if (profileLimitError) {
    redirectWithError(profileLimitError);
  }

  if (avatar) {
    const avatarLimitError = consumeUserActionLimit(
      "profile:avatar",
      auth.user.id,
      AVATAR_UPLOAD_RATE_LIMIT,
    );
    if (avatarLimitError) {
      redirectWithError(avatarLimitError);
    }
  }

  try {
    const payload: Record<string, File | string | null> = {
      display_name: displayName,
    };

    if (avatar) {
      payload.avatar = avatar;
    } else if (removeAvatar) {
      payload.avatar = null;
    }

    await auth.pb.collection("users").update(auth.user.id, payload, { requestKey: null });
  } catch (error) {
    redirectWithError(formatProfileError(error));
  }

  revalidatePath("/settings");
  redirect("/settings?saved=1");
}

export async function deactivateAccountAction(formData: FormData) {
  const confirmation = getFormValue(formData, "confirmation");
  if (confirmation !== ACCOUNT_DEACTIVATION_CONFIRMATION) {
    redirectWithError(`Type ${ACCOUNT_DEACTIVATION_CONFIRMATION} to deactivate your account.`);
  }

  let auth: Awaited<ReturnType<typeof getAuthenticatedPocketBase>>;

  try {
    auth = await getAuthenticatedPocketBase();
  } catch (error) {
    redirectWithError(formatProfileError(error));
  }

  const rateLimitError = consumeUserActionLimit("account:deactivate", auth.user.id, {
    limit: 3,
    windowMs: 60 * 60 * 1000,
  });
  if (rateLimitError) {
    redirectWithError(rateLimitError);
  }

  try {
    const adminPb = await createSuperuserPocketBase();
    const password = randomBytes(32).toString("base64url");

    await adminPb.collection("users").update(
      auth.user.id,
      {
        email: `deleted-${auth.user.id}@spin500.invalid`,
        emailVisibility: false,
        verified: false,
        password,
        passwordConfirm: password,
        display_name: "Deleted member",
        avatar: null,
        deactivated_at: new Date().toISOString(),
      },
      { requestKey: null },
    );
  } catch (error) {
    redirectWithError(formatProfileError(error));
  }

  await clearAuthCookie();
  revalidatePath("/board");
  revalidatePath("/feed");
  revalidatePath("/history");
  revalidatePath("/stats");
  redirect("/auth");
}

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getFileValue(formData: FormData, key: string) {
  const value = formData.get(key);

  if (!(value instanceof File) || value.size === 0) {
    return null;
  }

  return value;
}

function redirectWithError(message: string): never {
  const query = new URLSearchParams({ error: message });
  redirect(`/settings?${query.toString()}`);
}

function formatProfileError(error: unknown) {
  if (error instanceof Error && error.message === "Unauthorized.") {
    return "Sign in again before editing your profile.";
  }

  return "Could not update your profile.";
}
