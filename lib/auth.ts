import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
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

/**
 * The admin cookie used to be the literal string "authenticated", which anyone could set by hand.
 * It is now "<expiry>.<hmac>", signed with ADMIN_SESSION_SECRET. In production the secret is mandatory.
 */
function adminSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (secret && secret !== "replace-with-a-long-random-secret") return secret;
  if (process.env.NODE_ENV !== "production") return "dev-admin-secret-change-me";
  return null;
}

function signAdmin(expiry: string, secret: string) {
  return createHmac("sha256", secret).update(`admin:${expiry}`).digest("hex");
}

export function setAdminSession() {
  const secret = adminSecret();
  if (!secret) throw new Error("ADMIN_SESSION_SECRET must be set to a long random value in production");
  const expiry = String(Date.now() + ADMIN_SESSION_MAX_AGE_SECONDS * 1000);
  cookies().set(cookieName, `${expiry}.${signAdmin(expiry, secret)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    path: "/"
  });
}

export function isAdminSession() {
  const secret = adminSecret();
  const value = cookies().get(cookieName)?.value;
  if (!secret || !value) return false;
  const [expiry, signature] = value.split(".");
  if (!expiry || !signature || !/^\d+$/.test(expiry) || Date.now() > Number(expiry)) return false;
  const expected = Buffer.from(signAdmin(expiry, secret));
  const provided = Buffer.from(signature);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

export function requireAdmin() {
  if (!isAdminSession()) redirect("/admin/login");
}

export function clearAdminSession() {
  cookies().delete(cookieName);
}
