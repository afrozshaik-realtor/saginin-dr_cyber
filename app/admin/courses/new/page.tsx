import { AdminNav } from "@/components/AdminNav";
import { createCourseAction } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth";

export default function NewCoursePage({ searchParams }: { searchParams: { error?: string } }) {
  requireAdmin();

  return (
    <main className="min-h-screen bg-cloud">
      <AdminNav />
      <section className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="text-3xl font-bold">New course</h1>
        {searchParams.error ? (
          <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            Check the fields below - something was missing or invalid.
          </p>
        ) : null}
        <form action={createCourseAction} className="mt-6 space-y-4 rounded-lg border border-slate-200 bg-white p-6">
          <label className="block text-sm font-semibold">
            Title
            <input className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2" name="title" required />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold">
              Category
              <input className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2" name="category" required />
            </label>
            <label className="block text-sm font-semibold">
              Level
              <select className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2" name="level" defaultValue="Beginner">
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </select>
            </label>
          </div>
          <label className="block text-sm font-semibold">
            Summary (short, shown on course cards)
            <textarea className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2" name="summary" rows={2} required />
          </label>
          <label className="block text-sm font-semibold">
            Description (shown on the course landing page)
            <textarea className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2" name="description" rows={4} required />
          </label>
          <label className="block text-sm font-semibold">
            Certification target (optional)
            <input className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2" name="certification" />
          </label>
          <label className="block text-sm font-semibold">
            Cover image path (e.g. /images/cyber-workshop.png)
            <input className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2" name="image" required />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold">
              Price (cents)
              <input
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2"
                name="priceCents"
                type="number"
                min={0}
                defaultValue={19900}
                required
              />
            </label>
            <label className="block text-sm font-semibold">
              Currency
              <input className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2" name="currency" defaultValue="usd" required />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" name="published" defaultChecked />
            Published (visible in the public catalog)
          </label>
          <button className="rounded-md bg-cyan px-5 py-3 text-sm font-semibold text-navy shadow-glow hover:bg-mint" type="submit">
            Create course
          </button>
        </form>
      </section>
    </main>
  );
}
