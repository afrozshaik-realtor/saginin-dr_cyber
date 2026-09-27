import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";
import { ConfirmButton } from "@/components/ConfirmButton";
import {
  addModuleAction,
  deleteCourseAction,
  deleteLessonAction,
  deleteModuleAction,
  moveLessonAction,
  moveModuleAction,
  renameModuleAction,
  updateCourseAction
} from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { getCourseById } from "@/lib/store";

const kindLabels: Record<string, string> = {
  text: "Reading",
  video: "Video",
  slides: "Slides",
  quiz: "Quiz",
  assignment: "Assignment"
};

export default async function AdminCourseDetailPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams: { saved?: string; error?: string };
}) {
  requireAdmin();
  const course = await getCourseById(params.id);
  if (!course) notFound();

  return (
    <main className="min-h-screen bg-cloud">
      <AdminNav />
      <section className="mx-auto max-w-4xl px-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{course!.title}</h1>
          <Link className="text-sm font-semibold text-blueglow" href="/admin/courses">
            Back to courses
          </Link>
        </div>

        {searchParams.saved ? (
          <p className="mt-4 rounded-md bg-mint/10 p-3 text-sm text-emerald-700">Course saved.</p>
        ) : null}
        {searchParams.error ? (
          <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            Check the fields below - something was missing or invalid.
          </p>
        ) : null}

        <form
          action={updateCourseAction}
          className="mt-6 space-y-4 rounded-lg border border-slate-200 bg-white p-6"
        >
          <input type="hidden" name="id" value={course!.id} />
          <label className="block text-sm font-semibold">
            Title
            <input className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2" name="title" defaultValue={course!.title} required />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold">
              Category
              <input className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2" name="category" defaultValue={course!.category} required />
            </label>
            <label className="block text-sm font-semibold">
              Level
              <select className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2" name="level" defaultValue={course!.level}>
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </select>
            </label>
          </div>
          <label className="block text-sm font-semibold">
            Summary
            <textarea className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2" name="summary" rows={2} defaultValue={course!.summary} required />
          </label>
          <label className="block text-sm font-semibold">
            Description
            <textarea
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2"
              name="description"
              rows={4}
              defaultValue={course!.description}
              required
            />
          </label>
          <label className="block text-sm font-semibold">
            Certification target
            <input className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2" name="certification" defaultValue={course!.certification} />
          </label>
          <label className="block text-sm font-semibold">
            Cover image path
            <input className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2" name="image" defaultValue={course!.image} required />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold">
              Price (cents)
              <input
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2"
                name="priceCents"
                type="number"
                min={0}
                defaultValue={course!.priceCents}
                required
              />
            </label>
            <label className="block text-sm font-semibold">
              Currency
              <input className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2" name="currency" defaultValue={course!.currency} required />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" name="published" defaultChecked={course!.published} />
            Published (visible in the public catalog)
          </label>
          <div className="flex items-center gap-3">
            <button className="rounded-md bg-cyan px-5 py-3 text-sm font-semibold text-navy shadow-glow hover:bg-mint" type="submit">
              Save course
            </button>
            <span className="text-sm text-slate-500">
              Public page:{" "}
              <a className="text-blueglow" href={`/courses/${course!.slug}`}>
                /courses/{course!.slug}
              </a>
            </span>
          </div>
        </form>

        <h2 className="mt-10 text-xl font-bold">Curriculum</h2>
        <div className="mt-4 space-y-6">
          {course!.modules.map((courseModule, moduleIndex) => (
            <div key={courseModule.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3">
                <form action={renameModuleAction} className="flex flex-1 items-center gap-2">
                  <input type="hidden" name="courseId" value={course!.id} />
                  <input type="hidden" name="moduleId" value={courseModule.id} />
                  <input
                    className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm font-bold"
                    name="title"
                    defaultValue={courseModule.title}
                  />
                  <button className="text-xs font-semibold text-blueglow hover:underline" type="submit">
                    Rename
                  </button>
                </form>
                <div className="flex items-center gap-2">
                  <form action={moveModuleAction}>
                    <input type="hidden" name="courseId" value={course!.id} />
                    <input type="hidden" name="moduleId" value={courseModule.id} />
                    <input type="hidden" name="direction" value="up" />
                    <button className="text-xs font-semibold text-slate-500 hover:text-ink disabled:opacity-30" disabled={moduleIndex === 0} type="submit">
                      Up
                    </button>
                  </form>
                  <form action={moveModuleAction}>
                    <input type="hidden" name="courseId" value={course!.id} />
                    <input type="hidden" name="moduleId" value={courseModule.id} />
                    <input type="hidden" name="direction" value="down" />
                    <button
                      className="text-xs font-semibold text-slate-500 hover:text-ink disabled:opacity-30"
                      disabled={moduleIndex === course!.modules.length - 1}
                      type="submit"
                    >
                      Down
                    </button>
                  </form>
                  <form action={deleteModuleAction}>
                    <input type="hidden" name="courseId" value={course!.id} />
                    <input type="hidden" name="moduleId" value={courseModule.id} />
                    <ConfirmButton
                      className="text-xs font-semibold text-red-600 hover:underline"
                      confirmMessage={`Delete module "${courseModule.title}" and all its lessons?`}
                    >
                      Delete
                    </ConfirmButton>
                  </form>
                </div>
              </div>
              <ul className="divide-y divide-slate-100">
                {courseModule.lessons.map((lesson, lessonIndex) => (
                  <li key={lesson.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                        {kindLabels[lesson.kind]}
                      </span>
                      <span>{lesson.title}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <form action={moveLessonAction}>
                        <input type="hidden" name="courseId" value={course!.id} />
                        <input type="hidden" name="moduleId" value={courseModule.id} />
                        <input type="hidden" name="lessonId" value={lesson.id} />
                        <input type="hidden" name="direction" value="up" />
                        <button className="text-xs font-semibold text-slate-500 hover:text-ink disabled:opacity-30" disabled={lessonIndex === 0} type="submit">
                          Up
                        </button>
                      </form>
                      <form action={moveLessonAction}>
                        <input type="hidden" name="courseId" value={course!.id} />
                        <input type="hidden" name="moduleId" value={courseModule.id} />
                        <input type="hidden" name="lessonId" value={lesson.id} />
                        <input type="hidden" name="direction" value="down" />
                        <button
                          className="text-xs font-semibold text-slate-500 hover:text-ink disabled:opacity-30"
                          disabled={lessonIndex === courseModule.lessons.length - 1}
                          type="submit"
                        >
                          Down
                        </button>
                      </form>
                      <Link
                        className="text-xs font-semibold text-blueglow hover:underline"
                        href={`/admin/courses/${course!.id}/modules/${courseModule.id}/lessons/${lesson.id}/edit`}
                      >
                        Edit
                      </Link>
                      <form action={deleteLessonAction}>
                        <input type="hidden" name="courseId" value={course!.id} />
                        <input type="hidden" name="moduleId" value={courseModule.id} />
                        <input type="hidden" name="lessonId" value={lesson.id} />
                        <ConfirmButton className="text-xs font-semibold text-red-600 hover:underline" confirmMessage={`Delete lesson "${lesson.title}"?`}>
                          Delete
                        </ConfirmButton>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="px-5 py-3">
                <Link
                  className="text-sm font-semibold text-blueglow hover:underline"
                  href={`/admin/courses/${course!.id}/modules/${courseModule.id}/lessons/new`}
                >
                  + Add lesson
                </Link>
              </div>
            </div>
          ))}
          {!course!.modules.length ? <p className="text-sm text-slate-500">No modules yet - add one below.</p> : null}
        </div>

        <form action={addModuleAction} className="mt-6 flex items-center gap-3">
          <input type="hidden" name="courseId" value={course!.id} />
          <input className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm" name="title" placeholder="New module title" required />
          <button className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-navy" type="submit">
            Add module
          </button>
        </form>

        <div className="mt-10 rounded-lg border border-red-200 bg-red-50 p-5">
          <h2 className="text-lg font-bold text-red-800">Danger zone</h2>
          <p className="mt-1 text-sm text-red-700">
            Deleting this course removes it and its curriculum permanently. Existing enrollments and progress records
            are not deleted, but will point at a missing course.
          </p>
          <form action={deleteCourseAction} className="mt-3">
            <input type="hidden" name="id" value={course!.id} />
            <ConfirmButton
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              confirmMessage={`Permanently delete "${course!.title}"? This cannot be undone.`}
            >
              Delete course
            </ConfirmButton>
          </form>
        </div>
      </section>
    </main>
  );
}
