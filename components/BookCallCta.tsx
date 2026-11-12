import type { CtaLevel } from "@/lib/config/crm";

/** "Book a 1x1 with Dr_Cyber". Soft after the first completed course; strong after the bundle or all courses. */
export function BookCallCta({ level }: { level: CtaLevel }) {
  if (level === "none") return null;
  const strong = level === "strong";
  return (
    <div className={strong ? "rounded-lg border-2 border-cyan bg-navy p-6 text-white" : "rounded-lg border border-slate-200 bg-white p-5"}>
      <p className={strong ? "text-xl font-bold" : "font-bold"}>
        {strong ? "You've built a strong foundation. Ready for the next step?" : "Nice work finishing your first course!"}
      </p>
      <p className={strong ? "mt-2 text-slate-200" : "mt-1 text-sm text-slate-600"}>
        {strong
          ? "Book a 1x1 session with Dr_Cyber to map out your cybersecurity career path, step by step."
          : "Curious where this could lead? You can book a 1x1 session with Dr_Cyber any time."}
      </p>
      <a
        className={`mt-4 inline-flex rounded-md px-5 py-3 text-sm font-semibold ${strong ? "bg-cyan text-navy hover:bg-mint" : "bg-ink text-white hover:bg-navy"}`}
        href="/book-1x1"
      >
        Book a 1x1 with Dr_Cyber
      </a>
    </div>
  );
}
