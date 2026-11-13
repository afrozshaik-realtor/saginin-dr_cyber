import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

/** Best-effort client IP behind Hostinger's reverse proxy (first X-Forwarded-For hop). */
export function clientIp() {
  try {
    const h = headers();
    return (h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "unknown").trim().slice(0, 64);
  } catch {
    return "unknown";
  }
}

/**
 * Sliding-window limiter stored in MySQL (so it survives restarts and works across processes).
 * Counts first, then records the hit; a rare race can let one extra request through, which is fine here.
 * Returns true if the request is ALLOWED.
 */
export async function allowRequest(key: string, limit: number, windowSeconds: number) {
  const since = new Date(Date.now() - windowSeconds * 1000);
  const count = await prisma.rateLimitHit.count({ where: { key, createdAt: { gt: since } } });
  if (count >= limit) {
    console.warn(`[ratelimit] blocked ${key} (${count}/${limit} in ${windowSeconds}s)`);
    return false;
  }
  await prisma.rateLimitHit.create({ data: { key } });
  if (Math.random() < 0.02) {
    await prisma.rateLimitHit.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 24 * 3600 * 1000) } } });
  }
  return true;
}
