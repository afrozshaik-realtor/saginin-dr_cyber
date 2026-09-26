import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { getStripeClient } from "@/lib/services/stripe";
import { enrollStudent, getCourseBySlug, getEnrollment } from "@/lib/store";
import { requireStudent } from "@/lib/studentAuth";

export default async function CheckoutSuccessPage({
  searchParams
}: {
  searchParams: { session_id?: string; slug?: string };
}) {
  const slug = searchParams.slug || "";
  const course = await getCourseBySlug(slug);
  if (!course) redirect("/courses");

  const student = await requireStudent(`/checkout/success?slug=${slug}`);

  let enrollment = await getEnrollment(student.id, course!.id);

  if (!enrollment && searchParams.session_id) {
    const stripe = getStripeClient();
    if (stripe) {
      try {
        const session = await stripe.checkout.sessions.retrieve(searchParams.session_id);
        if (session.payment_status === "paid" && session.metadata?.studentId === student.id) {
          enrollment = await enrollStudent(student.id, course!.id, {
            paymentStatus: "paid",
            amountPaidCents: session.amount_total ?? course!.priceCents,
            currency: session.currency ?? course!.currency,
            stripeSessionId: session.id
          });
        }
      } catch {
        // Session lookup failed - fall through to the "processing" state below.
      }
    }
  }

  return (
    <main className="min-h-screen bg-cloud">
      <SiteHeader student={student} />
      <section className="mx-auto max-w-2xl px-6 py-16 text-center">
        {enrollment ? (
          <>
            <h1 className="text-3xl font-bold">You&apos;re enrolled!</h1>
            <p className="mt-3 text-slate-600">
              Thanks for purchasing {course!.title}. You can start learning right away.
            </p>
            <Link
              className="mt-6 inline-flex rounded-md bg-cyan px-5 py-3 font-semibold text-navy shadow-glow hover:bg-mint"
              href={`/learn/${slug}`}
            >
              Start learning
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold">Finishing up...</h1>
            <p className="mt-3 text-slate-600">
              Your payment is processing. Refresh this page in a few seconds, or check your dashboard shortly.
            </p>
            <Link
              className="mt-6 inline-flex rounded-md border border-slate-300 px-5 py-3 font-semibold hover:bg-cloud"
              href="/dashboard"
            >
              Go to dashboard
            </Link>
          </>
        )}
      </section>
    </main>
  );
}
