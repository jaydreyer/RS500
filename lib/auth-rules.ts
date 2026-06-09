export type SignupInput = {
  inviteCode: string;
  displayName: string;
  email: string;
  password: string;
};

export const CREW_INVITE_CODE = "VINYL-NIGHT";

export function validateSignupInput(input: SignupInput, expectedInviteCode: string | undefined) {
  if (!expectedInviteCode) {
    return "Signup is not configured yet.";
  }

  if (normalizeInviteCode(input.inviteCode) !== normalizeInviteCode(expectedInviteCode)) {
    return "That invite code is not valid. Ask the crew.";
  }

  if (input.displayName.length < 2) {
    return "Enter the name the board should show.";
  }

  if (input.displayName.length > 80) {
    return "Display name must be 80 characters or less.";
  }

  if (!input.email || !input.email.includes("@")) {
    return "Enter a valid email address.";
  }

  if (input.password.length < 8) {
    return "Password must be at least 8 characters.";
  }

  return null;
}

export function normalizeInviteCode(value: string) {
  return value.trim().toUpperCase();
}
