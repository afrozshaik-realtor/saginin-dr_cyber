"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getCourseBySlug } from "@/lib/config/courses";
import { sendCourseAccessEmail } from "@/lib/services/email";
import { createStudent, enrollStudent, getStudentByEmail } from "@/lib/store";
import { createAccessToken, hashPassword } from "@/lib/studentAuth";
import { grantAccessSchema } from "@/lib/validation";

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

  const course = getCourseBySlug(parsed.data.slug);
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
  await sendCourseAccessEmail(student!, course!, accessLink);

  redirect("/admin/students?grant=success");
}
