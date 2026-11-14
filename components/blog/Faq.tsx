import type { BlogFaq } from "@/lib/blog/types";

/**
 * Native <details>/<summary>: keyboard and screen-reader accessible with no JavaScript,
 * and every answer is present in the server-rendered HTML for crawlers.
 */
export function Faq({ faqs }: { faqs: BlogFaq[] }) {
  return (
    <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
      {faqs.map((faq) => (
        <details key={faq.question} className="group px-5 py-4">
          <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-4 text-left text-lg font-semibold text-[#101C42] [&::-webkit-details-marker]:hidden">
            <h3 className="text-lg font-semibold">{faq.question}</h3>
            <span aria-hidden="true" className="text-2xl leading-none text-[#2563EB] transition group-open:rotate-45 motion-reduce:transition-none">
              +
            </span>
          </summary>
          <p className="mt-3 text-base leading-7 text-slate-700">{faq.answer}</p>
        </details>
      ))}
    </div>
  );
}
