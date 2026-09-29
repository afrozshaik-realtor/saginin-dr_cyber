"use client";

import { useState } from "react";
import { QuizBuilder } from "@/components/QuizBuilder";
import { ResourcesEditor } from "@/components/ResourcesEditor";
import type { AssignmentSubmissionType, Lesson, LessonKind } from "@/types/lms";

const kindOptions: { value: LessonKind; label: string }[] = [
  { value: "text", label: "Text / Reading" },
  { value: "video", label: "Video" },
  { value: "slides", label: "Slides" },
  { value: "quiz", label: "Quiz" },
  { value: "assignment", label: "Assignment" }
];

export function LessonForm({
  action,
  courseId,
  moduleId,
  lessonId,
  initialLesson
}: {
  action: (formData: FormData) => void;
  courseId: string;
  moduleId: string;
  lessonId?: string;
  initialLesson?: Lesson;
}) {
  const [kind, setKind] = useState<LessonKind>(initialLesson?.kind || "text");
  const [submissionType, setSubmissionType] = useState<AssignmentSubmissionType>(
    initialLesson?.kind === "assignment" ? initialLesson.submissionType : "link"
  );
  const isEditing = Boolean(lessonId);
  const existingTemplatePdfUrl = initialLesson?.kind === "assignment" ? initialLesson.templatePdfUrl : undefined;

  return (
    <form
      action={action}
      encType="multipart/form-data"
      className="space-y-4 rounded-lg border border-slate-200 bg-white p-6"
    >
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="moduleId" value={moduleId} />
      {lessonId ? <input type="hidden" name="lessonId" value={lessonId} /> : null}

      <div className="block text-sm font-semibold">
        Kind
        {isEditing ? (
          <>
            <input type="hidden" name="kind" value={kind} />
            <p className="mt-2 rounded-md border border-slate-200 bg-cloud px-3 py-2 text-sm text-slate-600">
              {kindOptions.find((option) => option.value === kind)?.label} (kind can&apos;t change after creation -
              delete and recreate if you need a different kind)
            </p>
          </>
        ) : (
          <select
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2"
            name="kind"
            value={kind}
            onChange={(event) => setKind(event.target.value as LessonKind)}
          >
            {kindOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}
      </div>

      <label className="block text-sm font-semibold">
        Title
        <input
          className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2"
          name="title"
          defaultValue={initialLesson?.title}
          required
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold">
          Duration (minutes)
          <input
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2"
            name="durationMinutes"
            type="number"
            min={1}
            defaultValue={initialLesson?.durationMinutes ?? 15}
          />
        </label>
        <label className="block text-sm font-semibold">
          Summary (optional, shown in listings)
          <input className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2" name="summary" defaultValue={initialLesson?.summary} />
        </label>
      </div>

      {kind === "text" ? (
        <label className="block text-sm font-semibold">
          Content
          <textarea
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2"
            name="content"
            rows={8}
            defaultValue={initialLesson && initialLesson.kind === "text" ? initialLesson.content : ""}
            required
          />
        </label>
      ) : null}

      {kind === "video" ? (
        <>
          <label className="block text-sm font-semibold">
            Video URL (YouTube, Vimeo, or Loom link)
            <input
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2"
              name="videoUrl"
              placeholder="https://www.youtube.com/watch?v=..."
              defaultValue={initialLesson && initialLesson.kind === "video" ? initialLesson.videoUrl : ""}
              required
            />
          </label>
          <label className="block text-sm font-semibold">
            Description (optional, shown below the video)
            <textarea
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2"
              name="content"
              rows={4}
              defaultValue={initialLesson && initialLesson.kind === "video" ? initialLesson.content : ""}
            />
          </label>
        </>
      ) : null}

      {kind === "slides" ? (
        <>
          <label className="block text-sm font-semibold">
            Slides embed URL (a Google Slides &quot;Publish to web&quot; embed link, or a PDF URL)
            <input
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2"
              name="slidesUrl"
              placeholder="https://docs.google.com/presentation/d/.../embed"
              defaultValue={initialLesson && initialLesson.kind === "slides" ? initialLesson.slidesUrl : ""}
              required
            />
          </label>
          <label className="block text-sm font-semibold">
            Description (optional)
            <textarea
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2"
              name="content"
              rows={4}
              defaultValue={initialLesson && initialLesson.kind === "slides" ? initialLesson.content : ""}
            />
          </label>
        </>
      ) : null}

      {kind === "quiz" ? (
        <div>
          <p className="text-sm font-semibold">Questions</p>
          <div className="mt-2">
            <QuizBuilder initialQuestions={initialLesson && initialLesson.kind === "quiz" ? initialLesson.questions : []} />
          </div>
        </div>
      ) : null}

      {kind === "assignment" ? (
        <>
          <label className="block text-sm font-semibold">
            Instructions
            <textarea
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2"
              name="instructions"
              rows={6}
              defaultValue={initialLesson && initialLesson.kind === "assignment" ? initialLesson.instructions : ""}
              required
            />
          </label>
          <label className="block text-sm font-semibold">
            Submission type
            <select
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2"
              name="submissionType"
              value={submissionType}
              onChange={(event) => setSubmissionType(event.target.value as AssignmentSubmissionType)}
            >
              <option value="link">Link (e.g. to a portfolio project)</option>
              <option value="text">Text response</option>
              <option value="file">File upload</option>
              <option value="pdf-form">Fillable PDF form</option>
            </select>
          </label>

          {submissionType === "pdf-form" ? (
            <label className="block text-sm font-semibold">
              Fillable PDF template
              <input
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2"
                name="templatePdfFile"
                type="file"
                accept="application/pdf"
                required={!existingTemplatePdfUrl}
              />
              <p className="mt-1 text-xs font-normal text-slate-500">
                Upload a PDF that has real fillable form fields (e.g. exported from Adobe Acrobat or a Word/Docs
                form). Students fill it in on the lesson page and submit a completed copy.
                {existingTemplatePdfUrl ? (
                  <>
                    {" "}
                    <a className="text-blueglow hover:underline" href={existingTemplatePdfUrl} target="_blank" rel="noreferrer">
                      View current template
                    </a>
                    . Leave this empty to keep it.
                  </>
                ) : null}
              </p>
            </label>
          ) : null}
        </>
      ) : null}

      <ResourcesEditor initialResources={initialLesson?.resources ?? []} />

      <button className="rounded-md bg-cyan px-5 py-3 text-sm font-semibold text-navy shadow-glow hover:bg-mint" type="submit">
        {isEditing ? "Save lesson" : "Add lesson"}
      </button>
    </form>
  );
}
