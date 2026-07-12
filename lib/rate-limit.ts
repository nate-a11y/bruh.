import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Distributed rate limiting via Upstash Redis. If the Upstash env vars aren't
 * set, every check returns `{ ok: true }` (the app is never broken by a missing
 * limiter). Configure UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN to
 * enable enforcement.
 */
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

function makeLimiter(tokens: number, window: `${number} s` | `${number} m`) {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(tokens, window),
    analytics: false,
    prefix: "bruh_rl",
  });
}

// One limiter per protected surface. Tune here.
const limiters = {
  auth: makeLimiter(10, "60 s"), // login/signup attempts per IP
  webhook: makeLimiter(120, "60 s"), // stripe webhook per IP
  inbound: makeLimiter(30, "60 s"), // inbound email per IP
  ai: makeLimiter(20, "60 s"), // AI planning per user
} as const;

export type RateLimitBucket = keyof typeof limiters;

/** Returns { ok, remaining }. Fails open (ok:true) if Redis is unreachable. */
export async function rateLimit(
  bucket: RateLimitBucket,
  identifier: string
): Promise<{ ok: boolean; remaining: number }> {
  const limiter = limiters[bucket];
  if (!limiter) return { ok: true, remaining: -1 };
  try {
    const { success, remaining } = await limiter.limit(identifier);
    return { ok: success, remaining };
  } catch (err) {
    console.error("Rate limit check failed (allowing):", err);
    return { ok: true, remaining: -1 };
  }
}

/** Best-effort client IP from proxy headers. Accepts Headers or Next's ReadonlyHeaders. */
export function clientIp(headers: { get(name: string): string | null }): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
