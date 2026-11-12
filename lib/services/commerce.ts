import { prisma } from "@/lib/prisma";

/** Active course entitlement, OR a legacy enrollment (admin-granted / pre-existing courses). */
export async function hasCourseAccess(studentId: string, courseId: string) {
  const [entitlement, enrollment] = await Promise.all([
    prisma.entitlement.findUnique({ where: { studentId_courseId: { studentId, courseId } } }),
    prisma.enrollment.findUnique({ where: { studentId_courseId: { studentId, courseId } } })
  ]);
  return entitlement?.status === "active" || Boolean(enrollment);
}

export async function listActiveEntitlementCourseIds(studentId: string) {
  const rows = await prisma.entitlement.findMany({ where: { studentId, status: "active" }, select: { courseId: true } });
  return rows.map((r) => r.courseId);
}

export function getCourseProduct(courseId: string) {
  return prisma.product.findFirst({ where: { type: "course", courseId, active: true } });
}

export function getBundleProduct() {
  return prisma.product.findFirst({
    where: { type: "bundle", active: true },
    include: { bundleItems: true }
  });
}

export function getProductsBySlugs(slugs: string[]) {
  return prisma.product.findMany({
    where: { slug: { in: slugs }, active: true },
    include: { bundleItems: true, course: { select: { id: true, slug: true, title: true } } }
  });
}
