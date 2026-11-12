import { AdminNav } from "@/components/AdminNav";
import { requireAdmin } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  requireAdmin();
  const hourAgo = new Date(Date.now() - 3600_000);
  const [orders, failures, failuresLastHour] = await Promise.all([
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { student: { select: { email: true } }, items: { include: { product: { select: { title: true } } } } }
    }),
    prisma.paymentFailure.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.paymentFailure.count({ where: { createdAt: { gt: hourAgo } } })
  ]);

  return (
    <main className="min-h-screen bg-cloud">
      <AdminNav />
      <section className="mx-auto max-w-7xl space-y-8 px-6 py-8">
        <h1 className="text-3xl font-bold">Orders</h1>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="p-3">Date</th><th className="p-3">Student</th><th className="p-3">Items</th><th className="p-3">Amount</th><th className="p-3">Status</th><th className="p-3">Payment</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.length === 0 ? <tr><td className="p-3 text-slate-500" colSpan={6}>No orders yet.</td></tr> : null}
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="p-3 whitespace-nowrap">{o.createdAt.toISOString().slice(0, 16).replace("T", " ")}</td>
                  <td className="p-3">{o.student.email}</td>
                  <td className="p-3">{o.items.map((i) => i.product.title).join(", ")}</td>
                  <td className="p-3">{formatPrice(o.amountCents, o.currency)}</td>
                  <td className="p-3"><span className={o.status === "paid" ? "text-emerald-700" : "font-semibold text-red-600"}>{o.status}</span></td>
                  <td className="p-3 font-mono text-xs text-slate-500">{o.stripePaymentIntentId ?? o.stripeSessionId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h2 className="text-xl font-bold">Failed payments <span className="text-sm font-normal text-slate-500">({failuresLastHour} in the last hour)</span></h2>
          <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="p-3">When</th><th className="p-3">Student id</th><th className="p-3">Code</th><th className="p-3">Decline code</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {failures.length === 0 ? <tr><td className="p-3 text-slate-500" colSpan={4}>None.</td></tr> : null}
                {failures.map((f) => (
                  <tr key={f.id}>
                    <td className="p-3 whitespace-nowrap">{f.createdAt.toISOString().slice(0, 16).replace("T", " ")}</td>
                    <td className="p-3 font-mono text-xs">{f.studentId ?? "-"}</td>
                    <td className="p-3">{f.code ?? "-"}</td>
                    <td className="p-3">{f.declineCode ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
