import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { FunnelLead, MessageLog, PipelineRecord, QuizResponseRecord } from "@/types/funnel";
import type { Enrollment, LessonProgressRecord, Student } from "@/types/lms";

type EventRecord = {
  id: string;
  leadId?: string;
  sessionId?: string;
  event: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

type DataStore = {
  leads: FunnelLead[];
  quizResponses: QuizResponseRecord[];
  pipelineStages: PipelineRecord[];
  emailLogs: MessageLog[];
  smsLogs: MessageLog[];
  events: EventRecord[];
  settings: Record<string, string>;
  students: Student[];
  enrollments: Enrollment[];
  lessonProgress: LessonProgressRecord[];
};

const dataDir = path.join(process.cwd(), ".data");
const dataFile = path.join(dataDir, "store.json");

const emptyStore = (): DataStore => ({
  leads: [],
  quizResponses: [],
  pipelineStages: [],
  emailLogs: [],
  smsLogs: [],
  events: [],
  settings: {},
  students: [],
  enrollments: [],
  lessonProgress: []
});

async function readStore(): Promise<DataStore> {
  try {
    const raw = await fs.readFile(dataFile, "utf8");
    return { ...emptyStore(), ...JSON.parse(raw) };
  } catch {
    return emptyStore();
  }
}

async function writeStore(store: DataStore) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(dataFile, JSON.stringify(store, null, 2));
}

export async function trackEvent(event: string, metadata: Record<string, unknown> = {}) {
  const store = await readStore();
  const record = {
    id: randomUUID(),
    event,
    metadata,
    leadId: metadata.leadId as string | undefined,
    sessionId: metadata.sessionId as string | undefined,
    createdAt: new Date().toISOString()
  };
  store.events.push(record);
  await writeStore(store);
  return record;
}

export async function createQuizSession(metadata: Record<string, unknown>) {
  const sessionId = randomUUID();
  await trackEvent("Quiz Started", { ...metadata, sessionId });
  return { sessionId };
}

export async function upsertLead(input: Omit<FunnelLead, "id" | "createdAt" | "updatedAt">) {
  const store = await readStore();
  const now = new Date().toISOString();
  const existingIndex = store.leads.findIndex((lead) => lead.email.toLowerCase() === input.email.toLowerCase());
  const existing = store.leads[existingIndex];
  const lead: FunnelLead = {
    ...existing,
    ...input,
    id: existing?.id || randomUUID(),
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };

  if (existingIndex >= 0) {
    store.leads[existingIndex] = lead;
    store.quizResponses = store.quizResponses.filter((response) => response.leadId !== lead.id);
  } else {
    store.leads.push(lead);
  }

  await writeStore(store);
  return lead;
}

export async function saveQuizResponses(
  leadId: string,
  responses: Omit<QuizResponseRecord, "id" | "leadId" | "createdAt">[]
) {
  const store = await readStore();
  const now = new Date().toISOString();
  store.quizResponses.push(
    ...responses.map((response) => ({
      ...response,
      id: randomUUID(),
      leadId,
      createdAt: now
    }))
  );
  await writeStore(store);
}

export async function setPipelineStage(leadId: string, stage: string, patch: Partial<PipelineRecord> = {}) {
  const store = await readStore();
  const now = new Date().toISOString();
  const existingIndex = store.pipelineStages.findIndex((record) => record.leadId === leadId);
  const record: PipelineRecord = {
    id: store.pipelineStages[existingIndex]?.id || randomUUID(),
    leadId,
    stage,
    status: patch.status || store.pipelineStages[existingIndex]?.status || "Open",
    notes: patch.notes ?? store.pipelineStages[existingIndex]?.notes,
    assignedTo: patch.assignedTo ?? store.pipelineStages[existingIndex]?.assignedTo,
    lastContactedAt: patch.lastContactedAt ?? store.pipelineStages[existingIndex]?.lastContactedAt,
    nextFollowUpAt: patch.nextFollowUpAt ?? store.pipelineStages[existingIndex]?.nextFollowUpAt,
    createdAt: store.pipelineStages[existingIndex]?.createdAt || now,
    updatedAt: now
  };
  if (existingIndex >= 0) store.pipelineStages[existingIndex] = record;
  else store.pipelineStages.push(record);
  await writeStore(store);
  return record;
}

export async function logEmail(leadId: string, type: string, subject: string, status: string) {
  const store = await readStore();
  store.emailLogs.push({
    id: randomUUID(),
    leadId,
    type,
    subject,
    status,
    sentAt: new Date().toISOString()
  });
  await writeStore(store);
}

