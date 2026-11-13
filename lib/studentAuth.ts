import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import { getStudentById } from "@/lib/store";

const cookieName = "drcyber_student";

const PLACEHOLDER_SECRETS = new Set(["replace-with-a-different-long-random-secret", "replace-with-a-long-random-secret"]);
let warned = false;
const ephemeralSecret = randomBytes(32).toString("hex");

/**
 * Signing secret for student sessions and email links. In production a missing (or placeholder) secret does NOT
 * fall back to a publicly known default: a random per-process secret is used instead, so nothing can be forged,
 * but everyone is logged out on every restart - set STUDENT_SESSION_SECRET.
 */
function secret() {
  const configured = process.env.STUDENT_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET;
  if (configured && !PLACEHOLDER_SECRETS.has(configured)) return configured;
  if (process.env.NODE_ENV !== "production") return "dev-secret-change-me";
  if (!warned) {
    warned = true;
    console.error("[auth] STUDENT_SESSION_SECRET is not set: using a temporary secret (sessions reset on restart). Set it in the environment.");
  }
  return ephemeralSecret;
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

const ACCESS_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function signAccessPayload(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

export function createAccessToken(studentId: string, courseSlug: string) {
  const payload = JSON.stringify({ s: studentId, c: courseSlug, e: Date.now() + ACCESS_TOKEN_TTL_MS });
  const encoded = Buffer.from(payload).toString("base64url");
  return `${encoded}.${signAccessPayload(encoded)}`;
}

export function verifyAccessToken(token: string): { studentId: string; courseSlug: string } | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expected = signAccessPayload(encoded);
  const provided = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (provided.length !== expectedBuffer.length || !timingSafeEqual(provided, expectedBuffer)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString());
    if (typeof payload.s !== "string" || typeof payload.c !== "string" || typeof payload.e !== "number") return null;
    if (Date.now() > payload.e) return null;
    return { studentId: payload.s, courseSlug: payload.c };
  } catch {
    return null;
  }
}

const RESET_TOKEN_TTL_MS = 1000 * 60 * 60;

export function createPasswordResetToken(studentId: string) {
  const payload = JSON.stringify({ s: studentId, purpose: "reset", e: Date.now() + RESET_TOKEN_TTL_MS });
  const encoded = Buffer.from(payload).toString("base64url");
  return `${encoded}.${signAccessPayload(encoded)}`;
}

export function verifyPasswordResetToken(token: string): { studentId: string } | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expected = signAccessPayload(encoded);
  const provided = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (provided.length !== expectedBuffer.length || !timingSafeEqual(provided, expectedBuffer)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString());
    if (payload.purpose !== "reset" || typeof payload.s !== "string" || typeof payload.e !== "number") return null;
    if (Date.now() > payload.e) return null;
    return { studentId: payload.s };
  } catch {
    return null;
  }
}

/** Unsubscribe links never expire (CASL: the mechanism must keep working). Purpose-bound so it can't be used as a login token. */
export function createUnsubscribeToken(studentId: string) {
  const encoded = Buffer.from(JSON.stringify({ s: studentId, purpose: "unsubscribe" })).toString("base64url");
  return `${encoded}.${signAccessPayload(encoded)}`;
}

export function verifyUnsubscribeToken(token: string): { studentId: string } | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  const expected = Buffer.from(signAccessPayload(encoded));
  const provided = Buffer.from(signature);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString());
    if (payload.purpose !== "unsubscribe" || typeof payload.s !== "string") return null;
    return { studentId: payload.s };
  } catch {
    return null;
  }
}
