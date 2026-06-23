export type SignupInput = {
  inviteCode: string;
  displayName: string;
  email: string;
  password: string;
};

export type InviteProfileInput = Pick<SignupInput, "inviteCode" | "displayName">;

export const CREW_INVITE_CODE = process.env.CREW_INVITE_CODE;

export function validateSignupInput(input: SignupInput, expectedInviteCode: string | undefined) {
  const inviteProfileError = validateInviteProfileInput(input, expectedInviteCode);
  if (inviteProfileError) {
    return inviteProfileError;
  }

  if (!input.email || !input.email.includes("@")) {
    return "Enter a valid email address.";
  }

  if (input.password.length < 8) {
    return "Password must be at least 8 characters.";
  }

  return null;
}

export function validateInviteProfileInput(input: InviteProfileInput, expectedInviteCode: string | undefined) {
  if (!expectedInviteCode) {
    return "Signup is not configured yet.";
  }

  if (normalizeInviteCode(input.inviteCode) !== normalizeInviteCode(expectedInviteCode)) {
    return "That invite code is not valid. Ask the crew.";
  }

  return validateDisplayName(input.displayName);
}

export function normalizeInviteCode(value: string) {
  return value.trim().toUpperCase();
}

export function validateDisplayName(displayName: string) {
  if (displayName.length < 2) {
    return "Enter the name the board should show.";
  }

  if (displayName.length > 80) {
    return "Display name must be 80 characters or less.";
  }

  return null;
}

export function isAdminEmail(email: string, adminEmail: string | undefined) {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedAdminEmail = adminEmail?.trim().toLowerCase();

  return Boolean(normalizedEmail && normalizedAdminEmail && normalizedEmail === normalizedAdminEmail);
}
