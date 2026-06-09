import "server-only";

import { consumeRateLimit, type RateLimitOptions } from "@/lib/rate-limit";

export function consumeUserActionLimit(scope: string, userId: string, options: RateLimitOptions) {
  const result = consumeRateLimit(`${scope}:user:${userId}`, options);

  if (result.allowed) {
    return null;
  }

  return `Too many attempts. Try again in ${formatRetryAfter(result.retryAfterSeconds)}.`;
}

function formatRetryAfter(seconds: number) {
  if (seconds < 60) {
    return `${seconds} second${seconds === 1 ? "" : "s"}`;
  }

  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}
