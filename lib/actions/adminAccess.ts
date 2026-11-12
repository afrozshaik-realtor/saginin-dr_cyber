"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { planEntitlements } from "@/lib/entitlementPlan";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const idPattern = /^[a-z0-9]{10,40}$/i;
const grantSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(160),
  productSlug: z.string().regex(/^[a-z0-9-]{1,80}$/),
  note: z.string().trim().max(200).optional()
});

function back(email: string, msg: string): never {
  redirect(`/admin/access?email=${encodeURIComponent(email)}&msg=${msg}`);
}

async function audit(action: string, metadata: Record<string, unknown>) {
  await prisma.event.create({ data: { event: `admin_${action}`, metadataJson: metadata as object } });
}

/** Comp access: grants real entitlements (revocable, shown in the student's library) without a payment. */
export async function compGrantAction(formData: FormData) {
  requireAdmin();
  const parsed = grantSchema.safeParse({
    email: formData.get("email"),
    productSlug: formData.get("productSlug"),
    note: formData.get("note") || undefined
  });
  if (!parsed.success) redirect("/admin/access?msg=invalid");
  const { email, productSlug, note } = parsed.data;

  const student = await prisma.student.findUnique({ where: { email } });
  if (!student) back(email, "nostudent");
  const product = await prisma.product.findUnique({ where: { slug: productSlug }, include: { bundleItems: true } });
  if (!product) back(email, "noproduct");

  const desired = product!.type === "bundle" ? product!.bundleItems.map((b) => b.courseId) : product!.courseId ? [product!.courseId] : [];
  const existing = await prisma.entitlement.findMany({ where: { studentId: student!.id } });
  const plan = planEntitlements(desired, existing);

  if (plan.create.length) {
    await prisma.entitlement.createMany({
      data: plan.create.map((courseId) => ({ studentId: student!.id, courseId, source: "comp", note: note ?? null }))
    });
  }
  if (plan.reactivate.length) {
    await prisma.entitlement.updateMany({
      where: { studentId: student!.id, courseId: { in: plan.reactivate } },
      data: { status: "active", source: "comp", note: note ?? null, revokedAt: null, grantedAt: new Date() }
    });
  }
  await audit("comp_grant", { studentId: student!.id, productSlug, created: plan.create.length, reactivated: plan.reactivate.length, note });
  revalidatePath("/admin/access");
  back(email, "granted");
}

export async function revokeAccessAction(formData: FormData) {
  requireAdmin();
  const studentId = String(formData.get("studentId") || "");
  const courseId = String(formData.get("courseId") || "");
  const email = String(formData.get("email") || "");
  if (!idPattern.test(studentId) || !idPattern.test(courseId)) redirect("/admin/access?msg=invalid");

  await prisma.entitlement.updateMany({
    where: { studentId, courseId, status: "active" },
    data: { status: "revoked", revokedAt: new Date() }
  });
  // Legacy admin-granted enrollments also count as access, so remove those too.
  await prisma.enrollment.deleteMany({ where: { studentId, courseId } });
  await audit("revoke", { studentId, courseId });
  back(email, "revoked");
}

export async function restoreAccessAction(formData: FormData) {
  requireAdmin();
  const studentId = String(formData.get("studentId") || "");
  const courseId = String(formData.get("courseId") || "");
  const email = String(formData.get("email") || "");
  if (!idPattern.test(studentId) || !idPattern.test(courseId)) redirect("/admin/access?msg=invalid");

  await prisma.entitlement.updateMany({
    where: { studentId, courseId, status: "revoked" },
    data: { status: "active", source: "comp", revokedAt: null, grantedAt: new Date() }
  });
  await audit("restore", { studentId, courseId });
  back(email, "restored");
}
