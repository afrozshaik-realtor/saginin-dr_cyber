import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";

/** RFC 6238 TOTP (HMAC-SHA1, 30s step, 6 digits) - what Google Authenticator, 1Password, Authy etc. implement. */
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export const STEP_SECONDS = 30;

export function base32Encode(buf: Buffer) {
  let bits = "";
  for (const b of buf) bits += b.toString(2).padStart(8, "0");
  let out = "";
  for (let i = 0; i < bits.length; i += 5) out += ALPHABET[parseInt(bits.slice(i, i + 5).padEnd(5, "0"), 2)];
  return out;
}

export function base32Decode(input: string) {
  const clean = input.replace(/[\s=-]/g, "").toUpperCase();
  let bits = "";
  for (const ch of clean) {
    const v = ALPHABET.indexOf(ch);
    if (v < 0) throw new Error("Invalid base32");
    bits += v.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

export function generateSecret() {
  return base32Encode(randomBytes(20));
}

export function hotp(secret: Buffer, counter: number, digits = 6) {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const h = createHmac("sha1", secret).update(msg).digest();
  const offset = h[h.length - 1] & 0x0f;
  const code = ((h[offset] & 0x7f) << 24) | (h[offset + 1] << 16) | (h[offset + 2] << 8) | h[offset + 3];
  return String(code % 10 ** digits).padStart(digits, "0");
}

export function currentStep(nowMs = Date.now()) {
  return Math.floor(nowMs / 1000 / STEP_SECONDS);
}

/**
 * Returns the matching time step (so the caller can refuse to accept the same step twice), or null.
 * Accepts the previous, current and next step to tolerate clock drift.
 */
export function verifyTotp(base32Secret: string, code: string, opts: { nowMs?: number; afterStep?: number } = {}) {
  if (!/^\d{6}$/.test(code)) return null;
  const secret = base32Decode(base32Secret);
  const now = currentStep(opts.nowMs);
  for (const step of [now - 1, now, now + 1]) {
    if (step <= (opts.afterStep ?? 0)) continue;
    const expected = Buffer.from(hotp(secret, step));
    if (expected.length === code.length && timingSafeEqual(expected, Buffer.from(code))) return step;
  }
  return null;
}

export function otpauthUri(email: string, secret: string, issuer = "Dr Cyber Admin") {
  const label = encodeURIComponent(`${issuer}:${email}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=${STEP_SECONDS}`;
}

// --- Secret at rest: AES-256-GCM, key derived from ADMIN_SESSION_SECRET ---
function key() {
  const s = process.env.ADMIN_SESSION_SECRET;
  const base = s && s !== "replace-with-a-long-random-secret" ? s : process.env.NODE_ENV === "production" ? "" : "dev-admin-secret-change-me";
  if (!base) throw new Error("ADMIN_SESSION_SECRET must be set in production");
  return createHash("sha256").update(`admin-mfa:${base}`).digest();
}

export function encryptSecret(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), enc].map((b) => b.toString("base64url")).join(".");
}

export function decryptSecret(blob: string) {
  const [iv, tag, enc] = blob.split(".").map((p) => Buffer.from(p, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

// --- Recovery codes ---
export function generateRecoveryCodes(n = 8) {
  return Array.from({ length: n }, () => {
    const h = randomBytes(4).toString("hex");
    return `${h.slice(0, 4)}-${h.slice(4)}`;
  });
}
export function hashRecoveryCode(code: string) {
  return createHash("sha256").update(code.trim().toLowerCase().replace(/\s/g, "")).digest("hex");
}
