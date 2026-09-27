export type LessonKind = "text" | "video" | "slides" | "quiz" | "assignment";

export type QuizOption = {
  id: string;
  text: string;
  correct: boolean;
};

export type QuizQuestion = {
  id: string;
  prompt: string;
  options: QuizOption[];
};

export type AssignmentSubmissionType = "file" | "link" | "text";

type LessonBase = {
  id: string;
  title: string;
  durationMinutes: number;
  summary: string;
};

export type TextLesson = LessonBase & {
  kind: "text";
  content: string;
};

export type VideoLesson = LessonBase & {
  kind: "video";
  videoUrl: string;
  content?: string;
};

export type SlidesLesson = LessonBase & {
  kind: "slides";
  slidesUrl: string;
  content?: string;
};

export type QuizLesson = LessonBase & {
  kind: "quiz";
  questions: QuizQuestion[];
};

export type AssignmentLesson = LessonBase & {
  kind: "assignment";
  instructions: string;
  submissionType: AssignmentSubmissionType;
};

export type Lesson = TextLesson | VideoLesson | SlidesLesson | QuizLesson | AssignmentLesson;

export type CourseModule = {
  id: string;
  title: string;
  lessons: Lesson[];
};

export type CourseLevel = "Beginner" | "Intermediate" | "Advanced";

export type Course = {
  id: string;
  slug: string;
  pathwayId: string;
  title: string;
  category: string;
  level: CourseLevel;
  summary: string;
  description: string;
  certification: string;
  image: string;
  priceCents: number;
  currency: string;
  published: boolean;
  modules: CourseModule[];
};

export type FlatLesson = Lesson & {
  moduleId: string;
  moduleTitle: string;
};

export type Student = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
};

export type PaymentStatus = "unpaid" | "paid" | "dev-mode" | "granted" | "free";

export type Enrollment = {
  id: string;
  studentId: string;
  courseId: string;
  enrolledAt: string;
  completedAt?: string;
  paymentStatus: PaymentStatus;
  amountPaidCents?: number;
  currency?: string;
  stripeSessionId?: string;
};

export type LessonProgressRecord = {
  id: string;
  studentId: string;
  courseId: string;
  lessonId: string;
  completed: boolean;
  completedAt?: string;
};

export type QuizAttempt = {
  id: string;
  studentId: string;
  courseId: string;
  lessonId: string;
  answers: Record<string, string>;
  scorePercent: number;
  correctCount: number;
  totalCount: number;
  submittedAt: string;
};

export type AssignmentSubmissionStatus = "submitted" | "reviewed";

export type AssignmentSubmission = {
  id: string;
  studentId: string;
  courseId: string;
  lessonId: string;
  submissionType: AssignmentSubmissionType;
  fileUrl?: string;
  fileName?: string;
  link?: string;
  text?: string;
  status: AssignmentSubmissionStatus;
  feedback?: string;
  submittedAt: string;
  reviewedAt?: string;
};
