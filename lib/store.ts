import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildSeedCourses } from "@/lib/config/courses";
import type { FunnelLead, MessageLog, PipelineRecord, QuizResponseRecord } from "@/types/funnel";
import type {
  AdminUser,
  AssignmentSubmission,
  Course,
  CourseModule,
  Enrollment,
  Lesson,
  LessonProgressRecord,
  PaymentStatus,
  QuizAttempt,
  Student
} from "@/types/lms";

type EventRecord = {
  id: string;
  leadId?: string;
  sessionId?: string;
  event: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

// --- Serializers: Prisma rows (Date objects, nullable columns) -> app types (ISO strings, `?` fields) ---

function serializeLead(row: Prisma.LeadGetPayload<object>): FunnelLead {
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    phone: row.phone ?? undefined,
    currentProfession: row.currentProfession,
    city: row.city,
    country: row.country,
    startTimeline: row.startTimeline,
    consent: row.consent,
    source: row.source ?? undefined,
    utmSource: row.utmSource ?? undefined,
    utmMedium: row.utmMedium ?? undefined,
    utmCampaign: row.utmCampaign ?? undefined,
    utmContent: row.utmContent ?? undefined,
    utmTerm: row.utmTerm ?? undefined,
    pathwayResult: row.pathwayResult,
    pathwayScoreJson: row.pathwayScoreJson as Record<string, number>,
    tag: row.tag ?? "",
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function serializeQuizResponse(row: Prisma.QuizResponseGetPayload<object>): QuizResponseRecord {
  return {
    id: row.id,
    leadId: row.leadId,
    questionId: row.questionId,
    questionText: row.questionText,
    selectedAnswer: row.selectedAnswer,
    answerScoreJson: row.answerScoreJson as QuizResponseRecord["answerScoreJson"],
    createdAt: row.createdAt.toISOString()
  };
}

function serializePipeline(row: Prisma.PipelineStageGetPayload<object>): PipelineRecord {
  return {
    id: row.id,
    leadId: row.leadId,
    stage: row.stage,
    status: row.status,
    notes: row.notes ?? undefined,
    assignedTo: row.assignedTo ?? undefined,
    lastContactedAt: row.lastContactedAt ? row.lastContactedAt.toISOString() : undefined,
    nextFollowUpAt: row.nextFollowUpAt ? row.nextFollowUpAt.toISOString() : undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function serializeEmailLog(row: Prisma.EmailLogGetPayload<object>): MessageLog {
  return {
    id: row.id,
    leadId: row.leadId,
    type: row.emailType,
    subject: row.subject,
    status: row.status,
    sentAt: row.sentAt ? row.sentAt.toISOString() : undefined,
    openedAt: row.openedAt ? row.openedAt.toISOString() : undefined,
    clickedAt: row.clickedAt ? row.clickedAt.toISOString() : undefined
  };
}

function serializeSmsLog(row: Prisma.SmsLogGetPayload<object>): MessageLog {
  return {
    id: row.id,
    leadId: row.leadId,
    type: row.smsType,
    message: row.message,
    status: row.status,
    sentAt: row.sentAt ? row.sentAt.toISOString() : undefined
  };
}

function serializeEvent(row: Prisma.EventGetPayload<object>): EventRecord {
  return {
    id: row.id,
    event: row.event,
    leadId: row.leadId ?? undefined,
    sessionId: row.sessionId ?? undefined,
    metadata: (row.metadataJson as Record<string, unknown>) ?? undefined,
    createdAt: row.createdAt.toISOString()
  };
}

function serializeStudent(row: Prisma.StudentGetPayload<object>): Student {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.passwordHash,
    createdAt: row.createdAt.toISOString()
  };
}

function serializeAdminUser(row: Prisma.AdminUserGetPayload<object>): AdminUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.passwordHash,
    role: row.role,
    createdAt: row.createdAt.toISOString()
  };
}

function serializeEnrollment(row: Prisma.EnrollmentGetPayload<object>): Enrollment {
  return {
    id: row.id,
    studentId: row.studentId,
    courseId: row.courseId,
    enrolledAt: row.enrolledAt.toISOString(),
    completedAt: row.completedAt ? row.completedAt.toISOString() : undefined,
    paymentStatus: row.paymentStatus as PaymentStatus,
    amountPaidCents: row.amountPaidCents ?? undefined,
    currency: row.currency ?? undefined,
    stripeSessionId: row.stripeSessionId ?? undefined
  };
}

function serializeLessonProgress(row: Prisma.LessonProgressGetPayload<object>): LessonProgressRecord {
  return {
    id: row.id,
    studentId: row.studentId,
    courseId: row.courseId,
    lessonId: row.lessonId,
    completed: row.completed,
    completedAt: row.completedAt ? row.completedAt.toISOString() : undefined
  };
}

function serializeCourse(row: Prisma.CourseGetPayload<object>): Course {
  return {
    id: row.id,
    slug: row.slug,
    pathwayId: row.pathwayId ?? "",
    title: row.title,
    category: row.category,
    level: row.level as Course["level"],
    summary: row.summary,
    description: row.description,
    certification: row.certification ?? "",
    image: row.image,
    priceCents: row.priceCents,
    currency: row.currency,
    published: row.published,
    modules: (row.modulesJson as unknown as CourseModule[]) ?? []
  };
}

function serializeQuizAttempt(row: Prisma.QuizAttemptGetPayload<object>): QuizAttempt {
  return {
    id: row.id,
    studentId: row.studentId,
    courseId: row.courseId,
    lessonId: row.lessonId,
    answers: row.answersJson as Record<string, string>,
    scorePercent: row.scorePercent,
    correctCount: row.correctCount,
    totalCount: row.totalCount,
    submittedAt: row.submittedAt.toISOString()
  };
}

function serializeSubmission(row: Prisma.AssignmentSubmissionGetPayload<object>): AssignmentSubmission {
  return {
    id: row.id,
    studentId: row.studentId,
    courseId: row.courseId,
    lessonId: row.lessonId,
    submissionType: row.submissionType as AssignmentSubmission["submissionType"],
    fileUrl: row.fileUrl ?? undefined,
    fileName: row.fileName ?? undefined,
    link: row.link ?? undefined,
    text: row.text ?? undefined,
    answers: (row.answersJson as Record<string, string | boolean>) ?? undefined,
    status: row.status as AssignmentSubmission["status"],
    feedback: row.feedback ?? undefined,
    submittedAt: row.submittedAt.toISOString(),
    reviewedAt: row.reviewedAt ? row.reviewedAt.toISOString() : undefined
  };
}

// --- Course catalog seeding: mirrors the old JSON store's "seed on first read" behavior ---

let coursesSeeded = false;

async function ensureCoursesSeeded() {
  if (coursesSeeded) return;
  const count = await prisma.course.count();
  if (count === 0) {
    const seedCourses = buildSeedCourses();
    await prisma.course.createMany({
      data: seedCourses.map((course) => ({
        id: course.id,
        slug: course.slug,
        pathwayId: course.pathwayId || null,
        title: course.title,
        category: course.category,
        level: course.level,
        summary: course.summary,
        description: course.description,
        certification: course.certification || null,
        image: course.image,
        priceCents: course.priceCents,
        currency: course.currency,
        published: course.published,
        modulesJson: course.modules as unknown as Prisma.InputJsonValue
      }))
    });
  }
  coursesSeeded = true;
}

export async function trackEvent(event: string, metadata: Record<string, unknown> = {}) {
  const leadId = typeof metadata.leadId === "string" ? metadata.leadId : undefined;
  const sessionId = typeof metadata.sessionId === "string" ? metadata.sessionId : undefined;
  const row = await prisma.event.create({
    data: {
      event,
      leadId,
      sessionId,
      metadataJson: metadata as unknown as Prisma.InputJsonValue
    }
  });
  return serializeEvent(row);
}

export async function createQuizSession(metadata: Record<string, unknown>) {
  const sessionId = randomUUID();
  await trackEvent("Quiz Started", { ...metadata, sessionId });
  return { sessionId };
}

export async function upsertLead(input: Omit<FunnelLead, "id" | "createdAt" | "updatedAt">) {
  const existing = await prisma.lead.findUnique({ where: { email: input.email } });
  const data = {
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    phone: input.phone,
    currentProfession: input.currentProfession,
    city: input.city,
    country: input.country,
    startTimeline: input.startTimeline,
    pathwayResult: input.pathwayResult,
    pathwayScoreJson: input.pathwayScoreJson as unknown as Prisma.InputJsonValue,
    source: input.source,
    utmSource: input.utmSource,
    utmMedium: input.utmMedium,
    utmCampaign: input.utmCampaign,
    utmContent: input.utmContent,
    utmTerm: input.utmTerm,
    tag: input.tag,
    consent: input.consent
  };

  let row;
  if (existing) {
    await prisma.quizResponse.deleteMany({ where: { leadId: existing.id } });
    row = await prisma.lead.update({ where: { id: existing.id }, data });
  } else {
    row = await prisma.lead.create({ data });
  }
  return serializeLead(row);
}

export async function saveQuizResponses(
  leadId: string,
  responses: Omit<QuizResponseRecord, "id" | "leadId" | "createdAt">[]
) {
  if (!responses.length) return;
  await prisma.quizResponse.createMany({
    data: responses.map((response) => ({
      leadId,
      questionId: response.questionId,
      questionText: response.questionText,
      selectedAnswer: response.selectedAnswer,
      answerScoreJson: response.answerScoreJson as unknown as Prisma.InputJsonValue
    }))
  });
}

export async function setPipelineStage(leadId: string, stage: string, patch: Partial<PipelineRecord> = {}) {
  const existing = await prisma.pipelineStage.findFirst({ where: { leadId } });
  const data = {
    leadId,
    stage,
    status: patch.status || existing?.status || "Open",
    notes: patch.notes ?? existing?.notes ?? null,
    assignedTo: patch.assignedTo ?? existing?.assignedTo ?? null,
    lastContactedAt: patch.lastContactedAt
      ? new Date(patch.lastContactedAt)
      : existing?.lastContactedAt ?? null,
    nextFollowUpAt: patch.nextFollowUpAt ? new Date(patch.nextFollowUpAt) : existing?.nextFollowUpAt ?? null
  };
  const row = existing
    ? await prisma.pipelineStage.update({ where: { id: existing.id }, data })
    : await prisma.pipelineStage.create({ data });
  return serializePipeline(row);
}

export async function logEmail(leadId: string, type: string, subject: string, status: string) {
  await prisma.emailLog.create({
    data: { leadId, emailType: type, subject, status, sentAt: new Date() }
  });
}

export async function logSms(leadId: string, type: string, message: string, status: string) {
  await prisma.smsLog.create({
    data: { leadId, smsType: type, message, status, sentAt: new Date() }
  });
}

export async function listLeads(filters: Record<string, string | undefined> = {}) {
  const rows = await prisma.lead.findMany({
    include: { pipelineStages: true },
    orderBy: { createdAt: "desc" }
  });
  return rows
    .map((row) => {
      const lead = serializeLead(row);
      const pipeline = row.pipelineStages[0] ? serializePipeline(row.pipelineStages[0]) : undefined;
      return { ...lead, pipeline };
    })
    .filter((lead) => {
      const q = filters.q?.toLowerCase();
      if (q) {
        const blob = [
          lead.firstName,
          lead.lastName,
          lead.email,
          lead.phone,
          lead.currentProfession,
          lead.pathwayResult
        ]
          .join(" ")
          .toLowerCase();
        if (!blob.includes(q)) return false;
      }
      if (filters.pathway && lead.pathwayResult !== filters.pathway) return false;
      if (filters.stage && lead.pipeline?.stage !== filters.stage) return false;
      if (filters.startTimeline && lead.startTimeline !== filters.startTimeline) return false;
      return true;
    });
}

export async function getLead(id: string) {
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return null;
  const [quizResponses, pipeline, emailLogs, smsLogs, events] = await Promise.all([
    prisma.quizResponse.findMany({ where: { leadId: id } }),
    prisma.pipelineStage.findFirst({ where: { leadId: id } }),
    prisma.emailLog.findMany({ where: { leadId: id } }),
    prisma.smsLog.findMany({ where: { leadId: id } }),
    prisma.event.findMany({ where: { leadId: id } })
  ]);
  return {
    lead: serializeLead(lead),
    quizResponses: quizResponses.map(serializeQuizResponse),
    pipeline: pipeline ? serializePipeline(pipeline) : undefined,
    emailLogs: emailLogs.map(serializeEmailLog),
    smsLogs: smsLogs.map(serializeSmsLog),
    events: events.map(serializeEvent)
  };
}

export async function getMetrics() {
  const [totalLeads, quizCompletions, callsBooked, enrolled, leads, totalStudents, totalEnrollments, paidEnrollments] =
    await Promise.all([
      prisma.lead.count(),
      prisma.event.count({ where: { event: "Quiz Completed" } }),
      prisma.pipelineStage.count({ where: { stage: "Call Booked" } }),
      prisma.pipelineStage.count({ where: { stage: "Enrolled" } }),
      prisma.lead.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.student.count(),
      prisma.enrollment.count(),
      prisma.enrollment.findMany({ where: { paymentStatus: "paid" }, select: { amountPaidCents: true } })
    ]);
  const leadsByPathway = leads.reduce<Record<string, number>>((acc, lead) => {
    acc[lead.pathwayResult] = (acc[lead.pathwayResult] || 0) + 1;
    return acc;
  }, {});
  return {
    totalLeads,
    quizCompletions,
    callsBooked,
    enrolled,
    conversionRate: quizCompletions ? Math.round((callsBooked / quizCompletions) * 100) : 0,
    leadsByPathway,
    recentLeads: leads.slice(-8).reverse().map(serializeLead),
    totalStudents,
    totalEnrollments,
    totalRevenueCents: paidEnrollments.reduce((sum, enrollment) => sum + (enrollment.amountPaidCents || 0), 0)
  };
}

export async function createStudent(input: { name: string; email: string; passwordHash: string }) {
  const existing = await prisma.student.findUnique({ where: { email: input.email } });
  if (existing) return null;
  const row = await prisma.student.create({ data: input });
  return serializeStudent(row);
}

export async function getStudentByEmail(email: string) {
  const row = await prisma.student.findUnique({ where: { email } });
  return row ? serializeStudent(row) : null;
}

export async function getStudentById(id: string) {
  const row = await prisma.student.findUnique({ where: { id } });
  return row ? serializeStudent(row) : null;
}

export async function updateStudentPassword(id: string, passwordHash: string) {
  const existing = await prisma.student.findUnique({ where: { id } });
  if (!existing) return null;
  const row = await prisma.student.update({ where: { id }, data: { passwordHash } });
  return serializeStudent(row);
}

export async function countAdminUsers() {
  return prisma.adminUser.count();
}

export async function getAdminUserByEmail(email: string) {
  const row = await prisma.adminUser.findUnique({ where: { email } });
  return row ? serializeAdminUser(row) : null;
}

export async function createAdminUser(input: { name: string; email: string; passwordHash: string }) {
  const existing = await prisma.adminUser.findUnique({ where: { email: input.email } });
  if (existing) return null;
  const row = await prisma.adminUser.create({ data: { ...input, role: "admin" } });
  return serializeAdminUser(row);
}

export async function enrollStudent(
  studentId: string,
  courseId: string,
  payment: {
    paymentStatus: Enrollment["paymentStatus"];
    amountPaidCents?: number;
    currency?: string;
    stripeSessionId?: string;
  }
) {
  const row = await prisma.enrollment.upsert({
    where: { studentId_courseId: { studentId, courseId } },
    create: {
      studentId,
      courseId,
      paymentStatus: payment.paymentStatus,
      amountPaidCents: payment.amountPaidCents,
      currency: payment.currency,
      stripeSessionId: payment.stripeSessionId
    },
    update: {
      paymentStatus: payment.paymentStatus,
      ...(payment.amountPaidCents !== undefined ? { amountPaidCents: payment.amountPaidCents } : {}),
      ...(payment.currency !== undefined ? { currency: payment.currency } : {}),
      ...(payment.stripeSessionId !== undefined ? { stripeSessionId: payment.stripeSessionId } : {})
    }
  });
  return serializeEnrollment(row);
}

export async function getEnrollment(studentId: string, courseId: string) {
  const row = await prisma.enrollment.findUnique({ where: { studentId_courseId: { studentId, courseId } } });
  return row ? serializeEnrollment(row) : null;
}

export async function listEnrollmentsForStudent(studentId: string) {
  const rows = await prisma.enrollment.findMany({ where: { studentId }, orderBy: { enrolledAt: "desc" } });
  return rows.map(serializeEnrollment);
}

export async function setLessonProgress(studentId: string, courseId: string, lessonId: string, completed: boolean) {
  const row = await prisma.lessonProgress.upsert({
    where: { studentId_lessonId: { studentId, lessonId } },
    create: { studentId, courseId, lessonId, completed, completedAt: completed ? new Date() : null },
    update: { completed, completedAt: completed ? new Date() : null }
  });
  return serializeLessonProgress(row);
}

export async function getLessonProgressMap(studentId: string, courseId: string) {
  const rows = await prisma.lessonProgress.findMany({ where: { studentId, courseId } });
  const map: Record<string, boolean> = {};
  rows.forEach((row) => {
    map[row.lessonId] = row.completed;
  });
  return map;
}

export async function listCompletedLessonCounts(): Promise<Record<string, number>> {
  const rows = await prisma.lessonProgress.groupBy({
    by: ["studentId", "courseId"],
    where: { completed: true },
    _count: { _all: true }
  });
  const map: Record<string, number> = {};
  for (const row of rows) {
    map[`${row.studentId}:${row.courseId}`] = row._count._all;
  }
  return map;
}

export async function listStudentsWithStats() {
  const rows = await prisma.student.findMany({
    include: { enrollments: true },
    orderBy: { createdAt: "desc" }
  });
  return rows.map((row) => ({
    ...serializeStudent(row),
    enrollments: row.enrollments.map(serializeEnrollment)
  }));
}

// --- Courses ---

export async function listCourses() {
  await ensureCoursesSeeded();
  const rows = await prisma.course.findMany({ where: { published: true } });
  return rows.map(serializeCourse);
}

export async function listAllCoursesAdmin() {
  await ensureCoursesSeeded();
  const rows = await prisma.course.findMany();
  return rows.map(serializeCourse);
}

export async function getCourseBySlug(slug: string) {
  await ensureCoursesSeeded();
  const row = await prisma.course.findUnique({ where: { slug } });
  return row ? serializeCourse(row) : null;
}

export async function getCourseById(id: string) {
  await ensureCoursesSeeded();
  const row = await prisma.course.findUnique({ where: { id } });
  return row ? serializeCourse(row) : null;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function createCourse(input: {
  title: string;
  category: string;
  level: Course["level"];
  summary: string;
  description: string;
  certification: string;
  image: string;
  priceCents: number;
  currency: string;
  published: boolean;
}) {
  await ensureCoursesSeeded();
  const baseSlug = slugify(input.title) || randomUUID();
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.course.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${++suffix}`;
  }
  const row = await prisma.course.create({
    data: {
      slug,
      pathwayId: "",
      title: input.title,
      category: input.category,
      level: input.level,
      summary: input.summary,
      description: input.description,
      certification: input.certification,
      image: input.image,
      priceCents: input.priceCents,
      currency: input.currency,
      published: input.published,
      modulesJson: [] as unknown as Prisma.InputJsonValue
    }
  });
  return serializeCourse(row);
}

export async function updateCourse(
  id: string,
  patch: Partial<{
    title: string;
    category: string;
    level: Course["level"];
    summary: string;
    description: string;
    certification: string;
    image: string;
    priceCents: number;
    currency: string;
    published: boolean;
  }>
) {
  const existing = await prisma.course.findUnique({ where: { id } });
  if (!existing) return null;
  const row = await prisma.course.update({ where: { id }, data: patch });
  return serializeCourse(row);
}

export async function deleteCourse(id: string) {
  await prisma.course.deleteMany({ where: { id } });
}

async function getCourseModules(courseId: string): Promise<CourseModule[] | null> {
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { modulesJson: true } });
  if (!course) return null;
  return (course.modulesJson as unknown as CourseModule[]) ?? [];
}

async function saveCourseModules(courseId: string, modules: CourseModule[]) {
  await prisma.course.update({
    where: { id: courseId },
    data: { modulesJson: modules as unknown as Prisma.InputJsonValue }
  });
}

export async function addModule(courseId: string, title: string) {
  const modules = await getCourseModules(courseId);
  if (!modules) return null;
  const courseModule: CourseModule = { id: randomUUID(), title, lessons: [] };
  modules.push(courseModule);
  await saveCourseModules(courseId, modules);
  return courseModule;
}

export async function updateModule(courseId: string, moduleId: string, title: string) {
  const modules = await getCourseModules(courseId);
  const courseModule = modules?.find((m) => m.id === moduleId);
  if (!modules || !courseModule) return null;
  courseModule.title = title;
  await saveCourseModules(courseId, modules);
  return courseModule;
}

export async function deleteModule(courseId: string, moduleId: string) {
  const modules = await getCourseModules(courseId);
  if (!modules) return;
  await saveCourseModules(
    courseId,
    modules.filter((m) => m.id !== moduleId)
  );
}

export async function reorderModules(courseId: string, moduleIds: string[]) {
  const modules = await getCourseModules(courseId);
  if (!modules) return;
  const byId = new Map(modules.map((m) => [m.id, m]));
  const reordered = moduleIds.map((id) => byId.get(id)).filter((m): m is CourseModule => Boolean(m));
  await saveCourseModules(courseId, reordered);
}

export async function addLesson(courseId: string, moduleId: string, lesson: Omit<Lesson, "id">) {
  const modules = await getCourseModules(courseId);
  const courseModule = modules?.find((m) => m.id === moduleId);
  if (!modules || !courseModule) return null;
  const newLesson = { ...lesson, id: randomUUID() } as Lesson;
  courseModule.lessons.push(newLesson);
  await saveCourseModules(courseId, modules);
  return newLesson;
}

export async function updateLesson(courseId: string, moduleId: string, lessonId: string, lesson: Omit<Lesson, "id">) {
  const modules = await getCourseModules(courseId);
  const courseModule = modules?.find((m) => m.id === moduleId);
  if (!modules || !courseModule) return null;
  const index = courseModule.lessons.findIndex((l) => l.id === lessonId);
  if (index < 0) return null;
  courseModule.lessons[index] = { ...lesson, id: lessonId } as Lesson;
  await saveCourseModules(courseId, modules);
  return courseModule.lessons[index];
}

export async function deleteLesson(courseId: string, moduleId: string, lessonId: string) {
  const modules = await getCourseModules(courseId);
  const courseModule = modules?.find((m) => m.id === moduleId);
  if (!modules || !courseModule) return;
  courseModule.lessons = courseModule.lessons.filter((l) => l.id !== lessonId);
  await saveCourseModules(courseId, modules);
}

export async function reorderLessons(courseId: string, moduleId: string, lessonIds: string[]) {
  const modules = await getCourseModules(courseId);
  const courseModule = modules?.find((m) => m.id === moduleId);
  if (!modules || !courseModule) return;
  const byId = new Map(courseModule.lessons.map((l) => [l.id, l]));
  courseModule.lessons = lessonIds.map((id) => byId.get(id)).filter((l): l is Lesson => Boolean(l));
  await saveCourseModules(courseId, modules);
}

// --- Quiz attempts ---

export async function recordQuizAttempt(input: Omit<QuizAttempt, "id" | "submittedAt">) {
  const row = await prisma.quizAttempt.create({
    data: {
      studentId: input.studentId,
      courseId: input.courseId,
      lessonId: input.lessonId,
      answersJson: input.answers as unknown as Prisma.InputJsonValue,
      scorePercent: input.scorePercent,
      correctCount: input.correctCount,
      totalCount: input.totalCount
    }
  });
  return serializeQuizAttempt(row);
}

export async function getLatestQuizAttempt(studentId: string, lessonId: string) {
  const row = await prisma.quizAttempt.findFirst({
    where: { studentId, lessonId },
    orderBy: { submittedAt: "desc" }
  });
  return row ? serializeQuizAttempt(row) : null;
}

/** Latest attempt per lesson for every quiz lesson a student has taken in a course, keyed by lessonId. */
export async function getLatestQuizAttemptsForCourse(studentId: string, courseId: string) {
  const rows = await prisma.quizAttempt.findMany({
    where: { studentId, courseId },
    orderBy: { submittedAt: "desc" }
  });
  const byLessonId = new Map<string, QuizAttempt>();
  for (const row of rows) {
    if (!byLessonId.has(row.lessonId)) byLessonId.set(row.lessonId, serializeQuizAttempt(row));
  }
  return byLessonId;
}

/** Every quiz attempt a student has ever submitted, across all courses, most recent first. */
export async function listQuizAttemptsForStudent(studentId: string) {
  const rows = await prisma.quizAttempt.findMany({
    where: { studentId },
    orderBy: { submittedAt: "desc" }
  });
  return rows.map(serializeQuizAttempt);
}

// --- Assignment submissions ---

export async function createAssignmentSubmission(
  input: Omit<AssignmentSubmission, "id" | "submittedAt" | "status" | "feedback" | "reviewedAt">
) {
  const row = await prisma.assignmentSubmission.upsert({
    where: { studentId_lessonId: { studentId: input.studentId, lessonId: input.lessonId } },
    create: {
      studentId: input.studentId,
      courseId: input.courseId,
      lessonId: input.lessonId,
      submissionType: input.submissionType,
      fileUrl: input.fileUrl,
      fileName: input.fileName,
      link: input.link,
      text: input.text,
      answersJson: input.answers as unknown as Prisma.InputJsonValue,
      status: "submitted"
    },
    update: {
      courseId: input.courseId,
      submissionType: input.submissionType,
      fileUrl: input.fileUrl ?? null,
      fileName: input.fileName ?? null,
      link: input.link ?? null,
      text: input.text ?? null,
      answersJson: input.answers ? (input.answers as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
      status: "submitted",
      feedback: null,
      reviewedAt: null
    }
  });
  return serializeSubmission(row);
}

export async function getAssignmentSubmission(studentId: string, lessonId: string) {
  const row = await prisma.assignmentSubmission.findUnique({
    where: { studentId_lessonId: { studentId, lessonId } }
  });
  return row ? serializeSubmission(row) : null;
}

export async function getAssignmentSubmissionByFileUrl(fileUrl: string) {
  const row = await prisma.assignmentSubmission.findFirst({ where: { fileUrl } });
  return row ? serializeSubmission(row) : null;
}

export async function reviewAssignmentSubmission(id: string, feedback: string) {
  const existing = await prisma.assignmentSubmission.findUnique({ where: { id } });
  if (!existing) return null;
  const row = await prisma.assignmentSubmission.update({
    where: { id },
    data: { status: "reviewed", feedback, reviewedAt: new Date() }
  });
  return serializeSubmission(row);
}

export async function listAllSubmissions() {
  const rows = await prisma.assignmentSubmission.findMany({ orderBy: { submittedAt: "desc" } });
  return rows.map(serializeSubmission);
}
