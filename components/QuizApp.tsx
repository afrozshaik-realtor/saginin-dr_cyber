"use client";

import { useMemo, useState } from "react";
import type { LeadInput, QuizAnswerInput, QuizQuestion } from "@/types/funnel";

type Props = {
  questions: QuizQuestion[];
  searchParams: Record<string, string | string[] | undefined>;
};

const blankLead: LeadInput = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  currentProfession: "",
  city: "",
  country: "",
  startTimeline: "",
  consent: false,
  source: "quiz"
};

export function QuizApp({ questions, searchParams }: Props) {
  const [sessionId, setSessionId] = useState("");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [lead, setLead] = useState<LeadInput>(blankLead);
  const [hp, setHp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const progress = useMemo(() => Math.round(((Math.min(step, questions.length) + 1) / (questions.length + 1)) * 100), [step, questions.length]);
  const current = questions[step];
  const onStart = async () => {
    if (!sessionId) {
      const response = await fetch("/api/quiz/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "quiz", searchParams })
      });
      const json = await response.json();
      setSessionId(json.sessionId);
    }
  };

  const choose = async (questionId: string, selectedAnswer: string) => {
    await onStart();
    setAnswers((value) => ({ ...value, [questionId]: selectedAnswer }));
    setTimeout(() => setStep((value) => Math.min(value + 1, questions.length)), 120);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    const quizAnswers: QuizAnswerInput[] = questions.map((question) => ({
      questionId: question.id,
      selectedAnswer: answers[question.id]
    }));

    const payload = {
      sessionId,
      hp,
      lead: {
        ...lead,
        utmSource: stringParam(searchParams.utm_source),
        utmMedium: stringParam(searchParams.utm_medium),
        utmCampaign: stringParam(searchParams.utm_campaign),
        utmContent: stringParam(searchParams.utm_content),
        utmTerm: stringParam(searchParams.utm_term)
      },
      answers: quizAnswers
    };

    const response = await fetch("/api/quiz/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const json = await response.json();
    setSubmitting(false);
    if (!response.ok) {
      setError(json.error || "Please check the form and try again.");
      return;
    }
    window.location.href = `/result?id=${json.leadId}`;
  };

  return (
    <main className="min-h-screen bg-navy px-4 py-6 text-white">
      <div className="mx-auto max-w-6xl">
        <a className="text-sm text-slate-300 hover:text-white" href="/">
          Back to home
        </a>
        <div className="mt-6 grid gap-6 lg:grid-cols-[.9fr_1.1fr] lg:items-start">
          <aside className="overflow-hidden rounded-lg border border-white/10 bg-white/5 shadow-glow">
            <img
              className="aspect-[16/10] w-full object-cover lg:aspect-[4/5]"
              src={step < questions.length ? "/images/quiz-process.png" : "/images/mentor-consultation.png"}
              alt={
                step < questions.length
                  ? "Cyber career pathway quiz process"
                  : "Mentor reviewing a career roadmap with a learner"
              }
            />
            <div className="p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-mint">Dr Cyber Quiz</p>
              <p className="mt-2 text-sm text-slate-300">
                Ten answers create a pathway score, skill match, and recommended roadmap.
              </p>
            </div>
          </aside>

          <div className="rounded-lg border border-white/10 bg-white/5 p-5 shadow-glow md:p-8">
          <div className="mb-6">
            <div className="mb-2 flex justify-between text-sm text-slate-300">
              <span>{step < questions.length ? `Question ${step + 1} of ${questions.length}` : "Lead details"}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 rounded bg-white/10">
              <div className="h-2 rounded bg-cyan transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {step < questions.length ? (
            <section className="transition">
              <h1 className="text-2xl font-bold md:text-3xl">{current.text}</h1>
              <div className="mt-6 grid gap-3">
                {current.options.map((option) => (
                  <button
                    key={option.id}
                    className="focus-ring rounded-md border border-white/10 bg-white/10 px-4 py-3 text-left text-sm font-semibold hover:border-cyan hover:bg-cyan/10"
                    type="button"
                    onClick={() => choose(current.id, option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <form className="space-y-5" onSubmit={submit}>
              <div>
                <h1 className="text-2xl font-bold md:text-3xl">Get your personalized pathway</h1>
                <p className="mt-2 text-slate-300">
                  Enter your details so we can send your roadmap and consultation link.
                </p>
              </div>
              <input
                className="hidden"
                value={hp}
                onChange={(event) => setHp(event.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
              />
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="First name" value={lead.firstName} onChange={(firstName) => setLead({ ...lead, firstName })} />
                <Field label="Last name" value={lead.lastName} onChange={(lastName) => setLead({ ...lead, lastName })} />
                <Field label="Email" type="email" value={lead.email} onChange={(email) => setLead({ ...lead, email })} />
                <Field label="Phone" value={lead.phone || ""} onChange={(phone) => setLead({ ...lead, phone })} />
                <Field
                  label="Current profession"
                  value={lead.currentProfession}
                  onChange={(currentProfession) => setLead({ ...lead, currentProfession })}
                />
                <Field label="City" value={lead.city} onChange={(city) => setLead({ ...lead, city })} />
                <Field label="Country" value={lead.country} onChange={(country) => setLead({ ...lead, country })} />
                <label className="block text-sm font-semibold text-slate-100">
                  Preferred start timeline
                  <select
                    className="mt-2 w-full rounded-md border border-white/10 bg-ink px-3 py-3 text-white"
                    value={lead.startTimeline}
                    onChange={(event) => setLead({ ...lead, startTimeline: event.target.value })}
                    required
                  >
                    <option value="">Choose timeline</option>
                    <option>Immediately</option>
                    <option>Within 30 days</option>
                    <option>Within 3 months</option>
                    <option>Just researching</option>
                  </select>
                </label>
              </div>
              <label className="flex gap-3 text-sm text-slate-200">
                <input
                  className="mt-1"
                  type="checkbox"
                  checked={lead.consent}
                  onChange={(event) => setLead({ ...lead, consent: event.target.checked })}
                  required
                />
                I agree to receive my quiz result and follow-up messages. I understand I can unsubscribe at any time.
              </label>
              {error ? <p className="rounded-md bg-red-500/15 p-3 text-sm text-red-100">{error}</p> : null}
              <button
                className="focus-ring w-full rounded-md bg-cyan px-5 py-3 font-bold text-navy hover:bg-mint disabled:opacity-60"
                disabled={submitting}
                type="submit"
              >
                {submitting ? "Creating your roadmap..." : "Show My Pathway"}
              </button>
            </form>
          )}
          </div>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block text-sm font-semibold text-slate-100">
      {label}
      <input
        className="mt-2 w-full rounded-md border border-white/10 bg-ink px-3 py-3 text-white"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={label !== "Phone"}
      />
    </label>
  );
}

function stringParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}
