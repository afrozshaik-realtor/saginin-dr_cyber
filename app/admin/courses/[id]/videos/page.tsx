import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";
import { DeleteVideoLessonButton } from "@/components/DeleteVideoLessonButton";
import { VideoUploader } from "@/components/VideoUploader";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminCourseVideosPage({ params }: { params: { id: string } }) {
  requireAdmin();
  const course = await prisma.course.findUnique({
    where: { id: params.id },
    include: { lessons: { orderBy: { sortOrder: "asc" } } }
  });
  if (!course) notFound();

  return (
    <main className="min-h-screen bg-cloud">
      <AdminNav />
      <section className="mx-auto max-w-3xl space-y-6 px-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{course!.title} - videos</h1>
          <Link className="text-sm font-semibold text-blueglow" href={`/admin/courses/${course!.id}`}>
            Back to course
          </Link>
        </div>
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {course!.lessons.length === 0 ? <li className="p-4 text-sm text-slate-500">No video lessons yet.</li> : null}
          {course!.lessons.map((lesson) => (
            <li key={lesson.id} className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="font-semibold">{lesson.sortOrder}. {lesson.title}</p>
                <p className="text-xs text-slate-500">
                  {Math.round(lesson.durationSeconds / 60 * 10) / 10} min - {lesson.points} points - {lesson.r2Key ? "video uploaded" : "no video"}
                </p>
              </div>
              <DeleteVideoLessonButton id={lesson.id} />
            </li>
          ))}
        </ul>
        <VideoUploader courseId={course!.id} />
        <p className="text-xs text-slate-500">
          Videos go straight from your browser to the private R2 bucket. The bucket needs a CORS rule allowing PUT from this site.
        </p>
      </section>
    </main>
  );
}
