import Stripe from "stripe";

let cachedClient: Stripe | null | undefined;

/**
 * Stripe client. Until go-live this app only talks to Stripe TEST mode: a live key (sk_live_/rk_live_) is
 * refused unless STRIPE_ALLOW_LIVE=true is set explicitly (Phase 5 go-live step).
 */
export function getStripeClient(): Stripe | null {
  if (cachedClient !== undefined) return cachedClient;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    cachedClient = null;
  } else if (/^(sk|rk)_live_/.test(secretKey) && process.env.STRIPE_ALLOW_LIVE !== "true") {
    console.error("[stripe] live key refused: set STRIPE_ALLOW_LIVE=true only when you are ready to go live.");
    cachedClient = null;
  } else {
    cachedClient = new Stripe(secretKey);
  }
  return cachedClient;
}

export type CheckoutLine = { productId: string; stripePriceId: string };

/**
 * One hosted Checkout Session for the whole cart (so Stripe's fixed fee is paid once).
 * Line items reference server-side Stripe Price ids - nothing price-related comes from the client.
 */
export async function createCartCheckoutSession({
  studentId,
  studentEmail,
  lines,
  successUrl,
  cancelUrl
}: {
  studentId: string;
  studentEmail: string;
  lines: CheckoutLine[];
  successUrl: string;
  cancelUrl: string;
}) {
  const stripe = getStripeClient();
  if (!stripe) return null;

  const productIds = lines.map((line) => line.productId).join(",");
  return stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: studentEmail,
    client_reference_id: studentId,
    line_items: lines.map((line) => ({ price: line.stripePriceId, quantity: 1 })),
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { studentId, productIds },
    payment_intent_data: { metadata: { studentId, productIds } }
  });
}
