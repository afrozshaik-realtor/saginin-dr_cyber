"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { sendCourseAccessEmail } from "@/lib/services/email";
import {
  addLesson,
  addModule,
  createCourse,
  createStudent,
  deleteCourse,
  deleteLesson,
  deleteModule,
  enrollStudent,
  getCourseById,
  getCourseBySlug,
  getStudentByEmail,
  reorderLessons,
  reorderModules,
  reviewAssignmentSubmission,
  updateCourse,
  updateLesson,
  updateModule
} from "@/lib/store";
import { createAccessToken, hashPassword } from "@/lib/studentAuth";
import { courseSchema, grantAccessSchema, quizQuestionsSchema } from "@/lib/validation";
import type {
  AssignmentLesson,
  AssignmentSubmissionType,
  Lesson,
  QuizLesson,
  SlidesLesson,
  TextLesson,
  VideoLesson
} from "@/types/lms";

export async function grantAccessAction(formData: FormData) {
  requireAdmin();

  const parsed = grantAccessSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name") || "",
    slug: formData.get("slug")
  });
  if (!parsed.success) {
    redirect("/admin/students?grant=error");
  }

  const course = await getCourseBySlug(parsed.data.slug);
  if (!course) {
    redirect("/admin/students?grant=error");
  }

  let student = await getStudentByEmail(parsed.data.email);
  if (!student) {
    const passwordHash = await hashPassword(randomUUID());
    student = await createStudent({
      name: parsed.data.name || parsed.data.email.split("@")[0],
      email: parsed.data.email,
      passwordHash
    });
  }
  if (!student) {
    redirect("/admin/students?grant=error");
  }

  await enrollStudent(student!.id, course!.id, { paymentStatus: "granted" });

  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const token = createAccessToken(student!.id, course!.slug);
  const accessLink = `${appUrl}/access/${token}`;
  const status = await sendCourseAccessEmail(student!, course!, accessLink);

  redirect(`/admin/students?grant=success&mailed=${status === "sent" ? "1" : "0"}`);
}

function courseFieldsFromFormData(formData: FormData) {
  return courseSchema.safeParse({
    title: formData.get("title"),
    category: formData.get("category"),
    level: formData.get("level"),
    summary: formData.get("summary"),
    description: formData.get("description"),
    certification: formData.get("certification") || "",
    image: formData.get("image"),
    priceCents: formData.get("priceCents"),
    currency: formData.get("currency") || "usd",
    published: formData.get("published") === "on"
  });
}

export async function createCourseAction(formData: FormData) {
  requireAdmin();
  const parsed = courseFieldsFromFormData(formData);
  if (!parsed.success) redirect("/admin/courses/new?error=1");

  const course = await createCourse(parsed.data);
  if (!course) redirect("/admin/courses/new?error=1");
  redirect(`/admin/courses/${course!.id}`);
}

export async function updateCourseAction(formData: FormData) {
  requireAdmin();
  const id = String(formData.get("id") || "");
  const parsed = courseFieldsFromFormData(formData);
  if (!parsed.success) redirect(`/admin/courses/${id}?error=1`);

  await updateCourse(id, parsed.data);
  redirect(`/admin/courses/${id}?saved=1`);
}

export async function deleteCourseAction(formData: FormData) {
  requireAdmin();
  const id = String(formData.get("id") || "");
  await deleteCourse(id);
  redirect("/admin/courses");
}

export async function addModuleAction(formData: FormData) {
  requireAdmin();
  const courseId = String(formData.get("courseId") || "");
  const title = String(formData.get("title") || "").trim();
  if (title) await addModule(courseId, title);
  redirect(`/admin/courses/${courseId}`);
}

export async function renameModuleAction(formData: FormData) {
  requireAdmin();
  const courseId = String(formData.get("courseId") || "");
  const moduleId = String(formData.get("moduleId") || "");
  const title = String(formData.get("title") || "").trim();
  if (title) await updateModule(courseId, moduleId, title);
  redirect(`/admin/courses/${courseId}`);
}

export async function deleteModuleAction(formData: FormData) {
  requireAdmin();
  const courseId = String(formData.get("courseId") || "");
  const moduleId = String(formData.get("moduleId") || "");
  await deleteModule(courseId, moduleId);
  redirect(`/admin/courses/${courseId}`);
}

export async function moveModuleAction(formData: FormData) {
  requireAdmin();
  const courseId = String(formData.get("courseId") || "");
  const moduleId = String(formData.get("moduleId") || "");
  const direction = String(formData.get("direction") || "");

  const course = await getCourseById(courseId);
  if (!course) redirect("/admin/courses");
  const ids = course!.modules.map((item) => item.id);
  const index = ids.indexOf(moduleId);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index >= 0 && swapWith >= 0 && swapWith < ids.length) {
    [ids[index], ids[swapWith]] = [ids[swapWith], ids[index]];
    await reorderModules(courseId, ids);
  }
  redirect(`/admin/courses/${courseId}`);
}