export async function logSms(leadId: string, type: string, message: string, status: string) {
  const store = await readStore();
  store.smsLogs.push({
    id: randomUUID(),
    leadId,
    type,
    message,
    status,
    sentAt: new Date().toISOString()
  });
  await writeStore(store);
}

export async function listLeads(filters: Record<string, string | undefined> = {}) {
  const store = await readStore();
  return store.leads
    .map((lead) => ({
      ...lead,
      pipeline: store.pipelineStages.find((stage) => stage.leadId === lead.id)
    }))
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
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getLead(id: string) {
  const store = await readStore();
  const lead = store.leads.find((item) => item.id === id);
  if (!lead) return null;
  return {
    lead,
    quizResponses: store.quizResponses.filter((item) => item.leadId === id),
    pipeline: store.pipelineStages.find((item) => item.leadId === id),
    emailLogs: store.emailLogs.filter((item) => item.leadId === id),
    smsLogs: store.smsLogs.filter((item) => item.leadId === id),
    events: store.events.filter((item) => item.leadId === id)
  };
}

export async function getMetrics() {
  const store = await readStore();
  const totalLeads = store.leads.length;
  const quizCompletions = store.events.filter((event) => event.event === "Quiz Completed").length;
  const callsBooked = store.pipelineStages.filter((stage) => stage.stage === "Call Booked").length;
  const enrolled = store.pipelineStages.filter((stage) => stage.stage === "Enrolled").length;
  const leadsByPathway = store.leads.reduce<Record<string, number>>((acc, lead) => {
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
    recentLeads: store.leads.slice(-8).reverse(),
    totalStudents: store.students.length,
    totalEnrollments: store.enrollments.length
  };
}

export async function createStudent(input: { name: string; email: string; passwordHash: string }) {
  const store = await readStore();
  const existing = store.students.find((student) => student.email.toLowerCase() === input.email.toLowerCase());
  if (existing) return null;
  const student: Student = {
    id: randomUUID(),
    name: input.name,
    email: input.email,
    passwordHash: input.passwordHash,
    createdAt: new Date().toISOString()
  };
  store.students.push(student);
  await writeStore(store);
  return student;
}

export async function getStudentByEmail(email: string) {
  const store = await readStore();
  return store.students.find((student) => student.email.toLowerCase() === email.toLowerCase()) || null;
}

export async function getStudentById(id: string) {
  const store = await readStore();
  return store.students.find((student) => student.id === id) || null;
}

export async function enrollStudent(studentId: string, courseId: string) {
  const store = await readStore();
  const existing = store.enrollments.find(
    (enrollment) => enrollment.studentId === studentId && enrollment.courseId === courseId
  );
  if (existing) return existing;
  const enrollment: Enrollment = {
    id: randomUUID(),
    studentId,
    courseId,
    enrolledAt: new Date().toISOString()
  };
  store.enrollments.push(enrollment);
  await writeStore(store);
  return enrollment;
}

export async function getEnrollment(studentId: string, courseId: string) {
  const store = await readStore();
  return (
    store.enrollments.find((enrollment) => enrollment.studentId === studentId && enrollment.courseId === courseId) ||
    null
  );
}

export async function listEnrollmentsForStudent(studentId: string) {
  const store = await readStore();
  return store.enrollments
    .filter((enrollment) => enrollment.studentId === studentId)
    .sort((a, b) => b.enrolledAt.localeCompare(a.enrolledAt));
}

export async function setLessonProgress(
  studentId: string,
  courseId: string,
  lessonId: string,
  completed: boolean
) {
  const store = await readStore();
  const existingIndex = store.lessonProgress.findIndex(
    (record) => record.studentId === studentId && record.lessonId === lessonId
  );
  const record: LessonProgressRecord = {
    id: store.lessonProgress[existingIndex]?.id || randomUUID(),
    studentId,
    courseId,
    lessonId,
    completed,
    completedAt: completed ? new Date().toISOString() : undefined
  };
  if (existingIndex >= 0) store.lessonProgress[existingIndex] = record;
  else store.lessonProgress.push(record);
  await writeStore(store);
  return record;
}

export async function getLessonProgressMap(studentId: string, courseId: string) {
  const store = await readStore();
  const map: Record<string, boolean> = {};
  store.lessonProgress
    .filter((record) => record.studentId === studentId && record.courseId === courseId)
    .forEach((record) => {
      map[record.lessonId] = record.completed;
    });
  return map;
}

export async function listStudentsWithStats() {
  const store = await readStore();
  return store.students
    .map((student) => ({
      ...student,
      enrollments: store.enrollments.filter((enrollment) => enrollment.studentId === student.id)
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
