"use client";

import { useRef, useState } from "react";
import { parseCsv } from "@/lib/csv";
import type { QuizQuestion } from "@/types/lms";

function newQuestion(): QuizQuestion {
  return {
    id: crypto.randomUUID(),
    prompt: "",
    options: [
      { id: crypto.randomUUID(), text: "", correct: true },
      { id: crypto.randomUUID(), text: "", correct: false }
    ],
    explanation: ""
  };
}

function isBlankQuestion(question: QuizQuestion) {
  return !question.prompt.trim() && question.options.every((option) => !option.text.trim());
}

const CSV_TEMPLATE =
  "Question,Option A,Option B,Option C,Option D,Correct Answer,Explanation\n" +
  'What port does HTTPS use by default?,21,80,443,8080,C,"HTTPS defaults to TCP port 443, the encrypted version of HTTP on port 80."\n';

function downloadCsvTemplate() {
  const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "quiz-template.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function findColumn(header: string[], candidates: string[]) {
  return header.findIndex((cell) => candidates.some((candidate) => cell.trim().toLowerCase().startsWith(candidate)));
}

/** Parses a quiz CSV (see downloadCsvTemplate() for the expected shape) into questions. Returns parse errors for any skipped rows. */
function parseQuizCsv(text: string): { questions: QuizQuestion[]; errors: string[] } {
  const rows = parseCsv(text);
  if (rows.length < 2) return { questions: [], errors: ["The CSV has no data rows."] };

  const header = rows[0];
  const promptIdx = findColumn(header, ["question", "prompt"]);
  const correctIdx = findColumn(header, ["correct"]);
  const explanationIdx = findColumn(header, ["explanation"]);
  const optionIndices = header
    .map((cell, index) => ({ cell, index }))
    .filter(({ cell }) => cell.trim().toLowerCase().startsWith("option"))
    .map(({ index }) => index);

  if (promptIdx < 0 || correctIdx < 0 || optionIndices.length < 2) {
    return {
      questions: [],
      errors: ['The header row must include a "Question" column, at least two "Option" columns, and a "Correct Answer" column.']
    };
  }

  const questions: QuizQuestion[] = [];
  const errors: string[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const prompt = (row[promptIdx] || "").trim();
    if (!prompt) continue;

    const optionTexts = optionIndices.map((index) => (row[index] || "").trim()).filter((text) => text.length > 0);
    if (optionTexts.length < 2) {
      errors.push(`Row ${r + 1}: needs at least two non-empty options, skipped.`);
      continue;
    }

    const correctRaw = (row[correctIdx] || "").trim();
    let correctIndex = -1;
    if (/^[a-zA-Z]$/.test(correctRaw)) {
      correctIndex = correctRaw.toUpperCase().charCodeAt(0) - 65;
    } else if (/^\d+$/.test(correctRaw)) {
      correctIndex = Number(correctRaw) - 1;
    } else {
      correctIndex = optionTexts.findIndex((text) => text.toLowerCase() === correctRaw.toLowerCase());
    }

    if (correctIndex < 0 || correctIndex >= optionTexts.length) {
      errors.push(`Row ${r + 1}: "Correct Answer" (${correctRaw || "blank"}) doesn't match any option, skipped.`);
      continue;
    }

    questions.push({
      id: crypto.randomUUID(),
      prompt,
      options: optionTexts.map((text, index) => ({
        id: crypto.randomUUID(),
        text,
        correct: index === correctIndex
      })),
      explanation: explanationIdx >= 0 ? (row[explanationIdx] || "").trim() : ""
    });
  }

  if (!questions.length && !errors.length) errors.push("No usable rows found in the CSV.");
  return { questions, errors };
}

