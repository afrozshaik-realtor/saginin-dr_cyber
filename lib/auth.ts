import { cookies } from "next/headers";
import { redirect } from "next/navigation";
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

export function setAdminSession() {
  cookies().set(cookieName, "authenticated", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8,
    path: "/"
  });
}

export function requireAdmin() {
  if (cookies().get(cookieName)?.value !== "authenticated") {
    redirect("/admin/login");
  }
}

export function isAdminSession() {
  return cookies().get(cookieName)?.value === "authenticated";
}

export function clearAdminSession() {
  cookies().delete(cookieName);
}
