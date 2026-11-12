import Link from "next/link";
import { AdminNav } from "@/components/AdminNav";
import { moveStageAction } from "@/lib/actions/crm";
import { requireAdmin } from "@/lib/auth";
import { FUNNEL_STAGES } from "@/lib/config/crm";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminPipelinePage() {
  requireAdmin();
  const rows = await prisma.studentCrm.findMany({
    orderBy: { stageUpdatedAt: "desc" },
    include: { student: { select: { id: true, name: true, email: true } } }
  });

  return (
    <main className="min-h-screen bg-cloud">
      <AdminNav />
      <section className="px-6 py-8">
        <h1 className="text-3xl font-bold">Pipeline</h1>
        <p className="mt-1 text-sm text-slate-600">
          Students move forward automatically as they sign up, buy, finish courses and book. Use the dropdown to move someone by hand.
        </p>
        <div className="mt-6 grid gap-4 overflow-x-auto lg:grid-cols-6">
          {FUNNEL_STAGES.map((stage) => {
            const cards = rows.filter((r) => r.stage === stage.id);
            return (
              <div key={stage.id} className="min-w-[14rem] rounded-lg border border-slate-200 bg-slate-50 p-3">
                <h2 className="text-sm font-bold">{stage.label} <span className="text-slate-400">({cards.length})</span></h2>
                <div className="mt-3 space-y-3">
                  {cards.map((c) => (
                    <div key={c.id} className="rounded-md border border-slate-200 bg-white p-3 text-sm">
                      <Link className="font-semibold text-blueglow" href={`/admin/students/${c.student.id}`}>{c.student.name}</Link>
                      <p className="truncate text-xs text-slate-500">{c.student.email}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {c.completedCourses} course(s) done{c.emailConsent ? " - opted in" : ""}
                      </p>
                      {c.tags ? <p className="mt-1 text-xs text-slate-400">{c.tags.split(",").join(" - ")}</p> : null}
                      <form action={moveStageAction} className="mt-2 flex gap-1">
                        <input type="hidden" name="studentId" value={c.student.id} />
                        <select className="w-full rounded border border-slate-300 px-1 py-1 text-xs" name="stage" defaultValue={c.stage}>
                          {FUNNEL_STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                        </select>
                        <button className="rounded bg-ink px-2 text-xs font-semibold text-white" type="submit">Move</button>
                      </form>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
