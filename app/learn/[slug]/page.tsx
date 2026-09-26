import { clsx } from "clsx";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { toggleLessonAction } from "@/lib/actions/lms";
import { findLesson, getCourseBySlug, listLessonsFlat } from "@/lib/config/courses";
import { getEnrollment, getLessonProgressMap } from "@/lib/store";
import { requireStudent } from "@/lib/studentAuth";

export default async function LearnPage({
  params,
  searchParams
}: {
  params: { slug: string };
  searchParams: { lesson?: string };
}) {
  const course = getCourseBySlug(params.slug);
  if (!course) notFound();

  const student = await requireStudent(`/learn/${params.slug}`);
  const enrollment = await getEnrollment(student.id, course!.id);
  if (!enrollment) redirect(`/courses/${params.slug}`);

  const progressMap = await getLessonProgressMap(student.id, course!.id);
  const flatLessons = listLessonsFlat(course!);
  const activeLessonId =
    searchParams.lesson && findLesson(course!, searchParams.lesson)
      ? searchParams.lesson
      : flatLessons.find((lesson) => !progressMap[lesson.id])?.id || flatLessons[0]?.id;
  const activeLesson = findLesson(course!, activeLessonId || "");
  const completedCount = Object.values(progressMap).filter(Boolean).length;
  const percent = flatLessons.length ? Math.round((completedCount / flatLessons.length) * 100) : 0;
  const activeIndex = flatLessons.findIndex((lesson) => lesson.id === activeLessonId);
  const nextLesson = activeIndex >= 0 ? flatLessons[activeIndex + 1] : undefined;

  return (
    <main className="min-h-screen bg-cloud">
      <SiteHeader student={student} />
      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[.9fr_1.6fr] lg:px-8">
        <aside className="h-fit rounded-lg border border-slate-200 bg-white p-5">
          <h1 className="font-bold">{course!.title}</h1>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-cyan" style={{ width: `${percent}%` }} />
          </div>
          <p className="mt-2 text-xs font-semibold text-slate-500">{percent}% complete</p>

          <div className="mt-5 space-y-5">
            {course!.modules.map((courseModule) => (
              <div key={courseModule.id}>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{courseModule.title}</p>
                <ul className="mt-2 space-y-1">
                  {courseModule.lessons.map((lesson) => (
                    <li key={lesson.id}>
                      <Link
                        href={`/learn/${params.slug}?lesson=${lesson.id}`}
                        className={clsx(
                          "flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm",
                          lesson.id === activeLessonId ? "bg-navy text-white" : "hover:bg-cloud"
                        )}
                      >
                        <span>{lesson.title}</span>
                        {progressMap[lesson.id] ? <span className="text-mint">Done</span> : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </aside>

        <section className="rounded-lg border border-slate-200 bg-white p-6">
          {activeLesson ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-blueglow">{activeLesson.moduleTitle}</p>
              <h2 className="mt-2 text-2xl font-bold">{activeLesson.title}</h2>
              <p className="mt-1 text-sm text-slate-500">{activeLesson.durationMinutes} min</p>
              <p className="mt-4 whitespace-pre-line leading-7 text-slate-700">{activeLesson.content}</p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <form action={toggleLessonAction}>
                  <input type="hidden" name="slug" value={params.slug} />
                  <input type="hidden" name="lessonId" value={activeLesson.id} />
                  <input type="hidden" name="completed" value={progressMap[activeLesson.id] ? "false" : "true"} />
                  <button
                    className={clsx(
                      "rounded-md px-5 py-3 text-sm font-semibold",
                      progressMap[activeLesson.id]
                        ? "border border-slate-300 text-slate-600 hover:bg-cloud"
                        : "bg-cyan text-navy shadow-glow hover:bg-mint"
                    )}
                    type="submit"
                  >
                    {progressMap[activeLesson.id] ? "Mark as not complete" : "Mark lesson complete"}
                  </button>
                </form>
                {nextLesson ? (
                  <Link
                    className="rounded-md border border-slate-300 px-5 py-3 text-sm font-semibold hover:bg-cloud"
                    href={`/learn/${params.slug}?lesson=${nextLesson.id}`}
                  >
                    Next lesson
                  </Link>
                ) : null}
              </div>
            </>
          ) : (
            <p className="text-slate-600">This course does not have any lessons yet.</p>
          )}
        </section>
      </div>
    </main>
  );
}
