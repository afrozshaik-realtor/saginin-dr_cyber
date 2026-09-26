import { pathways } from "@/lib/config/pathways";
import type { Course, CourseModule, FlatLesson, Lesson } from "@/types/lms";

const categoryByPathway: Record<string, string> = {
  grc: "Governance, Risk & Compliance",
  soc: "Security Operations",
  cloud: "Cloud Security",
  pentest: "Offensive Security",
  iam: "Identity & Access Management",
  vuln: "Vulnerability Management",
  ai: "AI & Emerging Security",
  foundation: "Foundations"
};

const levelByPathway: Record<string, Course["level"]> = {
  grc: "Intermediate",
  soc: "Beginner",
  cloud: "Intermediate",
  pentest: "Advanced",
  iam: "Intermediate",
  vuln: "Intermediate",
  ai: "Intermediate",
  foundation: "Beginner"
};

const priceCentsByLevel: Record<Course["level"], number> = {
  Beginner: 14900,
  Intermediate: 19900,
  Advanced: 24900
};

const imageByPathway: Record<string, string> = {
  grc: "/images/mentor-consultation.png",
  soc: "/images/hands-on-lab.png",
  cloud: "/images/technical-coaching.png",
  pentest: "/images/cyber-workshop.png",
  iam: "/images/online-mentor-session.png",
  vuln: "/images/classroom-instruction.png",
  ai: "/images/myth-vs-reality.png",
  foundation: "/images/career-switcher-study.png"
};

function slugifyId(courseId: string, title: string, index: number) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${courseId}-${base}-${index}`;
}

function buildLesson(courseId: string, title: string, index: number, kind: "lesson" | "project"): Lesson {
  const id = slugifyId(courseId, title, index);
  return {
    id,
    title,
    type: "text",
    durationMinutes: kind === "project" ? 90 : 45,
    summary: kind === "project" ? `Portfolio project: ${title}` : `Core lesson: ${title}`,
    content:
      kind === "project"
        ? `Apply what you have learned so far by completing "${title}". Document your approach, the tools you used, and the outcome so you can add it to your portfolio and speak to it in interviews.\n\n- Plan the scope before you start\n- Capture screenshots or notes as evidence while you work\n- Write a short summary of what you found and how you fixed or reported it`
        : `This lesson covers "${title}" - the concepts, terminology, and hands-on context you need before moving to the next step of the pathway.\n\n- Review the key definitions and how they show up on the job\n- Walk through a guided example or lab\n- Check your understanding before continuing to the next lesson`
  };
}

function buildModules(courseId: string, roadmap: string[], projects: string[]): CourseModule[] {
  return [
    {
      id: `${courseId}-core`,
      title: "Core Curriculum",
      lessons: roadmap.map((title, index) => buildLesson(courseId, title, index, "lesson"))
    },
    {
      id: `${courseId}-projects`,
      title: "Portfolio Projects",
      lessons: projects.map((title, index) => buildLesson(courseId, title, index, "project"))
    }
  ];
}

export const courses: Course[] = pathways.map((pathway) => {
  const level = levelByPathway[pathway.id] || "Beginner";
  return {
    id: pathway.id,
    slug: pathway.id,
    pathwayId: pathway.id,
    title: pathway.name,
    category: categoryByPathway[pathway.id] || "Cybersecurity",
    level,
    summary: pathway.bestFor,
    description: pathway.why,
    certification: pathway.certification,
    image: imageByPathway[pathway.id] || "/images/career-switcher-study.png",
    priceCents: priceCentsByLevel[level],
    currency: "usd",
    modules: buildModules(pathway.id, pathway.roadmap, pathway.projects)
  };
});

export function getCourseBySlug(slug: string) {
  return courses.find((course) => course.slug === slug) || null;
}

export function listLessonsFlat(course: Course): FlatLesson[] {
  return course.modules.flatMap((courseModule) =>
    courseModule.lessons.map((lesson) => ({ ...lesson, moduleId: courseModule.id, moduleTitle: courseModule.title }))
  );
}

export function findLesson(course: Course, lessonId: string): FlatLesson | null {
  return listLessonsFlat(course).find((lesson) => lesson.id === lessonId) || null;
}

export function getTotalDuration(course: Course) {
  return listLessonsFlat(course).reduce((sum, lesson) => sum + lesson.durationMinutes, 0);
}

export function getLessonCount(course: Course) {
  return listLessonsFlat(course).length;
}
