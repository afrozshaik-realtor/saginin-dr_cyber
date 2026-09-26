"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCourseBySlug } from "@/lib/config/courses";
import {
  createStudent,
  enrollStudent,
  getStudentByEmail,
  setLessonProgress
} from "@/lib/store";
import {
  clearStudentSession,
  getStudentSessionId,
  hashPassword,
  requireStudent,
  setStudentSession,
  verifyPassword
} from "@/lib/studentAuth";
import { studentLoginSchema, studentSignupSchema } from "@/lib/validation";

function safeRedirect(target: FormDataEntryValue | null) {
  const value = typeof target === "string" ? target : "";
  return value.startsWith("/") ? value : "/dashboard";
}

export async function signupAction(formData: FormData) {
  const redirectTo = safeRedirect(formData.get("redirect"));
  const parsed = studentSignupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password")
  });
  if (!parsed.success) {
    redirect(`/signup?error=invalid&redirect=${encodeURIComponent(redirectTo)}`);
  }

  const existing = await getStudentByEmail(parsed.data.email);
  if (existing) {
    redirect(`/signup?error=exists&redirect=${encodeURIComponent(redirectTo)}`);
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const student = await createStudent({ name: parsed.data.name, email: parsed.data.email, passwordHash });
  if (!student) {
    redirect(`/signup?error=exists&redirect=${encodeURIComponent(redirectTo)}`);
  }

  setStudentSession(student!.id);
  redirect(redirectTo);
}

export async function loginAction(formData: FormData) {
  const redirectTo = safeRedirect(formData.get("redirect"));
  const parsed = studentLoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password")
  });
  if (!parsed.success) {
    redirect(`/login?error=1&redirect=${encodeURIComponent(redirectTo)}`);
  }

  const student = await getStudentByEmail(parsed.data.email);
  const valid = student ? await verifyPassword(parsed.data.password, student.passwordHash) : false;
  if (!student || !valid) {
    redirect(`/login?error=1&redirect=${encodeURIComponent(redirectTo)}`);
  }

  setStudentSession(student!.id);
  redirect(redirectTo);
}

export async function logoutAction() {
  clearStudentSession();
  redirect("/");
}

export async function enrollAction(formData: FormData) {
  const slug = String(formData.get("slug") || "");
  const course = getCourseBySlug(slug);
  if (!course) redirect("/courses");

  const studentId = getStudentSessionId();
  if (!studentId) {
    redirect(`/login?redirect=${encodeURIComponent(`/courses/${slug}`)}`);
  }

  await enrollStudent(studentId as string, course!.id);
  redirect(`/learn/${slug}`);
}

export async function toggleLessonAction(formData: FormData) {
  const slug = String(formData.get("slug") || "");
  const lessonId = String(formData.get("lessonId") || "");
  const completed = String(formData.get("completed") || "false") === "true";
  const course = getCourseBySlug(slug);
  if (!course) redirect("/courses");

  const student = await requireStudent(`/learn/${slug}`);
  await setLessonProgress(student.id, course!.id, lessonId, completed);
  revalidatePath(`/learn/${slug}`);
  revalidatePath("/dashboard");
}
