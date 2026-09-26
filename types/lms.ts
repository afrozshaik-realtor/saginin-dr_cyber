export type LessonType = "video" | "text";

export type Lesson = {
  id: string;
  title: string;
  type: LessonType;
  durationMinutes: number;
  summary: string;
  content: string;
  videoUrl?: string;
};

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

export type PaymentStatus = "unpaid" | "paid" | "dev-mode" | "granted";

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
