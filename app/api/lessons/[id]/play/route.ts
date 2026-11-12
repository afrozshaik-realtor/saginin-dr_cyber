import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasCourseAccess } from "@/lib/services/commerce";
import { LINK_TTL_SECONDS, openPlaybackSession } from "@/lib/services/playback";
import { presignObjectUrl } from "@/lib/services/storage";
import { getStudentSessionId } from "@/lib/studentAuth";

export const dynamic = "force-dynamic";

/**
 * Returns a short-lived presigned R2 URL for one lesson's video - only if the student is logged in AND has
 * access to the lesson's course. Unknown lessons and non-owned lessons both answer 403, so ids can't be probed.
 */
export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  const studentId = getStudentSessionId();
  if (!studentId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const lesson = /^[a-z0-9]{10,40}$/i.test(params.id)
    ? await prisma.courseLesson.findUnique({ where: { id: params.id } })
    : null;
  if (!lesson || !lesson.r2Key || !(await hasCourseAccess(studentId, lesson.courseId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const opened = await openPlaybackSession(studentId, lesson.id);
  if (!opened.ok) {
    const message =
      opened.reason === "rate_limited"
        ? "Too many requests. Please wait a moment."
        : "You are already watching on 2 devices or tabs. Close one and try again.";
    return NextResponse.json({ error: opened.reason, message }, { status: 429 });
  }

  const { url, expiresAt } = presignObjectUrl("GET", lesson.r2Key, LINK_TTL_SECONDS, {
    query: { "response-content-type": "video/mp4" }
  });
  const progress = await prisma.watchProgress.findUnique({
    where: { studentId_lessonId: { studentId, lessonId: lesson.id } }
  });

  return NextResponse.json(
    {
      url,
      expiresAt: expiresAt.toISOString(),
      playbackId: opened.session.id,
      resumeAt: progress?.completedAt ? 0 : (progress?.lastPosition ?? 0),
      percent: progress?.percent ?? 0
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
