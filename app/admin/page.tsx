import Link from "next/link";
import { AdminNav } from "@/components/AdminNav";
import { requireAdmin } from "@/lib/auth";
import { getMetrics } from "@/lib/store";

export default async function AdminDashboard() {
  requireAdmin();
  const metrics = await getMetrics();
  const cards = [
    ["Total leads", metrics.totalLeads],
    ["Quiz completions", metrics.quizCompletions],
    ["Calls booked", metrics.callsBooked],
    ["Enrolled students", metrics.enrolled],
    ["Quiz to call conversion", `${metrics.conversionRate}%`],
    ["LMS students", metrics.totalStudents],
    ["Course enrollments", metrics.totalEnrollments]
  ];

  return (
    <main className="min-h-screen bg-cloud">
      <AdminNav />
      <section className="mx-auto max-w-7xl px-6 py-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="mt-6 grid gap-4 md:grid-cols-5">
          {cards.map(([label, value]) => (
            <div key={label} className="rounded-lg border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-bold">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="text-xl font-bold">Leads by pathway</h2>
            <div className="mt-4 space-y-3">
              {Object.entries(metrics.leadsByPathway).map(([pathway, count]) => (
                <div key={pathway} className="flex items-center justify-between gap-4 text-sm">
                  <span>{pathway}</span>
                  <span className="font-bold">{count}</span>
                </div>
              ))}
              {!Object.keys(metrics.leadsByPathway).length ? <p className="text-sm text-slate-500">No leads yet.</p> : null}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Recent leads</h2>
              <Link className="text-sm font-semibold text-blueglow" href="/admin/leads">
                View all
              </Link>
            </div>
            <div className="mt-4 divide-y divide-slate-100">
              {metrics.recentLeads.map((lead) => (
                <Link key={lead.id} className="block py-3 hover:bg-cloud" href={`/admin/leads/${lead.id}`}>
                  <p className="font-semibold">
                    {lead.firstName} {lead.lastName}
                  </p>
                  <p className="text-sm text-slate-500">{lead.pathwayResult}</p>
                </Link>
              ))}
              {!metrics.recentLeads.length ? <p className="py-3 text-sm text-slate-500">No leads yet.</p> : null}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
