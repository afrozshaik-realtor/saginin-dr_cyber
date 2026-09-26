import Link from "next/link";

export default function LeadCapturePage() {
  return (
    <main className="min-h-screen bg-cloud px-6 py-10">
      <section className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-6 md:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blueglow">Lead capture</p>
        <h1 className="mt-3 text-4xl font-bold">Get your cyber career roadmap</h1>
        <p className="mt-4 text-slate-600">
          The lead form is built into the quiz so your contact record includes pathway scores and answer history.
        </p>
        <Link className="mt-8 inline-flex rounded-md bg-cyan px-5 py-3 font-bold text-navy hover:bg-mint" href="/quiz">
          Take the Free Dr Cyber Quiz
        </Link>
      </section>
    </main>
  );
}
