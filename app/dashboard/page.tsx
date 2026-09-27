import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { getLessonCount } from "@/lib/config/courses";
import { formatPrice } from "@/lib/format";
import { getCourseById, getLessonProgressMap, listEnrollmentsForStudent } from "@/lib/store";
import { requireStudent } from "@/lib/studentAuth";

export default async function DashboardPage() {
  const student = await requireStudent("/dashboard");
  const enrollments = await listEnrollmentsForStudent(student.id);

  const enrolledCourses = await Promise.all(
    enrollments.map(async (enrollment) => {
      const course = await getCourseById(enrollment.courseId);
      if (!course) return null;
      const progressMap = await getLessonProgressMap(student.id, course.id);
      const totalLessons = getLessonCount(course);
      const completedLessons = Object.values(progressMap).filter(Boolean).length;
      const percent = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;
      const paidLabel =
        enrollment.paymentStatus === "paid" && enrollment.amountPaidCents
          ? `Purchased for ${formatPrice(enrollment.amountPaidCents, enrollment.currency || course.currency)}`
          : enrollment.paymentStatus === "granted"
            ? "Access granted by admin"
            : enrollment.paymentStatus === "dev-mode"
              ? "Enrolled (dev mode, no payment)"
              : null;
      return { course, completedLessons, totalLessons, percent, paidLabel };
    })
  );

  const active = enrolledCourses.filter(Boolean) as NonNullable<(typeof enrolledCourses)[number]>[];

  return (
    <main className="min-h-screen bg-cloud">
      <SiteHeader student={student} />
      <section className="mx-auto max-w-6xl px-6 py-10 lg:px-8">
        <h1 className="text-3xl font-bold">My Learning</h1>
        <p className="mt-2 text-slate-600">Welcome back, {student.name}.</p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {active.map(({ course, completedLessons, totalLessons, percent, paidLabel }) => (
            <div key={course.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <img className="aspect-[16/9] w-full object-cover" src={course.image} alt={course.title} />
              <div className="p-5">
                <h2 className="font-bold">{course.title}</h2>
                {paidLabel ? <p className="mt-1 text-xs text-slate-500">{paidLabel}</p> : null}
                <p className="mt-2 text-xs font-semibold text-slate-500">
                  {completedLessons} of {totalLessons} lessons complete
                </p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full bg-cyan" style={{ width: `${percent}%` }} />
                </div>
                <Link
                  className="mt-4 inline-flex items-center justify-center rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-navy"
                  href={`/learn/${course.slug}`}
                >
                  {percent === 100 ? "Review course" : "Continue"}
                </Link>
              </div>
            </div>
          ))}
        </div>

        {!active.length ? (
          <div className="mt-8 rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="text-slate-600">You are not enrolled in any courses yet.</p>
            <Link className="mt-4 inline-flex font-semibold text-blueglow" href="/courses">
              Browse the course library
            </Link>
          </div>
        ) : null}
      </section>
    </main>
  );
}
