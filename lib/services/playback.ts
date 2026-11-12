import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { advanceValidated, percentWatched, reachedPointsThreshold } from "@/lib/progressLogic";

export const LINK_TTL_SECONDS = 3600; // presigned video URLs live for 1 hour
export const MAX_CONCURRENT_SESSIONS = 2;
export const SESSION_ACTIVE_WINDOW_MS = 90_000; // a session with no heartbeat for 90s no longer counts
export const MAX_LINKS_PER_MINUTE = 10;
const MIN_REPORT_INTERVAL_MS = 4_000;

/** Open a playback session for (student, lesson). Returns why not, if limits are hit. */
export async function openPlaybackSession(studentId: string, lessonId: string) {
  const now = new Date();

  const recent = await prisma.playbackSession.count({
    where: { studentId, createdAt: { gt: new Date(now.getTime() - 60_000) } }
  });
  if (recent >= MAX_LINKS_PER_MINUTE) return { ok: false as const, reason: "rate_limited" as const };

  // Re-opening the same lesson (reload, expired link) replaces its previous session.
  await prisma.playbackSession.updateMany({
    where: { studentId, lessonId, endedAt: null },
    data: { endedAt: now }
  });

  const active = await prisma.playbackSession.count({
    where: { studentId, endedAt: null, lastSeenAt: { gt: new Date(now.getTime() - SESSION_ACTIVE_WINDOW_MS) } }
  });
  if (active >= MAX_CONCURRENT_SESSIONS) return { ok: false as const, reason: "too_many_sessions" as const };

  const session = await prisma.playbackSession.create({
    data: { studentId, lessonId, expiresAt: new Date(now.getTime() + LINK_TTL_SECONDS * 1000), lastSeenAt: now }
  });
  return { ok: true as const, session };
}

export async function endPlaybackSession(studentId: string, playbackId: string) {
  await prisma.playbackSession.updateMany({
    where: { id: playbackId, studentId, endedAt: null },
    data: { endedAt: new Date() }
  });
}

/**
 * Apply a heartbeat. Returns the (possibly unchanged) progress and any points newly awarded.
 * Concurrency-safe: the session's lastSeenAt is used as an optimistic lock, so two simultaneous or
 * replayed requests can't both count the same elapsed time.
 */
export async function recordProgress(input: {
  studentId: string;
  lesson: { id: string; courseId: string; durationSeconds: number; points: number };
  playbackId: string;
  position: number;
}) {
  const { studentId, lesson, playbackId, position } = input;
  const now = new Date();

  const session = await prisma.playbackSession.findUnique({ where: { id: playbackId } });
  if (!session || session.studentId !== studentId || session.lessonId !== lesson.id || session.endedAt) {
    return { ok: false as const, reason: "no_session" as const };
  }
  if (now.getTime() > session.expiresAt.getTime() + 10 * 60_000) {
    return { ok: false as const, reason: "expired" as const };
  }

  const progress = await prisma.watchProgress.upsert({
    where: { studentId_lessonId: { studentId, lessonId: lesson.id } },
    create: { studentId, courseId: lesson.courseId, lessonId: lesson.id },
    update: {}
  });

  const elapsedMs = now.getTime() - session.lastSeenAt.getTime();
  if (elapsedMs < MIN_REPORT_INTERVAL_MS) {
    // Too soon after the last report: ignore (flood protection), nothing counted.
    return { ok: true as const, percent: progress.percent, awardedPoints: 0 };
  }

  // Claim this time window; if another request already did, count nothing.
  const claimed = await prisma.playbackSession.updateMany({
    where: { id: session.id, lastSeenAt: session.lastSeenAt },
    data: { lastSeenAt: now }
  });
  if (claimed.count === 0) return { ok: true as const, percent: progress.percent, awardedPoints: 0 };

  const validated = advanceValidated({
    validatedSeconds: progress.validatedSeconds,
    reportedPosition: position,
    elapsedSeconds: elapsedMs / 1000,
    durationSeconds: lesson.durationSeconds
  });
  const percent = percentWatched(validated, lesson.durationSeconds);
  const done = reachedPointsThreshold(validated, lesson.durationSeconds);

  await prisma.watchProgress.update({
    where: { id: progress.id },
    data: {
      validatedSeconds: validated,
      lastPosition: Math.max(0, Math.min(position, lesson.durationSeconds)),
      percent,
      ...(done && !progress.completedAt ? { completedAt: now } : {})
    }
  });

  let awardedPoints = 0;
  if (done) {
    try {
      await prisma.pointsLedger.create({
        data: { studentId, lessonId: lesson.id, courseId: lesson.courseId, points: lesson.points, reason: "lesson_watched" }
      });
      awardedPoints = lesson.points;
    } catch (error) {
      // Unique (student, lesson, reason): already awarded - this is the idempotency guard.
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
    }
  }
  return { ok: true as const, percent, awardedPoints };
}

export async function getTotalPoints(studentId: string) {
  const sum = await prisma.pointsLedger.aggregate({ where: { studentId }, _sum: { points: true } });
  return sum._sum.points ?? 0;
}
