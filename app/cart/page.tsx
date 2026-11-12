import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { TurnstileWidget } from "@/components/TurnstileWidget";
import { turnstileSiteKey } from "@/lib/services/turnstile";
import { checkoutCartAction, removeFromCartAction, switchToBundleAction } from "@/lib/actions/cart";
import { getCartSlugs } from "@/lib/cart";
import { shouldRecommendBundle } from "@/lib/entitlementPlan";
import { formatPrice } from "@/lib/format";
import { getBundleProduct, getProductsBySlugs } from "@/lib/services/commerce";
import { getCurrentStudent } from "@/lib/studentAuth";

export const metadata = { title: "Your cart | Dr Cyber" };
export const dynamic = "force-dynamic";

const messages: Record<string, string> = {
  cancelled: "Checkout was cancelled - your card was not charged.",
  checkout: "We could not start checkout. Please try again.",
  nothing: "You already own everything in your cart.",
  captcha: "Please complete the security check and try again.",
  rate: "Too many checkout attempts. Please wait a few minutes and try again.",
  blocked: "Checkout is paused for your account because of repeated payment failures. Please try again in an hour or contact support."
};

export default async function CartPage({ searchParams }: { searchParams: { checkout?: string; error?: string } }) {
  const [student, products, bundle] = await Promise.all([
    getCurrentStudent(),
    getProductsBySlugs(getCartSlugs()),
    getBundleProduct()
  ]);

  const hasBundle = products.some((p) => p.type === "bundle");
  const courseItems = products.filter((p) => p.type === "course");
  const totalCents = products.reduce((sum, p) => sum + p.priceCents, 0);
  const recommendBundle =
    !hasBundle &&
    bundle &&
    shouldRecommendBundle({
      cartCourseCount: courseItems.length,
      cartTotalCents: totalCents,
      bundleCourseCount: bundle.bundleItems.length,
      bundlePriceCents: bundle.priceCents
    });
  const message = messages[searchParams.error || searchParams.checkout || ""];

  return (
    <main className="min-h-screen bg-cloud">
      <SiteHeader student={student} />
      <section className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold">Your cart</h1>
        {message ? <p className="mt-4 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm">{message}</p> : null}

        {products.length === 0 ? (
          <p className="mt-6 text-slate-600">
            Your cart is empty. <Link className="font-semibold text-blueglow" href="/courses">Browse courses</Link>
          </p>
        ) : (
          <>
            {recommendBundle && bundle ? (
              <form action={switchToBundleAction} className="mt-6 rounded-lg border border-cyan bg-white p-4">
                <p className="font-semibold">
                  Get all {bundle.bundleItems.length} courses for {formatPrice(bundle.priceCents, bundle.currency)}
                </p>
                <p className="text-sm text-slate-600">
                  That covers everything in your cart and the rest of the library.
                </p>
                <button className="mt-3 rounded-md bg-cyan px-4 py-2 text-sm font-semibold text-navy hover:bg-mint" type="submit">
                  Switch to the bundle
                </button>
              </form>
            ) : null}

            <ul className="mt-6 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
              {products.map((product) => (
                <li key={product.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <span className="font-semibold">{product.title}</span>
                  <span className="flex items-center gap-4">
                    <span>{formatPrice(product.priceCents, product.currency)}</span>
                    <form action={removeFromCartAction}>
                      <input type="hidden" name="productSlug" value={product.slug} />
                      <button className="text-sm text-slate-500 hover:text-ink" type="submit">Remove</button>
                    </form>
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex items-center justify-between text-lg font-bold">
              <span>Total</span>
              <span>{formatPrice(totalCents, products[0].currency)}</span>
            </div>
            <form action={checkoutCartAction} className="mt-6 space-y-3">
              {student ? <TurnstileWidget siteKey={turnstileSiteKey()} /> : null}
              <SubmitButton
                className="w-full rounded-md bg-cyan px-5 py-3 font-semibold text-navy shadow-glow hover:bg-mint disabled:opacity-60"
                pendingText="Taking you to Stripe..."
              >
                {student ? "Checkout securely with Stripe" : "Log in to check out"}
              </SubmitButton>
            </form>
            <p className="mt-2 text-xs text-slate-500">Payment is handled by Stripe. Access unlocks once payment is confirmed.</p>
          </>
        )}
      </section>
    </main>
  );
}
