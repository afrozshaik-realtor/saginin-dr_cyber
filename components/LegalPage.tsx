import { SiteHeader } from "@/components/SiteHeader";
import { LEGAL_LAST_UPDATED, type LegalDoc, type LegalVars } from "@/lib/config/legal";
import { getCurrentStudent } from "@/lib/studentAuth";

export async function LegalPage({ doc, vars }: { doc: LegalDoc; vars: LegalVars }) {
  const student = await getCurrentStudent();
  return (
    <main className="min-h-screen bg-cloud">
      <SiteHeader student={student} />
      <article className="mx-auto max-w-3xl px-6 py-12">
        {!vars.reviewed ? (
          <p className="mb-6 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <strong>Draft - not yet reviewed.</strong> This page is a working draft and has not been reviewed by a lawyer. Details in
            [square brackets] still need to be filled in.
          </p>
        ) : null}
        <h1 className="text-4xl font-bold">{doc.title}</h1>
        <p className="mt-2 text-sm text-slate-500">Last updated: {LEGAL_LAST_UPDATED}</p>
        <p className="mt-6 leading-7 text-slate-700">{doc.intro}</p>
        {doc.sections.map((section) => (
          <section key={section.heading} className="mt-8">
            <h2 className="text-xl font-bold">{section.heading}</h2>
            {section.paragraphs?.map((p) => (
              <p key={p} className="mt-3 leading-7 text-slate-700">{p}</p>
            ))}
            {section.items ? (
              <ul className="mt-3 list-disc space-y-2 pl-6 leading-7 text-slate-700">
                {section.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            ) : null}
          </section>
        ))}
      </article>
    </main>
  );
}
