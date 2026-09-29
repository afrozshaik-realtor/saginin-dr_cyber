import { AdminNav } from "@/components/AdminNav";
import { reviewSubmissionAction } from "@/lib/actions/admin";
import { findLesson } from "@/lib/config/courses";
import { requireAdmin } from "@/lib/auth";
import { getStudentById, listAllCoursesAdmin, listAllSubmissions } from "@/lib/store";

export default async function AdminSubmissionsPage({ searchParams }: { searchParams: { reviewed?: string } }) {
  requireAdmin();
  const [submissions, courses] = await Promise.all([listAllSubmissions(), listAllCoursesAdmin()]);

  const rows = await Promise.all(
    submissions.map(async (submission) => {
      const student = await getStudentById(submission.studentId);
      const course = courses.find((item) => item.id === submission.courseId);
      const lesson = course ? findLesson(course, submission.lessonId) : null;
      return { submission, student, course, lesson };
    })
  );

  return (
    <main className="min-h-screen bg-cloud">
      <AdminNav />
      <section className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="text-3xl font-bold">Assignment submissions</h1>
        {searchParams.reviewed ? (
          <p className="mt-4 rounded-md bg-mint/10 p-3 text-sm text-emerald-700">Feedback saved.</p>
        ) : null}

        <div className="mt-6 space-y-4">
          {rows.map(({ submission, student, course, lesson }) => (
            <div key={submission.id} className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">
                    {student?.name || "Unknown student"} <span className="font-normal text-slate-500">({student?.email})</span>
                  </p>
                  <p className="text-sm text-slate-600">
                    {course?.title || "Unknown course"} - {lesson?.title || "Unknown lesson"}
                  </p>
                </div>
                <span
                  className={`rounded px-2 py-0.5 text-xs font-semibold ${
                    submission.status === "reviewed" ? "bg-mint/10 text-emerald-700" : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {submission.status === "reviewed" ? "Reviewed" : "Needs review"}
                </span>
              </div>

              <div className="mt-3 rounded-md bg-cloud p-3 text-sm">
                {submission.link ? (
                  <a className="text-blueglow" href={submission.link} target="_blank" rel="noreferrer">
                    {submission.link}
                  </a>
                ) : null}
                {submission.fileUrl ? (
                  <a className="text-blueglow" href={submission.fileUrl}>
                    {submission.submissionType === "pdf-form"
                      ? "Download completed PDF"
                      : submission.fileName || "Download submission"}
                  </a>
                ) : null}
                {submission.text ? <p className="whitespace-pre-line">{submission.text}</p> : null}
                <p className="mt-1 text-xs text-slate-500">
                  Submitted {new Date(submission.submittedAt).toLocaleString()}
                </p>
              </div>

              <form action={reviewSubmissionAction} className="mt-3 flex items-start gap-3">
                <input type="hidden" name="id" value={submission.id} />
                <textarea
                  className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
                  name="feedback"
                  rows={2}
                  placeholder="Feedback for the student (optional)"
                  defaultValue={submission.feedback}
                />
                <button className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-navy" type="submit">
                  {submission.status === "reviewed" ? "Update feedback" : "Mark reviewed"}
                </button>
              </form>
            </div>
          ))}
          {!rows.length ? <p className="text-sm text-slate-500">No assignment submissions yet.</p> : null}
        </div>
      </section>
    </main>
  );
}
