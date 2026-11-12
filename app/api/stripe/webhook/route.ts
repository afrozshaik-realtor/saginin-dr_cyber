import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { alertOnFailureBurst } from "@/lib/services/alerts";
import { fulfillCheckoutSession, revokeOrdersForPaymentIntent } from "@/lib/services/fulfillment";
import { getStripeClient } from "@/lib/services/stripe";
import { sendReceiptEmail } from "@/lib/services/transactional";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isDuplicateEventError(error: unknown) {
  const e = error as { code?: string; meta?: { target?: unknown } };
  return e?.code === "P2002" && String(e.meta?.target ?? "").includes("stripe_events");
}

function intentId(value: string | { id: string } | null | undefined) {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

export async function POST(request: NextRequest) {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 400 });
  }

  // Signature verification needs the exact raw body - do not parse JSON before this.
  const signature = request.headers.get("stripe-signature");
  const payload = await request.text();
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Cheap early exit for already-processed events (the unique key below is the real guard).
  if (await prisma.stripeEvent.findUnique({ where: { eventId: event.id } })) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  let sawFailure = false;
  let fulfilledOrderId: string | null = null;
  try {
    // Recording the event and doing the work commit together: if the work fails, the event row rolls
    // back too and Stripe's retry processes it again. If two deliveries race, the loser hits the
    // primary key and is treated as a duplicate.
    await prisma.$transaction(async (tx) => {
      await tx.stripeEvent.create({ data: { eventId: event.id, type: event.type } });

      switch (event.type) {
        case "checkout.session.completed":
        case "checkout.session.async_payment_succeeded":
        {
          const outcome = await fulfillCheckoutSession(tx, event.data.object as Stripe.Checkout.Session);
          if (outcome.result === "fulfilled") fulfilledOrderId = outcome.orderId;
          break;
        }
        case "charge.refunded": {
          const charge = event.data.object as Stripe.Charge;
          // Only a FULL refund revokes access; partial refunds are left for manual review.
          const pi = intentId(charge.payment_intent);
          if (charge.refunded && pi) await revokeOrdersForPaymentIntent(tx, pi, "refunded");
          break;
        }
        case "charge.dispute.created": {
          const dispute = event.data.object as Stripe.Dispute;
          const pi = intentId(dispute.payment_intent);
          if (pi) await revokeOrdersForPaymentIntent(tx, pi, "disputed");
          else console.error("[stripe] dispute without payment_intent", dispute.id);
          break;
        }
        case "payment_intent.payment_failed": {
          const intent = event.data.object as Stripe.PaymentIntent;
          const err = intent.last_payment_error;
          await tx.paymentFailure.create({
            data: {
              eventId: event.id,
              studentId: intent.metadata?.studentId || null,
              paymentIntentId: intent.id,
              code: err?.code ?? null,
              declineCode: err?.decline_code ?? null
            }
          });
          sawFailure = true;
          break;
        }
        default:
          break; // e.g. checkout.session.expired: nothing was granted, so nothing to undo
      }
    });
    // After the transaction commits: tripwire for bursts of failed payments (card testing).
    // Receipt / "access ready" email goes out only after the transaction committed (never inside it).
    if (fulfilledOrderId) await sendReceiptEmail(fulfilledOrderId).catch((e) => console.error("[stripe] receipt email failed", e));
    if (sawFailure) await alertOnFailureBurst().catch((e) => console.error("[stripe] alert failed", e));
  } catch (error) {
    if (isDuplicateEventError(error)) return NextResponse.json({ received: true, duplicate: true });
    console.error("[stripe] webhook processing failed", event.id, event.type, error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
