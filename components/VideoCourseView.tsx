import { clsx } from "clsx";
import Link from "next/link";
import { BookCallCta } from "@/components/BookCallCta";
import { VideoPlayer } from "@/components/VideoPlayer";
import type { CtaLevel } from "@/lib/config/crm";

export type VideoLessonRow = {
  id: string;
  title: string;
  durationSeconds: number;
  points: number;
  percent: number;
  completed: boolean;
};

/** Lesson list + protected player for mini-courses whose lessons live in the `lessons` table. */
export function VideoCourseView({
  slug,
  courseTitle,
  lessons,
  activeId,
  watermark,
  totalPoints,
  ctaLevel
}: {
  slug: string;
  courseTitle: string;
  lessons: VideoLessonRow[];
  activeId: string;
  watermark: string;
  totalPoints: number;
  ctaLevel: CtaLevel;
}) {
  const active = lessons.find((l) => l.id === activeId) ?? lessons[0];
  const done = lessons.filter((l) => l.completed).length;
  const percent = lessons.length ? Math.round((done / lessons.length) * 100) : 0;
  const mins = (s: number) => `${Math.max(1, Math.round(s / 60))} min`;

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[.9fr_1.6fr] lg:px-8">
      <aside className="h-fit rounded-lg border border-slate-200 bg-white p-5">
        <h1 className="font-bold">{courseTitle}</h1>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full bg-cyan" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-2 text-xs font-semibold text-slate-500">
          {done} of {lessons.length} lessons complete - {totalPoints} points
        </p>
        <ul className="mt-4 space-y-1">
          {lessons.map((lesson) => (
            <li key={lesson.id}>
              <Link
                href={`/learn/${slug}?lesson=${lesson.id}`}
                className={clsx(
                  "flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm",
                  lesson.id === active.id ? "bg-navy text-white" : "hover:bg-cloud"
                )}
              >
                <span>{lesson.title}</span>
                <span className="text-xs">{lesson.completed ? "Done" : mins(lesson.durationSeconds)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </aside>
      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-2xl font-bold">{active.title}</h2>
        <p className="mt-1 mb-4 text-sm text-slate-500">
          {mins(active.durationSeconds)} - {active.points} points
        </p>
        <VideoPlayer key={active.id} lessonId={active.id} watermark={watermark} />
        <div className="mt-6"><BookCallCta level={ctaLevel} /></div>
      </section>
    </div>
  );
}
