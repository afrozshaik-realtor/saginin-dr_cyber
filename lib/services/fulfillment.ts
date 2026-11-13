import type { Prisma } from "@prisma/client";
import type Stripe from "stripe";
import { planEntitlements } from "@/lib/entitlementPlan";
import { onPurchase, onRefundOrDispute } from "@/lib/services/crm";

type Tx = Prisma.TransactionClient;

function paymentIntentId(value: string | Stripe.PaymentIntent | null | undefined) {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

/** Course ids a product unlocks: a course product -> its course; a bundle -> every bundle_items course. */
function coursesForProduct(product: { type: string; courseId: string | null; bundleItems: { courseId: string }[] }) {
  if (product.type === "bundle") return product.bundleItems.map((item) => item.courseId);
  return product.courseId ? [product.courseId] : [];
}

/**
 * Turn a PAID Checkout Session into an order + entitlements. This is the ONLY place access is granted.
 * Safe to call twice for the same session (the order's unique stripe_session_id makes it a no-op).
 * Runs inside the webhook's transaction.
 */
export async function fulfillCheckoutSession(tx: Tx, session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") return { result: "not_paid" as const };

  const studentId = session.metadata?.studentId;
  const productIds = (session.metadata?.productIds || "").split(",").filter(Boolean);
  if (!studentId || productIds.length === 0) {
    console.error("[stripe] session missing metadata", session.id);
    return { result: "bad_metadata" as const };
  }

  const existingOrder = await tx.order.findUnique({ where: { stripeSessionId: session.id } });
  if (existingOrder) return { result: "duplicate" as const };

  const student = await tx.student.findUnique({ where: { id: studentId } });
  if (!student) {
    console.error("[stripe] paid session for unknown student - needs manual refund/grant", session.id);
    return { result: "no_student" as const };
  }

  const products = await tx.product.findMany({
    where: { id: { in: productIds } },
    include: { bundleItems: true }
  });
  if (products.length === 0) {
    console.error("[stripe] paid session for unknown products", session.id);
    return { result: "no_products" as const };
  }

  const expectedCents = products.reduce((sum, p) => sum + p.priceCents, 0);
  if (session.amount_total !== null && session.amount_total !== expectedCents) {
    console.warn(`[stripe] amount mismatch on ${session.id}: charged ${session.amount_total}, catalog ${expectedCents}`);
  }

  // A refund/dispute for this payment may have been delivered BEFORE this event (webhooks can arrive out of
  // order). In that case the order is created already refunded/disputed and grants nothing.
  const pi = paymentIntentId(session.payment_intent);
  const flag = pi ? await tx.paymentFlag.findUnique({ where: { paymentIntentId: pi } }) : null;

  const order = await tx.order.create({
    data: {
      studentId,
      stripeSessionId: session.id,
      stripePaymentIntentId: pi,
      amountCents: session.amount_total ?? expectedCents,
      currency: session.currency ?? "usd",
      status: flag ? flag.kind : "paid",
      items: { create: products.map((p) => ({ productId: p.id, unitAmountCents: p.priceCents })) }
    }
  });

  if (flag) return { result: "already_reversed" as const };

  const desired = products.flatMap(coursesForProduct);
  const existing = await tx.entitlement.findMany({ where: { studentId } });
  const plan = planEntitlements(desired, existing);

  if (plan.create.length) {
    await tx.entitlement.createMany({
      data: plan.create.map((courseId) => ({ studentId, courseId, sourceOrderId: order.id, status: "active" }))
    });
  }
  if (plan.reactivate.length) {
    await tx.entitlement.updateMany({
      where: { studentId, courseId: { in: plan.reactivate } },
      data: { status: "active", sourceOrderId: order.id, grantedAt: new Date(), revokedAt: null }
    });
  }
  await onPurchase(tx, studentId, {
    orderId: order.id,
    includesBundle: products.some((p) => p.type === "bundle"),
    amountCents: order.amountCents
  });
  return { result: "fulfilled" as const, orderId: order.id };
}

/**
 * Revoke what a refunded/disputed payment unlocked. Courses that another still-paid order also covers
 * (e.g. bought course A, later the bundle, then refunded A) stay unlocked via that other order.
 */
export async function revokeOrdersForPaymentIntent(tx: Tx, paymentIntent: string, newStatus: "refunded" | "disputed") {
  const orders = await tx.order.findMany({ where: { stripePaymentIntentId: paymentIntent } });
  if (orders.length === 0) {
    // The order doesn't exist yet (or this payment isn't ours). Remember it so a later checkout.session.completed
    // for the same payment is created already reversed. Never downgrade a "disputed" flag to "refunded".
    await tx.paymentFlag.upsert({
      where: { paymentIntentId: paymentIntent },
      create: { paymentIntentId: paymentIntent, kind: newStatus },
      update: newStatus === "disputed" ? { kind: "disputed" } : {}
    });
    return "flagged" as const;
  }

  for (const order of orders) {
    await tx.order.update({ where: { id: order.id }, data: { status: newStatus } });
    await onRefundOrDispute(tx, order.studentId, newStatus, order.id);
    await tx.entitlement.updateMany({
      where: { sourceOrderId: order.id, status: "active" },
      data: { status: "revoked", revokedAt: new Date() }
    });

    // Re-grant anything another paid order still covers.
    const otherOrders = await tx.order.findMany({
      where: { studentId: order.studentId, status: "paid", id: { not: order.id } },
      include: { items: { include: { product: { include: { bundleItems: true } } } } }
    });
    for (const other of otherOrders) {
      const covered = other.items.flatMap((item) => coursesForProduct(item.product));
      if (covered.length) {
        await tx.entitlement.updateMany({
          where: { studentId: order.studentId, courseId: { in: covered }, status: "revoked" },
          data: { status: "active", sourceOrderId: other.id, revokedAt: null }
        });
      }
    }
  }
  return "revoked" as const;
}
