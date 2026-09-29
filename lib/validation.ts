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

export const studentLoginSchema = z.object({
  email: z.string().email().max(160),
  password: z.string().min(1).max(100)
});

export const forgotPasswordSchema = z.object({
  email: z.string().email().max(160)
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(100)
});

export const grantAccessSchema = z.object({
  email: z.string().email().max(160),
  name: z.string().max(120).optional().or(z.literal("")),
  slug: z.string().min(1).max(80)
});

export const courseSchema = z.object({
  title: z.string().min(1).max(160),
  category: z.string().min(1).max(120),
  level: z.enum(["Beginner", "Intermediate", "Advanced"]),
  summary: z.string().min(1).max(400),
  description: z.string().min(1).max(4000),
  certification: z.string().max(200),
  image: z.string().min(1).max(400),
  priceCents: z.coerce.number().int().min(0),
  currency: z.string().min(3).max(3),
  published: z.boolean()
});

export const quizOptionSchema = z.object({
  id: z.string(),
  text: z.string().min(1).max(400),
  correct: z.boolean()
});

export const quizQuestionSchema = z.object({
  id: z.string(),
  prompt: z.string().min(1).max(600),
  options: z.array(quizOptionSchema).min(2).max(8)
});

export const quizQuestionsSchema = z.array(quizQuestionSchema).min(1).max(50);

export const leadPatchSchema = z.object({
  stage: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().max(4000).optional(),
  assignedTo: z.string().max(120).optional(),
  nextFollowUpAt: z.string().optional()
});
