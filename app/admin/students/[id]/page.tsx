import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";
import { moveStageAction, saveCrmNotesAction } from "@/lib/actions/crm";
import { requireAdmin } from "@/lib/auth";
import { FUNNEL_STAGES } from "@/lib/config/crm";
import { formatPrice } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getTotalPoints } from "@/lib/services/playback";

export const dynamic = "force-dynamic";

export default async function AdminStudentDetailPage({ params, searchParams }: { params: { id: string }; searchParams: { saved?: string } }) {
  requireAdmin();
  if (!/^[a-z0-9]{10,40}$/i.test(params.id)) notFound();
  const student = await prisma.student.findUnique({
    where: { id: params.id },
    include: {
      crm: true,
      orders: { orderBy: { createdAt: "desc" }, include: { items: { include: { product: { select: { title: true } } } } } },
      entitlements: { where: { status: "active" }, include: { course: { select: { id: true, title: true } } } }
    }
  });
  if (!student) notFound();

  const [points, events, progress, lessonCounts, lead] = await Promise.all([
    getTotalPoints(student.id),
    prisma.event.findMany({ where: { studentId: student.id }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.watchProgress.groupBy({ by: ["courseId"], where: { studentId: student.id, completedAt: { not: null } }, _count: { _all: true } }),
    prisma.courseLesson.groupBy({ by: ["courseId"], _count: { _all: true } }),
    student.crm?.leadId ? prisma.lead.findUnique({ where: { id: student.crm.leadId }, select: { pathwayResult: true, startTimeline: true } }) : null
  ]);
  const doneBy = new Map(progress.map((p) => [p.courseId, p._count._all]));
  const totalBy = new Map(lessonCounts.map((p) => [p.courseId, p._count._all]));
  const crm = student.crm;

  return (
    <main className="min-h-screen bg-cloud">
      <AdminNav />
      <section className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{student.name}</h1>
          <Link className="text-sm font-semibold text-blueglow" href="/admin/pipeline">Back to pipeline</Link>
        </div>
        <p className="text-slate-600">
          {student.email} - joined {student.createdAt.toISOString().slice(0, 10)} - {points} points
          {crm?.source ? ` - source: ${crm.source}` : ""}
          {lead ? ` - quiz result: ${lead.pathwayResult}` : ""}
        </p>

        <div className="grid gap-6 lg:grid-cols-2">
          <form action={moveStageAction} className="space-y-3 rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="font-bold">Stage</h2>
            <input type="hidden" name="studentId" value={student.id} />
            <input type="hidden" name="back" value="detail" />
            <select className="w-full rounded-md border border-slate-300 px-3 py-2" name="stage" defaultValue={crm?.stage ?? "signed_up"}>
              {FUNNEL_STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <button className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white" type="submit">Set stage</button>
            <p className="text-xs text-slate-500">
              Marketing email consent: {crm?.emailConsent ? `yes (${crm.consentSource}, ${crm.consentAt?.toISOString().slice(0, 10)})` : "no"}
            </p>
          </form>

          <form action={saveCrmNotesAction} className="space-y-3 rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="font-bold">Notes and tags</h2>
            {searchParams.saved ? <p className="text-sm text-emerald-700">Saved.</p> : null}
            <input type="hidden" name="studentId" value={student.id} />
            <input className="w-full rounded-md border border-slate-300 px-3 py-2" name="tags" placeholder="tags, comma separated" defaultValue={crm?.tags ?? ""} />
            <textarea className="h-28 w-full rounded-md border border-slate-300 px-3 py-2" name="notes" placeholder="Notes" defaultValue={crm?.notes ?? ""} />
            <button className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white" type="submit">Save</button>
          </form>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="font-bold">Progress</h2>
            <ul className="mt-2 space-y-1 text-sm">
              {student.entitlements.length === 0 ? <li className="text-slate-500">No course access.</li> : null}
              {student.entitlements.map((e) => (
                <li key={e.id}>{e.course.title}: {doneBy.get(e.course.id) ?? 0} / {totalBy.get(e.course.id) ?? 0} lessons</li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="font-bold">Orders</h2>
            <ul className="mt-2 space-y-1 text-sm">
              {student.orders.length === 0 ? <li className="text-slate-500">No orders.</li> : null}
              {student.orders.map((o) => (
                <li key={o.id}>
                  {o.createdAt.toISOString().slice(0, 10)} - {o.items.map((i) => i.product.title).join(", ")} - {formatPrice(o.amountCents, o.currency)} -{" "}
                  <span className={o.status === "paid" ? "text-emerald-700" : "font-semibold text-red-600"}>{o.status}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="font-bold">Timeline</h2>
          <ul className="mt-2 divide-y divide-slate-100 text-sm">
            {events.length === 0 ? <li className="py-2 text-slate-500">No events yet.</li> : null}
            {events.map((e) => (
              <li key={e.id} className="flex justify-between gap-4 py-2">
                <span><span className="font-semibold">{e.event}</span> <span className="text-xs text-slate-400">{e.metadataJson ? JSON.stringify(e.metadataJson).slice(0, 120) : ""}</span></span>
                <span className="whitespace-nowrap text-xs text-slate-500">{e.createdAt.toISOString().slice(0, 16).replace("T", " ")}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
