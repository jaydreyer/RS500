import { createHash } from "crypto";

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

export type RateLimitOptions = {
  limit: number;
  windowMs: number;
  now?: number;
};

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

const MAX_BUCKETS = 1000;

const globalRateLimit = globalThis as typeof globalThis & {
  __rs500RateLimitBuckets?: Map<string, RateLimitBucket>;
};

const buckets = globalRateLimit.__rs500RateLimitBuckets ?? new Map<string, RateLimitBucket>();
globalRateLimit.__rs500RateLimitBuckets = buckets;

export function consumeRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = options.now ?? Date.now();
  const bucketKey = hashKey(key);
  const bucket = buckets.get(bucketKey);

  if (!bucket || bucket.resetAt <= now) {
    pruneExpiredBuckets(now);
    buckets.set(bucketKey, {
      count: 1,
      resetAt: now + options.windowMs,
    });
    trimBuckets();

    return {
      allowed: true,
      retryAfterSeconds: 0,
    };
  }

  bucket.count += 1;

  return {
    allowed: bucket.count <= options.limit,
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

export function resetRateLimitForTests() {
  buckets.clear();
}

function hashKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

function pruneExpiredBuckets(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

function trimBuckets() {
  while (buckets.size > MAX_BUCKETS) {
    const oldestKey = buckets.keys().next().value;
    if (!oldestKey) {
      return;
    }

    buckets.delete(oldestKey);
  }
}
