import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { presignObjectUrl } from "@/lib/services/storage";

export const dynamic = "force-dynamic";

const schema = z.object({
  courseId: z.string().min(10).max(40),
  contentType: z.enum(["video/mp4", "video/webm", "video/quicktime"])
});
const extensions = { "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" } as const;

/** Admin only: returns a presigned PUT so the browser uploads the video straight to the private R2 bucket. */
export async function POST(request: NextRequest) {
  if (!isAdminSession()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const course = await prisma.course.findUnique({ where: { id: parsed.data.courseId }, select: { id: true } });
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  const key = `videos/${course.id}/${crypto.randomUUID()}.${extensions[parsed.data.contentType]}`;
  const { url } = presignObjectUrl("PUT", key, 15 * 60);
  return NextResponse.json({ key, url, contentType: parsed.data.contentType });
}
