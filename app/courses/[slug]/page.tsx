import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { checkoutAction } from "@/lib/actions/lms";
import { getLessonCount, getTotalDuration } from "@/lib/config/courses";
import { formatPrice } from "@/lib/format";
import { getCourseBySlug, getEnrollment } from "@/lib/store";
import { getCurrentStudent } from "@/lib/studentAuth";

const kindLabels: Record<string, string> = {
  text: "Reading",
  video: "Video",
  slides: "Slides",
  quiz: "Quiz",
  assignment: "Assignment"
};

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const course = await getCourseBySlug(params.slug);
  return { title: course ? `${course.title} | Dr Cyber` : "Course not found" };
}

const checkoutMessages: Record<string, string> = {
  cancelled: "Checkout was cancelled - your card was not charged.",
  error: "We could not start checkout. Please try again."
};

export default async function CourseDetailPage({
  params,
  searchParams
}: {
  params: { slug: string };
  searchParams: { checkout?: string };
}) {
  const course = await getCourseBySlug(params.slug);
  if (!course) notFound();

  const student = await getCurrentStudent();
  const enrollment = student ? await getEnrollment(student.id, course!.id) : null;
  const lessonCount = getLessonCount(course!);
  const hours = Math.round((getTotalDuration(course!) / 60) * 10) / 10;
  const isFree = course!.priceCents === 0;
  const price = isFree ? "Free" : formatPrice(course!.priceCents, course!.currency);
  const checkoutMessage = searchParams.checkout ? checkoutMessages[searchParams.checkout] : undefined;

  return (
    <main className="min-h-screen bg-cloud">
      <SiteHeader student={student} />
      <section className="bg-navy py-14 text-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 lg:grid-cols-[1.1fr_.9fr] lg:items-center lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-mint">{course!.category}</p>
            <h1 className="mt-3 text-4xl font-bold">{course!.title}</h1>
            <p className="mt-4 max-w-2xl text-slate-200">{course!.description}</p>
            <div className="mt-6 flex flex-wrap gap-4 text-sm font-semibold text-slate-200">
              <span>{course!.level}</span>
              <span>
                {lessonCount} lessons - {hours}h
              </span>
              <span>Certification target: {course!.certification}</span>
            </div>
            {checkoutMessage ? (
              <p className="mt-4 rounded-md border border-white/20 bg-white/10 px-4 py-3 text-sm">{checkoutMessage}</p>
            ) : null}
            <div className="mt-8 flex items-center gap-4">
              {enrollment ? (
                <a
                  className="focus-ring inline-flex items-center justify-center rounded-md bg-cyan px-5 py-3 text-sm font-semibold text-navy shadow-glow hover:bg-mint"
                  href={`/learn/${course!.slug}`}
                >
                  Continue learning
                </a>
              ) : (
                <form action={checkoutAction}>
                  <input type="hidden" name="slug" value={course!.slug} />
                  <button
                    className="focus-ring inline-flex items-center justify-center rounded-md bg-cyan px-5 py-3 text-sm font-semibold text-navy shadow-glow hover:bg-mint"
                    type="submit"
                  >
                    {isFree ? "Enroll for free" : `Enroll - ${price}`}
                  </button>
                </form>
              )}
              {!enrollment ? (
                <span className="text-sm text-slate-300">
                  {isFree ? "No payment required" : "One-time payment - lifetime access"}
                </span>
              ) : null}
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border border-white/10 bg-white/5 shadow-glow">
            <img className="h-full w-full object-cover" src={course!.image} alt={course!.title} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-12 lg:px-8">
        <h2 className="text-2xl font-bold">Curriculum</h2>
        <p className="mt-2 text-slate-600">{course!.summary}</p>
        <div className="mt-6 space-y-6">
          {course!.modules.map((courseModule) => (
            <div key={courseModule.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
                <h3 className="font-bold">{courseModule.title}</h3>
              </div>
              <ul className="divide-y divide-slate-100">
                {courseModule.lessons.map((lesson) => (
                  <li key={lesson.id} className="flex items-center justify-between px-5 py-3 text-sm">
                    <span>{lesson.title}</span>
                    <span className="flex items-center gap-2 text-slate-500">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                        {kindLabels[lesson.kind] || lesson.kind}
                      </span>
                      {lesson.durationMinutes} min
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
