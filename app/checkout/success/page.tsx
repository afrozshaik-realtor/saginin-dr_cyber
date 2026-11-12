import { redirect } from "next/navigation";
import { CheckoutStatus } from "@/components/CheckoutStatus";
import { SiteHeader } from "@/components/SiteHeader";
import { requireStudent } from "@/lib/studentAuth";

export const dynamic = "force-dynamic";

export default async function CheckoutSuccessPage({ searchParams }: { searchParams: { session_id?: string } }) {
  const sessionId = searchParams.session_id || "";
  if (!/^cs_[A-Za-z0-9_]{10,200}$/.test(sessionId)) redirect("/courses");
  const student = await requireStudent(`/checkout/success?session_id=${encodeURIComponent(sessionId)}`);

  return (
    <main className="min-h-screen bg-cloud">
      <SiteHeader student={student} />
      <section className="mx-auto max-w-2xl px-6 py-16 text-center">
        <CheckoutStatus sessionId={sessionId} />
      </section>
    </main>
  );
}
