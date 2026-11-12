import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStudentSessionId } from "@/lib/studentAuth";

export const dynamic = "force-dynamic";

/** Read-only: reports whether the webhook has processed this student's checkout. It never grants anything. */
export async function GET(request: NextRequest) {
  const studentId = getStudentSessionId();
  if (!studentId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessionId = request.nextUrl.searchParams.get("session_id") || "";
  if (!/^cs_[A-Za-z0-9_]{10,200}$/.test(sessionId)) {
    return NextResponse.json({ error: "Invalid session" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { stripeSessionId: sessionId },
    include: { items: { include: { product: { include: { bundleItems: true } } } } }
  });
  if (!order || order.studentId !== studentId) return NextResponse.json({ status: "pending" });
  if (order.status !== "paid") return NextResponse.json({ status: order.status });

  const courseIds = Array.from(
    new Set(
      order.items.flatMap((item) =>
        item.product.type === "bundle"
          ? item.product.bundleItems.map((b) => b.courseId)
          : item.product.courseId
            ? [item.product.courseId]
            : []
      )
    )
  );
  const courses = await prisma.course.findMany({
    where: { id: { in: courseIds }, entitlements: { some: { studentId, status: "active" } } },
    orderBy: { sortOrder: "asc" },
    select: { slug: true, title: true }
  });
  return NextResponse.json({ status: "ready", courses });
}
