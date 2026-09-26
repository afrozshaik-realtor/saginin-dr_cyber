import { appSettings } from "@/lib/settings";

export default function BookPage() {
  const settings = appSettings();
  return (
    <main className="min-h-screen bg-cloud px-6 py-10">
      <section className="mx-auto grid max-w-6xl overflow-hidden rounded-lg border border-slate-200 bg-white md:grid-cols-[1fr_.95fr]">
        <div className="p-6 md:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blueglow">Free consultation</p>
          <h1 className="mt-3 text-4xl font-bold">Book your Dr Cyber Roadmap Call</h1>
          <p className="mt-4 max-w-2xl text-slate-600">
            Use this call to clarify your pathway, first certification, portfolio projects, and program fit.
          </p>
          <div className="mt-8 rounded-lg border border-slate-200 bg-cloud p-6">
            <p className="font-semibold">Booking link</p>
            <a className="mt-2 block break-all text-blueglow underline" href={settings.bookingLink}>
              {settings.bookingLink}
            </a>
          </div>
        </div>
        <img
          className="h-full min-h-[360px] w-full object-cover"
          src="/images/online-mentor-session.png"
          alt="Learner attending an online cybersecurity roadmap call"
        />
      </section>
    </main>
  );
}
