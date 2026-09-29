import { clsx } from "clsx";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { submitAssignmentAction, submitQuizAction, toggleLessonAction } from "@/lib/actions/lms";
import { findLesson, listLessonsFlat } from "@/lib/config/courses";
import { toVideoEmbedUrl } from "@/lib/embeds";
import {
  getAssignmentSubmission,
  getCourseBySlug,
  getEnrollment,
  getLatestQuizAttempt,
  getLessonProgressMap
} from "@/lib/store";
import { requireStudent } from "@/lib/studentAuth";

const kindLabels: Record<string, string> = {
  text: "Reading",
  video: "Video",
  slides: "Slides",
  quiz: "Quiz",
  assignment: "Assignment"
};

export default async function LearnPage({
  params,
  searchParams
}: {
  params: { slug: string };
  searchParams: { lesson?: string; error?: string };
}) {
  const course = await getCourseBySlug(params.slug);
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

  const quizAttempt =
    activeLesson?.kind === "quiz" ? await getLatestQuizAttempt(student.id, activeLesson.id) : null;
  const assignmentSubmission =
    activeLesson?.kind === "assignment" ? await getAssignmentSubmission(student.id, activeLesson.id) : null;

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
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-blueglow">{activeLesson.moduleTitle}</p>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  {kindLabels[activeLesson.kind]}
                </span>
              </div>
              <h2 className="mt-2 text-2xl font-bold">{activeLesson.title}</h2>
              <p className="mt-1 text-sm text-slate-500">{activeLesson.durationMinutes} min</p>

              {activeLesson.kind === "text" ? (
                <p className="mt-4 whitespace-pre-line leading-7 text-slate-700">{activeLesson.content}</p>
              ) : null}

              {activeLesson.kind === "video" ? (
                <>
                  <div className="mt-4 aspect-video overflow-hidden rounded-lg border border-slate-200">
                    <iframe
                      className="h-full w-full"
                      src={toVideoEmbedUrl(activeLesson.videoUrl)}
                      title={activeLesson.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                  {activeLesson.content ? (
                    <p className="mt-4 whitespace-pre-line leading-7 text-slate-700">{activeLesson.content}</p>
                  ) : null}
                </>
              ) : null}

              {activeLesson.kind === "slides" ? (
                <>
                  <div className="mt-4 aspect-video overflow-hidden rounded-lg border border-slate-200">
                    <iframe className="h-full w-full" src={activeLesson.slidesUrl} title={activeLesson.title} allowFullScreen />
                  </div>
                  {activeLesson.content ? (
                    <p className="mt-4 whitespace-pre-line leading-7 text-slate-700">{activeLesson.content}</p>
                  ) : null}
                </>
              ) : null}

              {activeLesson.kind === "quiz" ? (
                <div className="mt-4">
                  {quizAttempt ? (
                    <div className="mb-6 rounded-md border border-slate-200 bg-cloud p-4">
                      <p className="font-semibold">
                        Last score: {quizAttempt.correctCount} / {quizAttempt.totalCount} ({quizAttempt.scorePercent}%)
                      </p>
                      <p className="mt-1 text-sm text-slate-600">Submit again below to retake the quiz.</p>
                    </div>
                  ) : null}
                  {activeLesson.questions.length ? (
                    <form action={submitQuizAction} className="space-y-6">
                      <input type="hidden" name="slug" value={params.slug} />
                      <input type="hidden" name="lessonId" value={activeLesson.id} />
                      {activeLesson.questions.map((question, qIndex) => (
                        <fieldset key={question.id} className="rounded-md border border-slate-200 p-4">
                          <legend className="px-1 text-sm font-semibold">
                            {qIndex + 1}. {question.prompt}
                          </legend>
                          <div className="mt-2 space-y-2">
                            {question.options.map((option) => (
                              <label key={option.id} className="flex items-center gap-2 text-sm">
                                <input
                                  type="radio"
                                  name={`question-${question.id}`}
                                  value={option.id}
                                  required
                                  defaultChecked={quizAttempt?.answers[question.id] === option.id}
                                />
                                {option.text}
                              </label>
                            ))}
                          </div>
                        </fieldset>
                      ))}
                      <button
                        className="rounded-md bg-cyan px-5 py-3 text-sm font-semibold text-navy shadow-glow hover:bg-mint"
                        type="submit"
                      >
                        {quizAttempt ? "Resubmit quiz" : "Submit quiz"}
                      </button>
                    </form>
                  ) : (
                    <p className="text-slate-600">This quiz has no questions yet.</p>
                  )}
                </div>
              ) : null}

              {activeLesson.kind === "assignment" ? (
                <div className="mt-4">
                  <p className="whitespace-pre-line leading-7 text-slate-700">{activeLesson.instructions}</p>

                  {assignmentSubmission ? (
                    <div className="mt-6 rounded-md border border-slate-200 bg-cloud p-4">
                      <p className="font-semibold">
                        {assignmentSubmission.status === "reviewed" ? "Reviewed" : "Submitted"} on{" "}
                        {new Date(assignmentSubmission.submittedAt).toLocaleDateString()}
                      </p>
                      {assignmentSubmission.link ? (
                        <a className="mt-1 block text-sm text-blueglow" href={assignmentSubmission.link} target="_blank" rel="noreferrer">
                          {assignmentSubmission.link}
                        </a>
                      ) : null}
                      {assignmentSubmission.fileUrl ? (
                        <a className="mt-1 block text-sm text-blueglow" href={assignmentSubmission.fileUrl}>
                          {assignmentSubmission.fileName || "Download submission"}
                        </a>
                      ) : null}
                      {assignmentSubmission.text ? (
                        <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{assignmentSubmission.text}</p>
                      ) : null}
                      {assignmentSubmission.feedback ? (
                        <div className="mt-3 border-t border-slate-200 pt-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Feedback</p>
                          <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{assignmentSubmission.feedback}</p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {searchParams.error === "missing" ? (
                    <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
                      Please provide a submission before continuing.
                    </p>
                  ) : null}

                  <form
                    action={submitAssignmentAction}
                    className="mt-6 space-y-3"
                    encType={activeLesson.submissionType === "file" ? "multipart/form-data" : undefined}
                  >
                    <input type="hidden" name="slug" value={params.slug} />
                    <input type="hidden" name="lessonId" value={activeLesson.id} />
                    {activeLesson.submissionType === "link" ? (
                      <input
                        className="w-full rounded-md border border-slate-300 px-3 py-2"
                        name="link"
                        type="url"
                        placeholder="https://..."
                        defaultValue={assignmentSubmission?.link}
                        required
                      />
                    ) : null}
                    {activeLesson.submissionType === "text" ? (
                      <textarea
                        className="w-full rounded-md border border-slate-300 px-3 py-2"
                        name="text"
                        rows={5}
                        placeholder="Write your response..."
                        defaultValue={assignmentSubmission?.text}
                        required
                      />
                    ) : null}
                    {activeLesson.submissionType === "file" ? (
                      <input className="w-full rounded-md border border-slate-300 px-3 py-2" name="file" type="file" required />
                    ) : null}
                    <button
                      className="rounded-md bg-cyan px-5 py-3 text-sm font-semibold text-navy shadow-glow hover:bg-mint"
                      type="submit"
                    >
                      {assignmentSubmission ? "Resubmit" : "Submit assignment"}
                    </button>
                  </form>
                </div>
              ) : null}

              {activeLesson.resources && activeLesson.resources.length ? (
                <div className="mt-6 rounded-md border border-slate-200 bg-cloud p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Resources</p>
                  <ul className="mt-2 space-y-1">
                    {activeLesson.resources.map((resource) => (
                      <li key={resource.id}>
                        <a
                          className="text-sm font-semibold text-blueglow hover:underline"
                          href={resource.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {resource.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {activeLesson.kind === "text" || activeLesson.kind === "video" || activeLesson.kind === "slides" ? (
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
              ) : nextLesson ? (
                <div className="mt-8">
                  <Link
                    className="rounded-md border border-slate-300 px-5 py-3 text-sm font-semibold hover:bg-cloud"
                    href={`/learn/${params.slug}?lesson=${nextLesson.id}`}
                  >
                    Next lesson
                  </Link>
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-slate-600">This course does not have any lessons yet.</p>
          )}
        </section>
      </div>
    </main>
  );
}
