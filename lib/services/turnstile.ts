/**
 * Cloudflare Turnstile server-side verification.
 * - TURNSTILE_SITE_KEY (public) is rendered in the form; TURNSTILE_SECRET_KEY stays on the server.
 * - Outside production, with no secret configured, verification is skipped so local dev works.
 * - In production a missing secret FAILS CLOSED (signup/checkout are refused) - bot protection is the point.
 * Cloudflare's documented always-pass test keys: site 1x00000000000000000000AA / secret 1x0000000000000000000000000000000AA
 */
export function turnstileSiteKey() {
  return process.env.TURNSTILE_SITE_KEY || "";
}

export async function verifyTurnstile(token: string | null | undefined, ip?: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.error("[turnstile] TURNSTILE_SECRET_KEY is not set - refusing (fail closed)");
      return false;
    }
    return true;
  }
  if (!token || token.length > 2048) return false;
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip && ip !== "unknown") body.set("remoteip", ip);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      signal: AbortSignal.timeout(8000)
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (error) {
    console.error("[turnstile] verification request failed", error);
    return false;
  }
}
