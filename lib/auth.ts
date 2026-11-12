import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import { getAdminUserByEmail } from "@/lib/store";

const cookieName = "drcyber_admin";

export async function verifyAdmin(email: string, password: string) {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "ChangeMe123!";
  const adminHash = process.env.ADMIN_PASSWORD_HASH;

  if (email === adminEmail) {
    if (adminHash) return bcrypt.compare(password, adminHash);
    return password === adminPassword;
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
