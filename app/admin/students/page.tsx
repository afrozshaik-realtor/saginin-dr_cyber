import { AdminNav } from "@/components/AdminNav";
import { courses } from "@/lib/config/courses";
import { requireAdmin } from "@/lib/auth";
import { listStudentsWithStats } from "@/lib/store";

export default async function AdminStudentsPage() {
  requireAdmin();
  const students = await listStudentsWithStats();

  return (
    <main className="min-h-screen bg-cloud">
      <AdminNav />
      <section className="mx-auto max-w-7xl px-6 py-8">
        <h1 className="text-3xl font-bold">Students</h1>
        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Enrolled courses</th>
                <th className="p-3">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((student) => (
                <tr key={student.id} className="hover:bg-cloud">
                  <td className="p-3 font-semibold">{student.name}</td>
                  <td className="p-3">{student.email}</td>
                  <td className="p-3">
                    {student.enrollments
                      .map((enrollment) => courses.find((course) => course.id === enrollment.courseId)?.title)
                      .filter(Boolean)
                      .join(", ") || "None"}
                  </td>
                  <td className="p-3">{new Date(student.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!students.length ? <p className="p-5 text-sm text-slate-500">No students have signed up yet.</p> : null}
        </div>
      </section>
    </main>
  );
}