export function QuizBuilder({ initialQuestions }: { initialQuestions: QuizQuestion[] }) {
  const [questions, setQuestions] = useState<QuizQuestion[]>(
    initialQuestions.length ? initialQuestions : [newQuestion()]
  );
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleCsvUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const text = await file.text();
    const { questions: imported, errors } = parseQuizCsv(text);
    setCsvErrors(errors);
    if (!imported.length) return;

    setQuestions((prev) => {
      const keepExisting = prev.filter((question) => !isBlankQuestion(question));
      return [...keepExisting, ...imported];
    });
  }

  return (
    <div className="space-y-4">
      <input type="hidden" name="questionsJson" value={JSON.stringify(questions)} />

      <div className="flex flex-wrap items-center gap-3 rounded-md border border-dashed border-slate-300 bg-cloud p-3">
        <button
          type="button"
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-slate-50"
          onClick={() => fileInputRef.current?.click()}
        >
          Upload questions from CSV
        </button>
        <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleCsvUpload} />
        <button
          type="button"
          className="text-xs font-semibold text-blueglow hover:underline"
          onClick={downloadCsvTemplate}
        >
          Download CSV template
        </button>
        <p className="w-full text-xs text-slate-500">
          Columns: Question, Option A / Option B / ... (2-8 of them), Correct Answer (the option&apos;s letter), Explanation (optional).
          Imported questions are added to the list below.
        </p>
      </div>
      {csvErrors.length ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
          {csvErrors.map((error, index) => (
            <p key={index}>{error}</p>
          ))}
        </div>
      ) : null}

      {questions.map((question, qIndex) => (
        <fieldset key={question.id} className="rounded-md border border-slate-200 p-4">
          <div className="flex items-center justify-between gap-2">
            <legend className="px-1 text-sm font-semibold">Question {qIndex + 1}</legend>
            {questions.length > 1 ? (
              <button
                type="button"
                className="text-xs font-semibold text-red-600 hover:underline"
                onClick={() => setQuestions((prev) => prev.filter((q) => q.id !== question.id))}
              >
                Remove question
              </button>
            ) : null}
          </div>
          <input
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Question prompt"
            value={question.prompt}
            onChange={(event) =>
              setQuestions((prev) =>
                prev.map((q) => (q.id === question.id ? { ...q, prompt: event.target.value } : q))
              )
            }
          />
          <div className="mt-3 space-y-2">
            {question.options.map((option) => (
              <div key={option.id} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`correct-${question.id}`}
                  checked={option.correct}
                  onChange={() =>
                    setQuestions((prev) =>
                      prev.map((q) =>
                        q.id === question.id
                          ? { ...q, options: q.options.map((o) => ({ ...o, correct: o.id === option.id })) }
                          : q
                      )
                    )
                  }
                  title="Mark as the correct answer"
                />
                <input
                  className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Option text"
                  value={option.text}
                  onChange={(event) =>
                    setQuestions((prev) =>
                      prev.map((q) =>
                        q.id === question.id
                          ? {
                              ...q,
                              options: q.options.map((o) =>
                                o.id === option.id ? { ...o, text: event.target.value } : o
                              )
                            }
                          : q
                      )
                    )
                  }
                />
                {question.options.length > 2 ? (
                  <button
                    type="button"
                    className="text-xs font-semibold text-red-600 hover:underline"
                    onClick={() =>
                      setQuestions((prev) =>
                        prev.map((q) =>
                          q.id === question.id
                            ? { ...q, options: q.options.filter((o) => o.id !== option.id) }
                            : q
                        )
                      )
                    }
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            ))}
            {question.options.length < 8 ? (
              <button
                type="button"
                className="text-xs font-semibold text-blueglow hover:underline"
                onClick={() =>
                  setQuestions((prev) =>
                    prev.map((q) =>
                      q.id === question.id
                        ? { ...q, options: [...q.options, { id: crypto.randomUUID(), text: "", correct: false }] }
                        : q
                    )
                  )
                }
              >
                + Add option
              </button>
            ) : null}
          </div>
          <textarea
            className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Explanation shown to students after they answer (optional)"
            rows={2}
            value={question.explanation || ""}
            onChange={(event) =>
              setQuestions((prev) =>
                prev.map((q) => (q.id === question.id ? { ...q, explanation: event.target.value } : q))
              )
            }
          />
        </fieldset>
      ))}
      <button
        type="button"
        className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-cloud"
        onClick={() => setQuestions((prev) => [...prev, newQuestion()])}
      >
        + Add question
      </button>
    </div>
  );
}
