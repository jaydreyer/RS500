export function getSafeReturnPath(value: unknown, fallback = "/pick") {
  if (typeof value !== "string") {
    return fallback;
  }

  const path = value.trim();
  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/auth")) {
    return fallback;
  }

  return path;
}

export function getLoginUrl(nextPath: string) {
  const params = new URLSearchParams({
    mode: "login",
    next: getSafeReturnPath(nextPath),
    reason: "session-expired",
  });

  return `/auth?${params.toString()}`;
}
