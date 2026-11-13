/**
 * Phase 2 gate tests against a real database, calling the real route handlers.
 *   DATABASE_URL=mysql://... npm test
 */
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { NextRequest } from "next/server";

const jar = new Map<string, string>();
const nextHeaders = require.resolve("next/headers");
require.cache[nextHeaders] = {
  id: nextHeaders, filename: nextHeaders, loaded: true, children: [], paths: [], path: "", parent: null, isPreloading: false,
  exports: {
    cookies: () => ({
      get: (k: string) => (jar.has(k) ? { value: jar.get(k) } : undefined),
      set: (k: string, v: string) => void jar.set(k, v),
      delete: (k: string) => void jar.delete(k)
    })
  }
} as unknown as NodeJS.Module;

process.env.R2_ACCOUNT_ID = "acct123";
process.env.R2_ACCESS_KEY_ID = "AKIDEXAMPLE";
process.env.R2_SECRET_ACCESS_KEY = "secretKEYexample";
process.env.R2_BUCKET_NAME = "dev-bucket";
process.env.STUDENT_SESSION_SECRET = "test-student-secret-0123456789";

const run = Boolean(process.env.DATABASE_URL);
const tag = `pb${Date.now()}`;

describe("protected playback", { skip: !run }, () => {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  let prisma: any, play: any, progress: any, setStudentSession: any, clearStudentSession: any, recordProgress: any;
  let owner = "", stranger = "", courseId = "";
  const lessons: { id: string }[] = [];

  const asStudent = (id: string | null) => (id ? setStudentSession(id) : clearStudentSession());
  const ctx = (id: string) => ({ params: { id } });
  const post = (url: string, body?: unknown) =>
    new NextRequest(`http://localhost${url}`, { method: "POST", body: body ? JSON.stringify(body) : undefined });
  const callPlay = (lessonId: string) => play.POST(post(`/api/lessons/${lessonId}/play`), ctx(lessonId));
  const callProgress = (lessonId: string, body: unknown) =>
    progress.POST(post(`/api/lessons/${lessonId}/progress`, body), ctx(lessonId));
  /** Pretend `seconds` of wall-clock time passed since the session's last heartbeat. */
  const age = (playbackId: string, seconds: number) =>
    prisma.playbackSession.update({ where: { id: playbackId }, data: { lastSeenAt: new Date(Date.now() - seconds * 1000) } });

  before(async () => {
    ({ prisma } = await import("../lib/prisma"));
    play = await import("../app/api/lessons/[id]/play/route");
    progress = await import("../app/api/lessons/[id]/progress/route");
    ({ setStudentSession, clearStudentSession } = await import("../lib/studentAuth"));
    ({ recordProgress } = await import("../lib/services/playback"));

    courseId = (await prisma.course.create({
      data: { slug: `${tag}-c`, title: "T", category: "x", level: "Beginner", summary: "s", description: "d", image: "/x.png", priceCents: 100, currency: "usd", modulesJson: [] }
    })).id;
    for (let i = 0; i < 4; i++) {
      lessons.push(await prisma.courseLesson.create({
        data: { courseId, sortOrder: i + 1, title: `L${i}`, r2Key: `videos/${courseId}/v${i}.mp4`, durationSeconds: 60, points: 10 }
      }));
    }
    owner = (await prisma.student.create({ data: { name: "O", email: `${tag}-o@t.dev`, passwordHash: "x" } })).id;
    stranger = (await prisma.student.create({ data: { name: "S", email: `${tag}-s@t.dev`, passwordHash: "x" } })).id;
    await prisma.entitlement.create({ data: { studentId: owner, courseId, status: "active" } });
  });

  after(async () => {
    if (!run) return;
    await prisma.student.deleteMany({ where: { email: { startsWith: tag } } });
    await prisma.course.deleteMany({ where: { slug: { startsWith: tag } } });
    await prisma.$disconnect();
  });

  test("not logged in -> 401", async () => {
    asStudent(null);
    assert.equal((await callPlay(lessons[0].id)).status, 401);
  });

  test("logged in but did not pay -> 403 for real, garbage and guessed ids (no URL ever returned)", async () => {
    asStudent(stranger);
    for (const id of [lessons[0].id, "clzzzzzzzzzzzzzzzzzzzzzzz", "../../etc/passwd", "1 OR 1=1"]) {
      const res = await callPlay(id);
      assert.equal(res.status, 403, id);
      assert.equal(JSON.stringify(await res.json()).includes("r2.cloudflarestorage"), false);
    }
  });

  test("paid student gets a presigned URL that expires in 1 hour", async () => {
    asStudent(owner);
    const res = await callPlay(lessons[0].id);
    assert.equal(res.status, 200);
    const body = await res.json();
    const url = new URL(body.url);
    assert.equal(url.hostname, "acct123.r2.cloudflarestorage.com");
    assert.equal(url.searchParams.get("X-Amz-Expires"), "3600");
    assert.ok(url.searchParams.get("X-Amz-Signature"));
    assert.ok(Math.abs(new Date(body.expiresAt).getTime() - (Date.now() + 3600_000)) < 5000);
  });

  test("with R2_VIDEO_* set, the play route signs against the video bucket, not the general one", async () => {
    await prisma.playbackSession.deleteMany({ where: { studentId: owner } });
    asStudent(owner);
    process.env.R2_VIDEO_ACCOUNT_ID = "videoacct";
    process.env.R2_VIDEO_ACCESS_KEY_ID = "VIDEOKEYID";
    process.env.R2_VIDEO_SECRET_ACCESS_KEY = "video-secret-value";
    process.env.R2_VIDEO_BUCKET_NAME = "drcyber-videos-prod";
    try {
      const body = await (await callPlay(lessons[0].id)).json();
      const url = new URL(body.url);
      assert.equal(url.hostname, "videoacct.r2.cloudflarestorage.com");
      assert.ok(url.pathname.startsWith("/drcyber-videos-prod/videos/"));
      assert.ok(url.searchParams.get("X-Amz-Credential")?.startsWith("VIDEOKEYID/"));
    } finally {
      for (const k of ["R2_VIDEO_ACCOUNT_ID", "R2_VIDEO_ACCESS_KEY_ID", "R2_VIDEO_SECRET_ACCESS_KEY", "R2_VIDEO_BUCKET_NAME"]) delete process.env[k];
    }
    await prisma.playbackSession.deleteMany({ where: { studentId: owner } });
  });

  test("seeking to the end does not earn points; honest watching earns them once", async () => {
    await prisma.playbackSession.deleteMany({ where: { studentId: owner } });
    asStudent(owner);
    const lesson = lessons[1];
    const { playbackId } = await (await callPlay(lesson.id)).json();

    await age(playbackId, 15);
    const jump = await (await callProgress(lesson.id, { playbackId, position: 60 })).json();
    assert.equal(jump.awardedPoints, 0);
    assert.ok(jump.percent <= 50, `percent after a seek-to-end was ${jump.percent}`);
    assert.equal(await prisma.pointsLedger.count({ where: { studentId: owner, lessonId: lesson.id } }), 0);

    // honest playback: 15s heartbeats, position advancing in real time
    let position = 15;
    let awarded = 0;
    for (let i = 0; i < 6; i++) {
      await age(playbackId, 15);
      position = Math.min(60, position + 15);
      const r = await (await callProgress(lesson.id, { playbackId, position })).json();
      awarded += r.awardedPoints;
    }
    assert.equal(awarded, 10);
    assert.equal(await prisma.pointsLedger.count({ where: { studentId: owner, lessonId: lesson.id } }), 1);

    // replaying requests / re-watching never awards again
    for (let i = 0; i < 3; i++) {
      await age(playbackId, 15);
      const r = await (await callProgress(lesson.id, { playbackId, position: 60 })).json();
      assert.equal(r.awardedPoints, 0);
    }
    assert.equal(await prisma.pointsLedger.count({ where: { studentId: owner, lessonId: lesson.id } }), 1);
  });

  test("hammering the progress endpoint counts nothing extra", async () => {
    await prisma.playbackSession.deleteMany({ where: { studentId: owner } });
    asStudent(owner);
    const lesson = lessons[2];
    const { playbackId } = await (await callPlay(lesson.id)).json();
    await age(playbackId, 15);
    await callProgress(lesson.id, { playbackId, position: 20 });
    const before = (await prisma.watchProgress.findFirst({ where: { studentId: owner, lessonId: lesson.id } })).validatedSeconds;
    await Promise.all(Array.from({ length: 10 }, () => callProgress(lesson.id, { playbackId, position: 60 })));
    const after = (await prisma.watchProgress.findFirst({ where: { studentId: owner, lessonId: lesson.id } })).validatedSeconds;
    assert.equal(after, before);
  });

  test("another student's playbackId is rejected; progress needs a valid session", async () => {
    await prisma.playbackSession.deleteMany({ where: { studentId: owner } });
    asStudent(owner);
    const { playbackId } = await (await callPlay(lessons[3].id)).json();
    asStudent(stranger);
    assert.equal((await callProgress(lessons[3].id, { playbackId, position: 10 })).status, 403); // no access to course
    await prisma.entitlement.create({ data: { studentId: stranger, courseId, status: "active" } });
    assert.equal((await callProgress(lessons[3].id, { playbackId, position: 10 })).status, 409); // not their session
    await prisma.entitlement.update({ where: { studentId_courseId: { studentId: stranger, courseId } }, data: { status: "revoked" } });
  });

  test("a session past its expiry is refused", async () => {
    await prisma.playbackSession.deleteMany({ where: { studentId: owner } });
    asStudent(owner);
    const { playbackId } = await (await callPlay(lessons[0].id)).json();
    await prisma.playbackSession.update({ where: { id: playbackId }, data: { expiresAt: new Date(Date.now() - 20 * 60_000) } });
    const r = await recordProgress({
      studentId: owner, lesson: { id: lessons[0].id, courseId, durationSeconds: 60, points: 10 }, playbackId, position: 5
    });
    assert.equal(r.ok, false);
  });

  test("max 2 concurrent playback sessions", async () => {
    await prisma.playbackSession.deleteMany({ where: { studentId: owner } });
    asStudent(owner);
    assert.equal((await callPlay(lessons[0].id)).status, 200);
    assert.equal((await callPlay(lessons[1].id)).status, 200);
    const third = await callPlay(lessons[2].id);
    assert.equal(third.status, 429);
    // re-opening the same lesson is not a new concurrent session
    assert.equal((await callPlay(lessons[0].id)).status, 200);
  });

  test("link generation is rate limited", async () => {
    await prisma.playbackSession.deleteMany({ where: { studentId: owner } });
    asStudent(owner);
    let limited = 0;
    for (let i = 0; i < 14; i++) if ((await callPlay(lessons[0].id)).status === 429) limited++;
    assert.ok(limited >= 4, `expected 429s, got ${limited}`);
  });

  test("revoked entitlement stops both play and progress immediately", async () => {
    await prisma.playbackSession.deleteMany({ where: { studentId: owner } });
    asStudent(owner);
    const { playbackId } = await (await callPlay(lessons[0].id)).json();
    await prisma.entitlement.update({ where: { studentId_courseId: { studentId: owner, courseId } }, data: { status: "revoked" } });
    assert.equal((await callPlay(lessons[0].id)).status, 403);
    assert.equal((await callProgress(lessons[0].id, { playbackId, position: 10 })).status, 403);
  });
});
