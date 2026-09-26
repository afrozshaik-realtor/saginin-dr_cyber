import { notFound } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";
import { LessonForm } from "@/components/LessonForm";
import { updateLessonAction } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { getCourseById } from "@/lib/store";

export default async function EditLessonPage({
  params
}: {
  params: { id: string; moduleId: string; lessonId: string };
}) {
  requireAdmin();
  const course = await getCourseById(params.id);
  const courseModule = course?.modules.find((item) => item.id === params.moduleId);
  const lesson = courseModule?.lessons.find((item) => item.id === params.lessonId);
  if (!course || !courseModule || !lesson) notFound();

  return (
    <main className="min-h-screen bg-cloud">
      <AdminNav />
      <section className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="text-3xl font-bold">Edit lesson</h1>
        <p className="mt-1 text-sm text-slate-600">
          {course!.title} - {courseModule!.title}
        </p>
        <div className="mt-6">
          <LessonForm
            action={updateLessonAction}
            courseId={course!.id}
            moduleId={courseModule!.id}
            lessonId={lesson!.id}
            initialLesson={lesson}
          />
        </div>
      </section>
    </main>
  );
}
