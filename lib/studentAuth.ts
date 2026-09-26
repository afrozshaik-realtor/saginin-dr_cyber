import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import { getStudentById } from "@/lib/store";

const cookieName = "ccpf_student";

function secret() {
  return process.env.STUDENT_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET || "dev-secret-change-me";
}

function sign(studentId: string) {
  return createHmac("sha256", secret()).update(studentId).digest("hex");
}

export function setStudentSession(studentId: string) {
  cookies().set(cookieName, `${studentId}.${sign(studentId)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/"
  });
}

export function getStudentSessionId(): string | null {
  const value = cookies().get(cookieName)?.value;
  if (!value) return null;
  const [studentId, signature] = value.split(".");
  if (!studentId || !signature) return null;
  const expected = sign(studentId);
  const provided = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (provided.length !== expectedBuffer.length || !timingSafeEqual(provided, expectedBuffer)) return null;
  return studentId;
}

export async function getCurrentStudent() {
  const studentId = getStudentSessionId();
  if (!studentId) return null;
  return getStudentById(studentId);
}

export async function requireStudent(redirectTo?: string) {
  const studentId = getStudentSessionId();
  if (!studentId) {
    redirect(`/login${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`);
  }
  const student = await getStudentById(studentId as string);
  if (!student) {
    redirect("/login");
  }
  return student!;
}

export function clearStudentSession() {
  cookies().delete(cookieName);
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
