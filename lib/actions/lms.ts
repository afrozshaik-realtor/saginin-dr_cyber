"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCourseBySlug } from "@/lib/config/courses";
import { createCheckoutSession } from "@/lib/services/stripe";
import {
  createStudent,
  enrollStudent,
  getEnrollment,
  getStudentByEmail,
  getStudentById,
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

export async function checkoutAction(formData: FormData) {
  const slug = String(formData.get("slug") || "");
  const course = getCourseBySlug(slug);
  if (!course) redirect("/courses");

  const studentId = getStudentSessionId();
  if (!studentId) {
    redirect(`/login?redirect=${encodeURIComponent(`/courses/${slug}`)}`);
  }
  const student = await getStudentById(studentId as string);
  if (!student) {
    redirect(`/login?redirect=${encodeURIComponent(`/courses/${slug}`)}`);
  }

  const existing = await getEnrollment(student!.id, course!.id);
  if (existing) redirect(`/learn/${slug}`);

  const appUrl = process.env.APP_URL || "http://localhost:3000";
  let session: Awaited<ReturnType<typeof createCheckoutSession>> = null;
  try {
    session = await createCheckoutSession({
      studentId: student!.id,
      studentEmail: student!.email,
      course: course!,
      successUrl: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&slug=${slug}`,
      cancelUrl: `${appUrl}/courses/${slug}?checkout=cancelled`
    });
  } catch (error) {
    console.error("Stripe checkout session creation failed", error);
    redirect(`/courses/${slug}?checkout=error`);
  }

  if (!session) {
    // Stripe isn't configured (no STRIPE_SECRET_KEY) - enroll directly so the app stays testable end-to-end locally.
    await enrollStudent(student!.id, course!.id, { paymentStatus: "dev-mode" });
    redirect(`/learn/${slug}`);
  }
  if (!session.url) {
    redirect(`/courses/${slug}?checkout=error`);
  }

  redirect(session.url);
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
