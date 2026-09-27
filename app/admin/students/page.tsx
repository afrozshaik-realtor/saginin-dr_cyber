import { AdminNav } from "@/components/AdminNav";
import { grantAccessAction } from "@/lib/actions/admin";
import { formatPrice } from "@/lib/format";
import { requireAdmin } from "@/lib/auth";
import { listAllCoursesAdmin, listStudentsWithStats } from "@/lib/store";

const grantMessages: Record<string, { text: string; tone: "success" | "error" }> = {
  success: { text: "Access granted - the student has been emailed a link to start the course.", tone: "success" },
  error: { text: "Could not grant access. Check the email and course, then try again.", tone: "error" }
};

export default async function AdminStudentsPage({
  searchParams
}: {
  searchParams: { grant?: string };
}) {
  requireAdmin();
  const [students, courses] = await Promise.all([listStudentsWithStats(), listAllCoursesAdmin()]);
  const grantMessage = searchParams.grant ? grantMessages[searchParams.grant] : undefined;

  return (
    <main className="min-h-screen bg-cloud">
      <AdminNav />
      <section className="mx-auto max-w-7xl px-6 py-8">
        <h1 className="text-3xl font-bold">Students</h1>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-bold">Grant course access</h2>
          <p className="mt-1 text-sm text-slate-600">
            Enroll someone directly (comp access, manual payment, corporate deal) and email them a link that signs
            them in and takes them straight to the course. Works for an existing student or a brand-new email.
          </p>
          {grantMessage ? (
            <p
              className={`mt-4 rounded-md p-3 text-sm ${
                grantMessage.tone === "success" ? "bg-mint/10 text-emerald-700" : "bg-red-50 text-red-700"
              }`}
            >
              {grantMessage.text}
            </p>
          ) : null}
          <form action={grantAccessAction} className="mt-4 grid gap-3 md:grid-cols-[1.2fr_1fr_1.2fr_auto]">
            <input
              className="rounded-md border border-slate-300 px-3 py-2"
              name="email"
              type="email"
              placeholder="Student email"
              required
            />
            <input className="rounded-md border border-slate-300 px-3 py-2" name="name" placeholder="Name (if new)" />
            <select className="rounded-md border border-slate-300 px-3 py-2" name="slug" required defaultValue="">
              <option value="" disabled>
                Choose a course
              </option>
              {courses.map((course) => (
                <option key={course.id} value={course.slug}>
                  {course.title}
                </option>
              ))}
            </select>
            <button className="rounded-md bg-ink px-4 py-2 font-semibold text-white hover:bg-navy" type="submit">
              Grant access
            </button>
          </form>
        </section>

        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Enrolled courses</th>
                <th className="p-3">Paid</th>
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
                  <td className="p-3">
                    {formatPrice(
                      student.enrollments
                        .filter((enrollment) => enrollment.paymentStatus === "paid")
                        .reduce((sum, enrollment) => sum + (enrollment.amountPaidCents || 0), 0),
                      "usd"
                    )}
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
