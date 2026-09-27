import Link from "next/link";
import { AdminNav } from "@/components/AdminNav";
import { getLessonCount } from "@/lib/config/courses";
import { formatPrice } from "@/lib/format";
import { requireAdmin } from "@/lib/auth";
import { listAllCoursesAdmin } from "@/lib/store";

export default async function AdminCoursesPage() {
  requireAdmin();
  const courses = await listAllCoursesAdmin();

  return (
    <main className="min-h-screen bg-cloud">
      <AdminNav />
      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Courses</h1>
          <Link className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-navy" href="/admin/courses/new">
            New course
          </Link>
        </div>

        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-3">Title</th>
                <th className="p-3">Level</th>
                <th className="p-3">Price</th>
                <th className="p-3">Lessons</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {courses.map((course) => (
                <tr key={course.id} className="hover:bg-cloud">
                  <td className="p-3 font-semibold">
                    <Link href={`/admin/courses/${course.id}`}>{course.title}</Link>
                  </td>
                  <td className="p-3">{course.level}</td>
                  <td className="p-3">{course.priceCents === 0 ? "Free" : formatPrice(course.priceCents, course.currency)}</td>
                  <td className="p-3">{getLessonCount(course)}</td>
                  <td className="p-3">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-semibold ${
                        course.published ? "bg-mint/10 text-emerald-700" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {course.published ? "Published" : "Draft"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!courses.length ? <p className="p-5 text-sm text-slate-500">No courses yet.</p> : null}
        </div>
      </section>
    </main>
  );
}
