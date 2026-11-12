import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { objectExists } from "@/lib/services/storage";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  courseId: z.string().min(10).max(40),
  title: z.string().trim().min(1).max(160),
  r2Key: z.string().min(1).max(300),
  durationSeconds: z.number().int().min(1).max(60 * 60 * 4),
  points: z.number().int().min(0).max(1000).default(10)
});

/** Admin only: attach an uploaded video (by R2 key) to a new lesson. The key must live under the course's folder and exist. */
export async function POST(request: NextRequest) {
  if (!isAdminSession()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { courseId, title, r2Key, durationSeconds, points } = parsed.data;

  if (!r2Key.startsWith(`videos/${courseId}/`)) return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  if (!(await objectExists(r2Key))) return NextResponse.json({ error: "Video not found in storage" }, { status: 400 });

  const last = await prisma.courseLesson.findFirst({ where: { courseId }, orderBy: { sortOrder: "desc" } });
  const lesson = await prisma.courseLesson.create({
    data: { courseId, title, r2Key, durationSeconds, points, sortOrder: (last?.sortOrder ?? 0) + 1 }
  });
  return NextResponse.json({ id: lesson.id });
}

export async function DELETE(request: NextRequest) {
  if (!isAdminSession()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const id = request.nextUrl.searchParams.get("id") || "";
  if (!/^[a-z0-9]{10,40}$/i.test(id)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  await prisma.courseLesson.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true });
}
