import type { Prisma } from "@prisma/client";
import { ctaLevel, isFunnelStage, stageRank, type FunnelStage } from "@/lib/config/crm";

/** Works with either the global prisma client or a transaction client. */
type Db = Prisma.TransactionClient;

export type CrmEventType =
  | "signed_up"
  | "purchased"
  | "lesson_completed"
  | "course_completed"
  | "clicked_book_1x1"
  | "completed_all"
  | "booked_1x1"
  | "stage_changed"
  | "refunded"
  | "comp_granted"
  | "email_sent"
  | "unsubscribed"
  | "consent_given"
  | "invite_1x1_sent";

export async function logEvent(db: Db, studentId: string, type: CrmEventType, metadata: Record<string, unknown> = {}) {
  await db.event.create({ data: { event: type, studentId, metadataJson: metadata as Prisma.InputJsonValue } });
}

export async function ensureCrm(db: Db, studentId: string) {
  return db.studentCrm.upsert({ where: { studentId }, create: { studentId }, update: {} });
}

/** Move forward only. Returns true if the stage changed. */
export async function advanceStage(db: Db, studentId: string, target: FunnelStage) {
  const crm = await ensureCrm(db, studentId);
  if (stageRank(target) <= stageRank(crm.stage)) return false;
  await db.studentCrm.update({ where: { studentId }, data: { stage: target, stageUpdatedAt: new Date() } });
  await logEvent(db, studentId, "stage_changed", { from: crm.stage, to: target, auto: true });
  return true;
}

/** Admin override: any stage, any direction. */
export async function setStageManually(db: Db, studentId: string, target: string) {
  if (!isFunnelStage(target)) return false;
  const crm = await ensureCrm(db, studentId);
  if (crm.stage === target) return true;
  await db.studentCrm.update({ where: { studentId }, data: { stage: target, stageUpdatedAt: new Date() } });
  await logEvent(db, studentId, "stage_changed", { from: crm.stage, to: target, auto: false });
  return true;
}

export async function addTag(db: Db, studentId: string, tag: string) {
  const crm = await ensureCrm(db, studentId);
  const tags = crm.tags.split(",").filter(Boolean);
  if (tags.includes(tag)) return;
  await db.studentCrm.update({ where: { studentId }, data: { tags: [...tags, tag].join(",") } });
}

export async function onSignedUp(
  db: Db,
  student: { id: string; email: string },
  opts: { consent: boolean; consentText: string; source: string }
) {
  const lead = await db.lead.findUnique({ where: { email: student.email }, select: { id: true } });
  await db.studentCrm.upsert({
    where: { studentId: student.id },
    create: {
      studentId: student.id,
      source: lead ? "quiz" : opts.source,
      leadId: lead?.id ?? null,
      emailConsent: opts.consent,
      consentAt: opts.consent ? new Date() : null,
      consentSource: opts.consent ? "signup_form" : null,
      consentText: opts.consent ? opts.consentText : null
    },
    update: {}
  });
  await logEvent(db, student.id, "signed_up", { source: lead ? "quiz" : opts.source, consent: opts.consent });
  if (opts.consent) await logEvent(db, student.id, "consent_given", { via: "signup_form" });
}

export async function setEmailConsent(db: Db, studentId: string, consent: boolean, via: string, text?: string) {
  await ensureCrm(db, studentId);
  await db.studentCrm.update({
    where: { studentId },
    data: consent
      ? { emailConsent: true, consentAt: new Date(), consentSource: via, consentText: text ?? null }
      : { emailConsent: false }
  });
  await logEvent(db, studentId, consent ? "consent_given" : "unsubscribed", { via });
}

export async function onPurchase(db: Db, studentId: string, info: { orderId: string; includesBundle: boolean; amountCents: number }) {
  await logEvent(db, studentId, "purchased", info);
  await advanceStage(db, studentId, info.includesBundle ? "bought_bundle" : "bought_course");
}

export async function onRefundOrDispute(db: Db, studentId: string, kind: "refunded" | "disputed", orderId: string) {
  await logEvent(db, studentId, "refunded", { kind, orderId }); // stage is NOT rolled back: they did buy
}

/** Course ids that make up "all courses" (the bundle's contents). */
export async function allCourseIds(db: Db) {
  const bundle = await db.product.findFirst({ where: { type: "bundle", active: true }, include: { bundleItems: true } });
  return bundle ? bundle.bundleItems.map((b) => b.courseId) : [];
}

async function countCompletedCourses(db: Db, studentId: string) {
  const [totals, done] = await Promise.all([
    db.courseLesson.groupBy({ by: ["courseId"], _count: { _all: true } }),
    db.watchProgress.groupBy({ by: ["courseId"], where: { studentId, completedAt: { not: null } }, _count: { _all: true } })
  ]);
  const doneBy = new Map(done.map((d) => [d.courseId, d._count._all]));
  const completed = totals.filter((t) => t._count._all > 0 && (doneBy.get(t.courseId) ?? 0) >= t._count._all).map((t) => t.courseId);
  return completed;
}

/**
 * Call when a lesson is newly completed (reached the watch threshold for the first time).
 * Logs lesson_completed, and course_completed / completed_all when those milestones are reached.
 */
export async function onLessonCompleted(
  db: Db,
  studentId: string,
  lesson: { id: string; courseId: string },
  opts: { allCourseIds?: string[] } = {}
) {
  await logEvent(db, studentId, "lesson_completed", { lessonId: lesson.id, courseId: lesson.courseId });

  const completed = await countCompletedCourses(db, studentId);
  await ensureCrm(db, studentId);
  await db.studentCrm.update({ where: { studentId }, data: { completedCourses: completed.length } });

  const courseDone = completed.includes(lesson.courseId);
  if (courseDone) await logEvent(db, studentId, "course_completed", { courseId: lesson.courseId });

  const all = opts.allCourseIds ?? (await allCourseIds(db));
  const completedAll = all.length > 0 && all.every((id) => completed.includes(id));
  let newlyCompletedAll = false;
  if (completedAll) {
    newlyCompletedAll = await advanceStage(db, studentId, "completed_all");
    if (newlyCompletedAll) await logEvent(db, studentId, "completed_all", {});
  }
  return { courseDone, completedAll: newlyCompletedAll };
}

export async function onBookingClicked(db: Db, studentId: string) {
  await logEvent(db, studentId, "clicked_book_1x1", {});
  await addTag(db, studentId, "clicked-1x1");
}

/** Booking confirmed (Calendly webhook), matched by email. */
export async function onBooked(db: Db, email: string) {
  const student = await db.student.findUnique({ where: { email: email.trim().toLowerCase() }, select: { id: true } });
  if (!student) return false;
  await logEvent(db, student.id, "booked_1x1", {});
  await advanceStage(db, student.id, "booked_1x1");
  return true;
}

export async function getCtaLevel(db: Db, studentId: string) {
  const crm = await db.studentCrm.findUnique({ where: { studentId } });
  return crm ? ctaLevel({ stage: crm.stage, completedCourses: crm.completedCourses }) : "none";
}
