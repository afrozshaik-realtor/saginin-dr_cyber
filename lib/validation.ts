import { z } from "zod";
import { quizQuestions } from "@/lib/config/quiz";

export const leadSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  email: z.string().email().max(160),
  phone: z.string().max(40).optional().or(z.literal("")),
  currentProfession: z.string().min(1).max(160),
  city: z.string().min(1).max(120),
  country: z.string().min(1).max(120),
  startTimeline: z.string().min(1).max(80),
  consent: z.literal(true),
  source: z.string().max(80).optional(),
  utmSource: z.string().max(120).optional(),
  utmMedium: z.string().max(120).optional(),
  utmCampaign: z.string().max(120).optional(),
  utmContent: z.string().max(120).optional(),
  utmTerm: z.string().max(120).optional()
});

export const quizAnswerSchema = z.object({
  questionId: z.string(),
  selectedAnswer: z.string()
});

export const quizSubmitSchema = z.object({
  sessionId: z.string().optional(),
  lead: leadSchema,
  answers: z.array(quizAnswerSchema).length(quizQuestions.length),
  hp: z.string().max(0).optional().or(z.literal(""))
});

export const studentSignupSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(160),
  password: z.string().min(8).max(100)
});

export const studentLoginSchema = z.object({
  email: z.string().email().max(160),
  password: z.string().min(1).max(100)
});

export const leadPatchSchema = z.object({
  stage: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().max(4000).optional(),
  assignedTo: z.string().max(120).optional(),
  nextFollowUpAt: z.string().optional()
});
