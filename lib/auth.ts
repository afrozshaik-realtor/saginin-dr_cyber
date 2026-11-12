import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import { isMfaEnabled } from "@/lib/services/adminMfa";
import { getAdminUserByEmail } from "@/lib/store";

const cookieName = "drcyber_admin";

/**
 * The env-var admin. Outside production it falls back to the documented dev defaults; in production it exists
 * only if you set ADMIN_EMAIL and ADMIN_PASSWORD (or ADMIN_PASSWORD_HASH) - the public default login is disabled.
 */
function envAdmin() {
  const production = process.env.NODE_ENV === "production";
  const email = process.env.ADMIN_EMAIL || (production ? "" : "admin@example.com");
  const hash = process.env.ADMIN_PASSWORD_HASH || "";
  const password = process.env.ADMIN_PASSWORD || (production ? "" : "ChangeMe123!");
  const unsafe = production && (email === "admin@example.com" || password === "ChangeMe123!");
  if (!email || (!hash && !password) || unsafe) return null;
  return { email, hash, password };
}

/** First-run /admin/register is closed in production unless ALLOW_ADMIN_REGISTER=true (otherwise anyone could claim it). */
export function adminRegistrationAllowed() {
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_ADMIN_REGISTER === "true";
}

export async function verifyAdmin(email: string, password: string) {
  const env = envAdmin();
  if (env && email === env.email) {
    if (env.hash) return bcrypt.compare(password, env.hash);
    return password === env.password;
  }

  const adminUser = await getAdminUserByEmail(email);
  if (adminUser) return bcrypt.compare(password, adminUser.passwordHash);

  return false;
}

export function hashAdminPassword(password: string) {
  return bcrypt.hash(password, 12);
}

const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;
const MFA_PENDING_COOKIE = "drcyber_admin_mfa";
const MFA_PENDING_MAX_AGE_SECONDS = 5 * 60;

/**
 * Admin cookies are signed ("<base64url payload>.<hmac>") with ADMIN_SESSION_SECRET, which is mandatory in
 * production. Payload: { e: email, x: expiry, s: "full" | "setup" }.
 *  - "full":  fully authenticated (password, plus an MFA code when MFA is enabled for that admin).
 *  - "setup": password OK but ADMIN_REQUIRE_MFA=true and no MFA enrolled yet; only /admin/security is reachable.
 */
function adminSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (secret && secret !== "replace-with-a-long-random-secret") return secret;
  if (process.env.NODE_ENV !== "production") return "dev-admin-secret-change-me";
  return null;
}

type AdminCookie = { e: string; x: number; s: "full" | "setup" };

function seal(purpose: string, payload: object) {
  const secret = adminSecret();
  if (!secret) throw new Error("ADMIN_SESSION_SECRET must be set to a long random value in production");
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${createHmac("sha256", secret).update(`${purpose}:${encoded}`).digest("hex")}`;
}

function unseal<T extends { x: number }>(purpose: string, value: string | undefined): T | null {
  const secret = adminSecret();
  if (!secret || !value) return null;
  const [encoded, signature] = value.split(".");
  if (!encoded || !signature) return null;
  const expected = Buffer.from(createHmac("sha256", secret).update(`${purpose}:${encoded}`).digest("hex"));
  const provided = Buffer.from(signature);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString()) as T;
    return typeof payload.x === "number" && Date.now() <= payload.x ? payload : null;
  } catch {
    return null;
  }
}

function setCookie(name: string, value: string, maxAge: number) {
  cookies().set(name, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge,
    path: "/"
  });
}

function writeSession(email: string, state: AdminCookie["s"]) {
  const payload: AdminCookie = { e: email.trim().toLowerCase(), x: Date.now() + ADMIN_SESSION_MAX_AGE_SECONDS * 1000, s: state };
  setCookie(cookieName, seal("admin", payload), ADMIN_SESSION_MAX_AGE_SECONDS);
}

function readSession() {
  return unseal<AdminCookie>("admin", cookies().get(cookieName)?.value);
}

/**
 * Call after the PASSWORD checked out. Returns what the caller should do next:
 *  "ok"    -> logged in.   "mfa" -> ask for the authenticator code.   "setup" -> must enroll MFA first.
 */
export async function startAdminSession(email: string): Promise<"ok" | "mfa" | "setup"> {
  if (await isMfaEnabled(email)) {
    setCookie(
      MFA_PENDING_COOKIE,
      seal("admin-mfa", { e: email.trim().toLowerCase(), x: Date.now() + MFA_PENDING_MAX_AGE_SECONDS * 1000 }),
      MFA_PENDING_MAX_AGE_SECONDS
    );
    return "mfa";
  }
  if (process.env.ADMIN_REQUIRE_MFA === "true") {
    writeSession(email, "setup");
    return "setup";
  }
  writeSession(email, "full");
  return "ok";
}

/** The admin whose password was accepted and who still owes an MFA code (5 minute window). */
export function getMfaPendingEmail() {
  return unseal<{ e: string; x: number }>("admin-mfa", cookies().get(MFA_PENDING_COOKIE)?.value)?.e ?? null;
}

export function completeMfaLogin(email: string) {
  cookies().delete(MFA_PENDING_COOKIE);
  writeSession(email, "full");
}

/** Used by API routes and server actions: true only for a FULLY authenticated admin. */
export function isAdminSession() {
  return readSession()?.s === "full";
}

export function getAdminEmail() {
  return readSession()?.e ?? null;
}

/** Admin pages. A password-only "setup" session is sent to /admin/security to enroll MFA first. */
export function requireAdmin() {
  const session = readSession();
  if (!session) redirect("/admin/login");
  if (session!.s !== "full") redirect("/admin/security");
}

/** For /admin/security only: accepts a "setup" session too. Returns the admin's email. */
export function requireAdminAllowSetup() {
  const session = readSession();
  if (!session) redirect("/admin/login");
  return session!.e;
}

export function clearAdminSession() {
  cookies().delete(cookieName);
  cookies().delete(MFA_PENDING_COOKIE);
}
