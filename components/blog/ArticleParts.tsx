import type { ReactNode } from "react";

export function ArticleSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="mt-14 first:mt-0">
      <h2 id={id} className="scroll-mt-24 text-2xl font-bold tracking-tight text-[#101C42] sm:text-3xl">
        {title}
      </h2>
      <div className="mt-4 space-y-5 text-[1.0625rem] leading-8 text-slate-700">{children}</div>
    </section>
  );
}

export function SubHeading({ children }: { children: ReactNode }) {
  return <h3 className="pt-3 text-xl font-bold text-[#101C42]">{children}</h3>;
}

/** The concise, direct answer placed right under a question heading. */
export function DirectAnswer({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border-l-4 border-[#10BFA5] bg-teal-50 px-5 py-4 font-semibold leading-7 text-[#101C42]">
      {children}
    </p>
  );
}

export function Takeaway({ children }: { children: ReactNode }) {
  return (
    <blockquote className="rounded-2xl bg-gradient-to-r from-[#101C42] via-[#2563EB] to-[#8B5CF6] px-6 py-5 text-lg font-semibold leading-8 text-white">
      {children}
    </blockquote>
  );
}

export function QuickInsight({ label = "Quick insight", children }: { label?: string; children: ReactNode }) {
  return (
    <aside className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 text-base leading-7 text-slate-800">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2563EB]">{label}</p>
      <div className="mt-1">{children}</div>
    </aside>
  );
}

export function SourceNote({ children }: { children: ReactNode }) {
  return <p className="text-sm leading-6 text-slate-500">{children}</p>;
}

export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold text-[#2563EB] underline decoration-blue-200 underline-offset-4 hover:decoration-[#2563EB]"
    >
      {children}
    </a>
  );
}

export function InternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="font-semibold text-[#2563EB] underline decoration-blue-200 underline-offset-4 hover:decoration-[#2563EB]"
    >
      {children}
    </a>
  );
}

export type RoadmapStep = { title: string; detail: string };

/** Understandable without the infographic: an ordered, text-first list. */
export function RoadmapSteps({ steps }: { steps: RoadmapStep[] }) {
  return (
    <ol className="space-y-3">
      {steps.map((step, index) => (
        <li key={step.title} className="flex gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2563EB] to-[#8B5CF6] text-sm font-bold text-white"
          >
            {index + 1}
          </span>
          <div>
            <h3 className="text-lg font-bold leading-7 text-[#101C42]">
              <span className="sr-only">Step {index + 1}: </span>
              {step.title}
            </h3>
            <p className="mt-1 text-base leading-7 text-slate-700">{step.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export type CareerPath = {
  title: string;
  note?: string;
  does: string;
  example: string;
  skills: string;
  experience: string;
  fit: string;
};

export function CareerPathCard({ path, index }: { path: CareerPath; index: number }) {
  const rows: [string, string][] = [
    ["What they do", path.does],
    ["Real-world example", path.example],
    ["Skills involved", path.skills],
    ["Prior IT experience?", path.experience],
    ["You might enjoy it if", path.fit]
  ];
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-bold text-[#101C42]">
        {index}. {path.title}
      </h3>
      {path.note ? (
        <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-sm font-semibold leading-6 text-amber-900">
          {path.note}
        </p>
      ) : null}
      <dl className="mt-3 space-y-2 text-base leading-7">
        {rows.map(([term, detail]) => (
          <div key={term}>
            <dt className="inline font-semibold text-[#101C42]">{term}: </dt>
            <dd className="inline text-slate-700">{detail}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
