import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { enrollStudent } from "@/lib/store";
import { getStripeClient } from "@/lib/services/stripe";

export async function POST(request: NextRequest) {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 400 });
  }

  const signature = request.headers.get("stripe-signature");
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature || "", webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const studentId = session.metadata?.studentId;
    const courseId = session.metadata?.courseId;
    if (studentId && courseId && session.payment_status === "paid") {
      await enrollStudent(studentId, courseId, {
        paymentStatus: "paid",
        amountPaidCents: session.amount_total ?? undefined,
        currency: session.currency ?? undefined,
        stripeSessionId: session.id
      });
    }
  }

  return NextResponse.json({ received: true });
}
