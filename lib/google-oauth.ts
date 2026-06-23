import crypto from "node:crypto";

export const GOOGLE_OAUTH_STATE_COOKIE = "google_oauth_state";
export const GOOGLE_AUTHORIZATION_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

export type GoogleOAuthMode = "login" | "signup";

export type GoogleOAuthState = {
  state: string;
  codeVerifier: string;
  mode: GoogleOAuthMode;
  displayName: string;
  createdAt: number;
};

export type GoogleOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export type GoogleUserInfo = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
};

export function getGoogleOAuthConfig(requestUrl: string) {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    return null;
  }

  return {
    clientId,
    clientSecret,
    redirectUri: getGoogleRedirectUri(requestUrl),
  };
}

export function getGoogleRedirectUri(requestUrl: string) {
  const configuredRedirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim();

  if (configuredRedirectUri) {
    return configuredRedirectUri;
  }

  return new URL("/api/auth/google/callback", requestUrl).href;
}

export function createGoogleOAuthState(mode: GoogleOAuthMode, displayName: string): GoogleOAuthState {
  return {
    state: randomBase64Url(32),
    codeVerifier: randomBase64Url(64),
    mode,
    displayName,
    createdAt: Date.now(),
  };
}

export function encodeGoogleOAuthState(state: GoogleOAuthState) {
  return Buffer.from(JSON.stringify(state), "utf8").toString("base64url");
}

export function decodeGoogleOAuthState(value: string | undefined) {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));

    if (!isGoogleOAuthState(parsed)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function isExpiredGoogleOAuthState(state: GoogleOAuthState, now = Date.now()) {
  return now - state.createdAt > 10 * 60 * 1000;
}

export function buildGoogleAuthorizationUrl(config: GoogleOAuthConfig, state: GoogleOAuthState) {
  const url = new URL(GOOGLE_AUTHORIZATION_URL);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state.state);
  url.searchParams.set("code_challenge", createCodeChallenge(state.codeVerifier));
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("prompt", "select_account");

  return url;
}

export function normalizeGoogleUserInfo(value: unknown): GoogleUserInfo | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const data = value as Record<string, unknown>;
  const sub = asString(data.sub);
  const email = asString(data.email).toLowerCase();
  const emailVerified = data.email_verified === true || data.email_verified === "true";

  if (!sub || !email || !email.includes("@")) {
    return null;
  }

  return {
    sub,
    email,
    emailVerified,
    name: asString(data.name),
  };
}

export function getGoogleOAuthMode(value: FormDataEntryValue | null): GoogleOAuthMode {
  return value === "login" ? "login" : "signup";
}

function createCodeChallenge(codeVerifier: string) {
  return crypto.createHash("sha256").update(codeVerifier).digest("base64url");
}

function randomBase64Url(size: number) {
  return crypto.randomBytes(size).toString("base64url");
}

function isGoogleOAuthState(value: unknown): value is GoogleOAuthState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const state = value as GoogleOAuthState;

  return (
    typeof state.state === "string" &&
    typeof state.codeVerifier === "string" &&
    (state.mode === "login" || state.mode === "signup") &&
    typeof state.displayName === "string" &&
    typeof state.createdAt === "number"
  );
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
