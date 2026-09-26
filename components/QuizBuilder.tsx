"use client";

import { useState } from "react";
import type { QuizQuestion } from "@/types/lms";

function newQuestion(): QuizQuestion {
  return {
    id: crypto.randomUUID(),
    prompt: "",
    options: [
      { id: crypto.randomUUID(), text: "", correct: true },
      { id: crypto.randomUUID(), text: "", correct: false }
    ]
  };
}

export function QuizBuilder({ initialQuestions }: { initialQuestions: QuizQuestion[] }) {
  const [questions, setQuestions] = useState<QuizQuestion[]>(
    initialQuestions.length ? initialQuestions : [newQuestion()]
  );

  return (
    <div className="space-y-4">
      <input type="hidden" name="questionsJson" value={JSON.stringify(questions)} />
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
