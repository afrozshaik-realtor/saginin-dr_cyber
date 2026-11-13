"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { setStageManually } from "@/lib/services/crm";

const idPattern = /^[a-z0-9]{10,40}$/i;

export async function moveStageAction(formData: FormData) {
  requireAdmin();
  const studentId = String(formData.get("studentId") || "");
  const stage = String(formData.get("stage") || "");
  if (!idPattern.test(studentId)) redirect("/admin/pipeline");
  await setStageManually(prisma, studentId, stage);
  revalidatePath("/admin/pipeline");
  revalidatePath(`/admin/students/${studentId}`);
  redirect(String(formData.get("back") || "") === "detail" ? `/admin/students/${studentId}` : "/admin/pipeline");
}

export async function saveCrmNotesAction(formData: FormData) {
  requireAdmin();
  const studentId = String(formData.get("studentId") || "");
  if (!idPattern.test(studentId)) redirect("/admin/pipeline");
  const notes = String(formData.get("notes") || "").slice(0, 5000);
  const tags = String(formData.get("tags") || "")
    .split(",")
    .map((t) => t.trim().toLowerCase().replace(/[^a-z0-9_-]/g, ""))
    .filter(Boolean)
    .slice(0, 20)
    .join(",");
  await prisma.studentCrm.upsert({
    where: { studentId },
    create: { studentId, notes, tags },
    update: { notes, tags }
  });
  revalidatePath(`/admin/students/${studentId}`);
  redirect(`/admin/students/${studentId}?saved=1`);
}
