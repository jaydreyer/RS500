export type AuthCookieHeaders = Pick<Headers, "get">;

export const AUTH_COOKIE_SECURE_ENV = "AUTH_COOKIE_SECURE";

export function shouldUseSecureAuthCookie(headers?: AuthCookieHeaders) {
  const override = parseBooleanEnv(process.env[AUTH_COOKIE_SECURE_ENV]);

  if (override !== null) {
    return override;
  }

  const protocol = getRequestProtocol(headers);

  if (protocol) {
    return protocol === "https";
  }

  const host = getRequestHost(headers);

  if (host && isLocalOrPrivateHost(host)) {
    return false;
  }

  return process.env.NODE_ENV === "production";
}

function parseBooleanEnv(value: string | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return null;
}

function getRequestProtocol(headers?: AuthCookieHeaders) {
  const forwardedProto = headers?.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();

  if (forwardedProto) {
    return forwardedProto;
  }

  const forwarded = headers?.get("forwarded");
  const protoMatch = forwarded?.match(/(?:^|[;,]\s*)proto=(https?)/i);

  return protoMatch?.[1]?.toLowerCase() ?? null;
}

function getRequestHost(headers?: AuthCookieHeaders) {
  return headers?.get("x-forwarded-host")?.split(",")[0]?.trim() || headers?.get("host")?.trim() || null;
}

function isLocalOrPrivateHost(host: string) {
  const hostname = normalizeHostname(host);

  return (
    hostname === "localhost" ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    hostname.endsWith(".local") ||
    hostname.startsWith("127.") ||
    isPrivateIpv4(hostname)
  );
}

function normalizeHostname(host: string) {
  const trimmed = host.trim().toLowerCase();

  if (trimmed.startsWith("[") && trimmed.includes("]")) {
    return trimmed.slice(1, trimmed.indexOf("]"));
  }

  return trimmed.split(":")[0] || trimmed;
}

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split(".").map((part) => Number(part));

  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }

  const [first, second] = parts;

  return first === 10 || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168);
}
