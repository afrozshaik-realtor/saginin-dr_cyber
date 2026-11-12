import { AdminNav } from "@/components/AdminNav";
import { compGrantAction, restoreAccessAction, revokeAccessAction } from "@/lib/actions/adminAccess";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const messages: Record<string, string> = {
  granted: "Access granted.",
  revoked: "Access revoked.",
  restored: "Access restored.",
  nostudent: "No student with that email. Ask them to create an account first.",
  noproduct: "Unknown product.",
  invalid: "Invalid request."
};

export default async function AdminAccessPage({ searchParams }: { searchParams: { email?: string; msg?: string } }) {
  requireAdmin();
  const email = (searchParams.email || "").trim().toLowerCase();
  const [products, student] = await Promise.all([
    prisma.product.findMany({ where: { active: true }, orderBy: [{ type: "desc" }, { slug: "asc" }] }),
    email
      ? prisma.student.findUnique({
          where: { email },
          include: { entitlements: { include: { course: { select: { title: true, id: true } } }, orderBy: { grantedAt: "desc" } }, enrollments: true }
        })
      : null
  ]);
  const legacy = student
    ? await prisma.course.findMany({ where: { id: { in: student.enrollments.map((e) => e.courseId) } }, select: { id: true, title: true } })
    : [];

  return (
    <main className="min-h-screen bg-cloud">
      <AdminNav />
      <section className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        <h1 className="text-3xl font-bold">Access</h1>
        {searchParams.msg ? <p className="rounded-md border border-slate-200 bg-white p-3 text-sm">{messages[searchParams.msg] ?? ""}</p> : null}

        <form className="flex gap-2" method="get">
          <input className="w-full rounded-md border border-slate-300 px-3 py-2" name="email" type="email" placeholder="Student email" defaultValue={email} required />
          <button className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white" type="submit">Look up</button>
        </form>

        {email && !student ? <p className="text-sm text-slate-600">No student with that email.</p> : null}

        {student ? (
          <>
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <h2 className="font-bold">{student.name} <span className="font-normal text-slate-500">{student.email}</span></h2>
              <ul className="mt-3 divide-y divide-slate-100 text-sm">
                {student.entitlements.map((ent) => (
                  <li key={ent.id} className="flex items-center justify-between gap-3 py-2">
                    <span>
                      {ent.course.title}{" "}
                      <span className="text-slate-500">
                        - {ent.status} ({ent.source}{ent.note ? `: ${ent.note}` : ""}) {ent.grantedAt.toISOString().slice(0, 10)}
                      </span>
                    </span>
                    <form action={ent.status === "active" ? revokeAccessAction : restoreAccessAction}>
                      <input type="hidden" name="studentId" value={student.id} />
                      <input type="hidden" name="courseId" value={ent.courseId} />
                      <input type="hidden" name="email" value={student.email} />
                      <button className={`font-semibold ${ent.status === "active" ? "text-red-600" : "text-blueglow"}`} type="submit">
                        {ent.status === "active" ? "Revoke" : "Restore"}
                      </button>
                    </form>
                  </li>
                ))}
                {legacy.map((course) => (
                  <li key={course.id} className="flex items-center justify-between gap-3 py-2">
                    <span>{course.title} <span className="text-slate-500">- enrolled (legacy / admin grant)</span></span>
                    <form action={revokeAccessAction}>
                      <input type="hidden" name="studentId" value={student.id} />
                      <input type="hidden" name="courseId" value={course.id} />
                      <input type="hidden" name="email" value={student.email} />
                      <button className="font-semibold text-red-600" type="submit">Revoke</button>
                    </form>
                  </li>
                ))}
                {student.entitlements.length === 0 && legacy.length === 0 ? <li className="py-2 text-slate-500">No access yet.</li> : null}
              </ul>
            </div>

            <form action={compGrantAction} className="space-y-3 rounded-lg border border-slate-200 bg-white p-5">
              <h2 className="font-bold">Grant comp access</h2>
              <input type="hidden" name="email" value={student.email} />
              <select className="w-full rounded-md border border-slate-300 px-3 py-2" name="productSlug" required>
                {products.map((p) => (
                  <option key={p.id} value={p.slug}>{p.type === "bundle" ? "BUNDLE: " : ""}{p.title}</option>
                ))}
              </select>
              <input className="w-full rounded-md border border-slate-300 px-3 py-2" name="note" maxLength={200} placeholder="Reason (e.g. giveaway, support goodwill)" />
              <button className="rounded-md bg-cyan px-4 py-2 text-sm font-semibold text-navy hover:bg-mint" type="submit">Grant</button>
            </form>
          </>
        ) : null}
      </section>
    </main>
  );
}