export async function moveLessonAction(formData: FormData) {
  requireAdmin();
  const courseId = String(formData.get("courseId") || "");
  const moduleId = String(formData.get("moduleId") || "");
  const lessonId = String(formData.get("lessonId") || "");
  const direction = String(formData.get("direction") || "");

  const course = await getCourseById(courseId);
  const courseModule = course?.modules.find((item) => item.id === moduleId);
  if (!courseModule) redirect(`/admin/courses/${courseId}`);
  const ids = courseModule!.lessons.map((item) => item.id);
  const index = ids.indexOf(lessonId);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index >= 0 && swapWith >= 0 && swapWith < ids.length) {
    [ids[index], ids[swapWith]] = [ids[swapWith], ids[index]];
    await reorderLessons(courseId, moduleId, ids);
  }
  redirect(`/admin/courses/${courseId}`);
}

function parseLessonFromFormData(formData: FormData): Omit<Lesson, "id"> | null {
  const kind = String(formData.get("kind") || "") as Lesson["kind"];
  const title = String(formData.get("title") || "").trim();
  const durationMinutes = Math.max(1, Number(formData.get("durationMinutes")) || 15);
  const summary = String(formData.get("summary") || "").trim();
  if (!title) return null;
  const base = { title, durationMinutes, summary };

  if (kind === "text") {
    const content = String(formData.get("content") || "").trim();
    if (!content) return null;
    const lesson: Omit<TextLesson, "id"> = { ...base, kind, content };
    return lesson;
  }
  if (kind === "video") {
    const videoUrl = String(formData.get("videoUrl") || "").trim();
    if (!videoUrl) return null;
    const content = String(formData.get("content") || "").trim();
    const lesson: Omit<VideoLesson, "id"> = { ...base, kind, videoUrl, content: content || undefined };
    return lesson;
  }
  if (kind === "slides") {
    const slidesUrl = String(formData.get("slidesUrl") || "").trim();
    if (!slidesUrl) return null;
    const content = String(formData.get("content") || "").trim();
    const lesson: Omit<SlidesLesson, "id"> = { ...base, kind, slidesUrl, content: content || undefined };
    return lesson;
  }
  if (kind === "quiz") {
    const raw = String(formData.get("questionsJson") || "[]");
    const parsed = quizQuestionsSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return null;
    const lesson: Omit<QuizLesson, "id"> = { ...base, kind, questions: parsed.data };
    return lesson;
  }
  if (kind === "assignment") {
    const instructions = String(formData.get("instructions") || "").trim();
    if (!instructions) return null;
    const submissionType = String(formData.get("submissionType") || "link") as AssignmentSubmissionType;
    const lesson: Omit<AssignmentLesson, "id"> = { ...base, kind, instructions, submissionType };
    return lesson;
  }
  return null;
}

export async function createLessonAction(formData: FormData) {
  requireAdmin();
  const courseId = String(formData.get("courseId") || "");
  const moduleId = String(formData.get("moduleId") || "");
  const lesson = parseLessonFromFormData(formData);
  if (!lesson) redirect(`/admin/courses/${courseId}?error=lesson`);

  await addLesson(courseId, moduleId, lesson!);
  redirect(`/admin/courses/${courseId}`);
}

export async function updateLessonAction(formData: FormData) {
  requireAdmin();
  const courseId = String(formData.get("courseId") || "");
  const moduleId = String(formData.get("moduleId") || "");
  const lessonId = String(formData.get("lessonId") || "");
  const lesson = parseLessonFromFormData(formData);
  if (!lesson) redirect(`/admin/courses/${courseId}?error=lesson`);

  await updateLesson(courseId, moduleId, lessonId, lesson!);
  redirect(`/admin/courses/${courseId}`);
}

export async function deleteLessonAction(formData: FormData) {
  requireAdmin();
  const courseId = String(formData.get("courseId") || "");
  const moduleId = String(formData.get("moduleId") || "");
  const lessonId = String(formData.get("lessonId") || "");
  await deleteLesson(courseId, moduleId, lessonId);
  redirect(`/admin/courses/${courseId}`);
}

export async function reviewSubmissionAction(formData: FormData) {
  requireAdmin();
  const id = String(formData.get("id") || "");
  const feedback = String(formData.get("feedback") || "");
  await reviewAssignmentSubmission(id, feedback);
  redirect("/admin/submissions?reviewed=1");
}
