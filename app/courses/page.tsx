import { CourseCard } from "@/components/CourseCard";
import { SiteHeader } from "@/components/SiteHeader";
import { listCourses } from "@/lib/store";
import { getCurrentStudent } from "@/lib/studentAuth";

export const metadata = {
  title: "Courses | Dr Cyber"
};

export default async function CoursesPage() {
  const [student, courses] = await Promise.all([getCurrentStudent(), listCourses()]);

  return (
    <main className="min-h-screen bg-cloud">
      <SiteHeader student={student} />
      <section className="bg-navy py-14 text-white">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-mint">Online course library</p>
          <h1 className="mt-3 text-4xl font-bold">Learn cybersecurity, one pathway at a time</h1>
          <p className="mt-4 max-w-2xl text-slate-200">
            Every pathway from the career quiz is available as a self-paced course with lessons, portfolio projects,
            and progress tracking.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-6 py-12 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      </section>
    </main>
  );
}
