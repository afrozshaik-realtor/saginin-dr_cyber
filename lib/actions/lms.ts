"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { findLesson } from "@/lib/config/courses";
import { sendPasswordResetEmail } from "@/lib/services/email";
import { createCheckoutSession } from "@/lib/services/stripe";
import { saveUploadedFile } from "@/lib/services/storage";
import {
  createAssignmentSubmission,
  createStudent,
  enrollStudent,
  getCourseBySlug,
  getEnrollment,
  getStudentByEmail,
  getStudentById,
  recordQuizAttempt,
  setLessonProgress,
  updateStudentPassword
} from "@/lib/store";
import {
  clearStudentSession,
  createPasswordResetToken,
  getStudentSessionId,
  hashPassword,
  requireStudent,
  setStudentSession,
  verifyPassword,
  verifyPasswordResetToken
} from "@/lib/studentAuth";
import { forgotPasswordSchema, resetPasswordSchema, studentLoginSchema, studentSignupSchema } from "@/lib/validation";

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

export async function forgotPasswordAction(formData: FormData) {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) redirect("/forgot-password?sent=1");

  const student = await getStudentByEmail(parsed.data.email);
  if (student) {
    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const token = createPasswordResetToken(student.id);
    await sendPasswordResetEmail(student, `${appUrl}/reset-password?token=${token}`);
  }
  // Always show the same confirmation, whether or not the email is registered, so this can't be used to check who has an account.
  redirect("/forgot-password?sent=1");
}

export async function resetPasswordAction(formData: FormData) {
  const token = String(formData.get("token") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");
  const parsed = resetPasswordSchema.safeParse({
    token,
    password: formData.get("password")
  });
  if (!parsed.success || parsed.data.password !== confirmPassword) {
    redirect(`/reset-password?token=${encodeURIComponent(token)}&error=invalid`);
  }

  const payload = verifyPasswordResetToken(parsed.data.token);
  if (!payload) redirect("/forgot-password?error=expired");

  const passwordHash = await hashPassword(parsed.data.password);
  await updateStudentPassword(payload!.studentId, passwordHash);
  setStudentSession(payload!.studentId);
  redirect("/dashboard?reset=success");
}

export async function checkoutAction(formData: FormData) {
  const slug = String(formData.get("slug") || "");
  const course = await getCourseBySlug(slug);
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
  const course = await getCourseBySlug(slug);
  if (!course) redirect("/courses");

  const student = await requireStudent(`/learn/${slug}`);
  await setLessonProgress(student.id, course!.id, lessonId, completed);
  revalidatePath(`/learn/${slug}`);
  revalidatePath("/dashboard");
}

export async function submitQuizAction(formData: FormData) {
  const slug = String(formData.get("slug") || "");
  const lessonId = String(formData.get("lessonId") || "");
  const course = await getCourseBySlug(slug);
  if (!course) redirect("/courses");

  const student = await requireStudent(`/learn/${slug}`);
  const lesson = findLesson(course!, lessonId);
  if (!lesson || lesson.kind !== "quiz") redirect(`/learn/${slug}`);

  const answers: Record<string, string> = {};
  let correctCount = 0;
  for (const question of lesson!.questions) {
    const selected = String(formData.get(`question-${question.id}`) || "");
    answers[question.id] = selected;
    const correctOption = question.options.find((option) => option.correct);
    if (correctOption && correctOption.id === selected) correctCount += 1;
  }
  const totalCount = lesson!.questions.length;
  const scorePercent = totalCount ? Math.round((correctCount / totalCount) * 100) : 0;

  await recordQuizAttempt({
    studentId: student.id,
    courseId: course!.id,
    lessonId,
    answers,
    scorePercent,
    correctCount,
    totalCount
  });
  await setLessonProgress(student.id, course!.id, lessonId, true);
  revalidatePath(`/learn/${slug}`);
  revalidatePath("/dashboard");
  redirect(`/learn/${slug}?lesson=${lessonId}`);
}

export async function submitAssignmentAction(formData: FormData) {
  const slug = String(formData.get("slug") || "");
  const lessonId = String(formData.get("lessonId") || "");
  const course = await getCourseBySlug(slug);
  if (!course) redirect("/courses");

  const student = await requireStudent(`/learn/${slug}`);
  const lesson = findLesson(course!, lessonId);
  if (!lesson || lesson.kind !== "assignment") redirect(`/learn/${slug}`);

  const submission: Parameters<typeof createAssignmentSubmission>[0] = {
    studentId: student.id,
    courseId: course!.id,
    lessonId,
    submissionType: lesson!.submissionType
  };

  if (lesson!.submissionType === "link") {
    submission.link = String(formData.get("link") || "").trim();
    if (!submission.link) redirect(`/learn/${slug}?lesson=${lessonId}&error=missing`);
  } else if (lesson!.submissionType === "text") {
    submission.text = String(formData.get("text") || "").trim();
    if (!submission.text) redirect(`/learn/${slug}?lesson=${lessonId}&error=missing`);
  } else {
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      redirect(`/learn/${slug}?lesson=${lessonId}&error=missing`);
    }
    const uploaded = await saveUploadedFile(file as File, `assignments/${student.id}/${lessonId}`);
    submission.fileUrl = uploaded.url;
    submission.fileName = (file as File).name;
  }

  await createAssignmentSubmission(submission);
  await setLessonProgress(student.id, course!.id, lessonId, true);
  revalidatePath(`/learn/${slug}`);
  revalidatePath("/dashboard");
  redirect(`/learn/${slug}?lesson=${lessonId}`);
}
