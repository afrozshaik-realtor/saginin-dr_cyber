import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hasCourseAccess } from "@/lib/services/commerce";
import { endPlaybackSession, recordProgress } from "@/lib/services/playback";
import { getStudentSessionId } from "@/lib/studentAuth";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  playbackId: z.string().min(10).max(40),
  position: z.number().min(0).max(86400),
  end: z.boolean().optional()
});

/** Heartbeat from the player. The client only reports its position; the server decides what counts as watched. */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const studentId = getStudentSessionId();
  if (!studentId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const lesson = /^[a-z0-9]{10,40}$/i.test(params.id)
    ? await prisma.courseLesson.findUnique({ where: { id: params.id } })
    : null;
  if (!lesson || !(await hasCourseAccess(studentId, lesson.courseId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await recordProgress({
    studentId,
    lesson: { id: lesson.id, courseId: lesson.courseId, durationSeconds: lesson.durationSeconds, points: lesson.points },
    playbackId: parsed.data.playbackId,
    position: parsed.data.position
  });
  if (parsed.data.end) await endPlaybackSession(studentId, parsed.data.playbackId);
  if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 409 });
  return NextResponse.json({ percent: result.percent, awardedPoints: result.awardedPoints });
}
