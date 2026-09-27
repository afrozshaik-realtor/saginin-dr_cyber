import Link from "next/link";
import { getLessonCount, getTotalDuration } from "@/lib/config/courses";
import { formatPrice } from "@/lib/format";
import type { Course } from "@/types/lms";

export function CourseCard({ course }: { course: Course }) {
  const lessonCount = getLessonCount(course);
  const hours = Math.round((getTotalDuration(course) / 60) * 10) / 10;
  const price = course.priceCents === 0 ? "Free" : formatPrice(course.priceCents, course.currency);

  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group overflow-hidden rounded-lg border border-slate-200 bg-white transition hover:shadow-glow"
    >
      <img className="aspect-[16/9] w-full object-cover" src={course.image} alt={course.title} />
      <div className="p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-blueglow">{course.category}</p>
        <h3 className="mt-2 text-lg font-bold group-hover:text-blueglow">{course.title}</h3>
        <p className="mt-2 line-clamp-2 text-sm text-slate-600">{course.summary}</p>
        <div className="mt-4 flex items-center justify-between text-xs font-semibold text-slate-500">
          <span>{course.level}</span>
          <span>
            {lessonCount} lessons - {hours}h
          </span>
        </div>
        <p className="mt-3 text-lg font-bold text-ink">{price}</p>
      </div>
    </Link>
  );
}
