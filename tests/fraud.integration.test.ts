/**
 * Phase 3 tests: out-of-order webhooks, failed-payment tripwire, rate limiting, Turnstile.
 *   DATABASE_URL=mysql://... npm test
 */
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { NextRequest } from "next/server";
import Stripe from "stripe";

const SECRET = "whsec_fraud_test";
process.env.STRIPE_SECRET_KEY = "sk_test_fraud_dummy";
process.env.STRIPE_WEBHOOK_SECRET = SECRET;

const run = Boolean(process.env.DATABASE_URL);
const tag = `fr${Date.now()}`;

describe("fraud controls", { skip: !run }, () => {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  let prisma: any, POST: any, allowRequest: any, studentIsBlockedForFailures: any;
  let studentId = "", courseId = "", productId = "";
  let seq = 0;

  async function send(type: string, object: unknown, id?: string) {
    const payload = JSON.stringify({ id: id ?? `evt_${tag}_${++seq}`, object: "event", type, data: { object } });
    const header = Stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET });
    const res = await POST(new NextRequest("http://localhost/api/stripe/webhook", { method: "POST", headers: { "stripe-signature": header }, body: payload }));
    return { status: res.status, id: JSON.parse(payload).id as string, payload, header };
  }
  const session = (id: string, pi: string) => ({
    id, object: "checkout.session", payment_status: "paid", amount_total: 100, currency: "usd", payment_intent: pi,
    metadata: { studentId, productIds: productId }
  });
  const failed = (pi: string, sid: string | null) => ({
    id: pi, object: "payment_intent", metadata: sid ? { studentId: sid } : {},
    last_payment_error: { code: "card_declined", decline_code: "generic_decline" }
  });

  before(async () => {
    ({ prisma } = await import("../lib/prisma"));
    ({ POST } = await import("../app/api/stripe/webhook/route"));
    ({ allowRequest } = await import("../lib/services/rateLimitDb"));
    ({ studentIsBlockedForFailures } = await import("../lib/services/alerts"));
    await prisma.paymentFailure.deleteMany({});
    await prisma.event.deleteMany({ where: { event: "payment_failure_alert" } });
    courseId = (await prisma.course.create({
      data: { slug: `${tag}-c`, title: "T", category: "x", level: "Beginner", summary: "s", description: "d", image: "/x.png", priceCents: 100, currency: "usd", modulesJson: [] }
    })).id;
    productId = (await prisma.product.create({ data: { type: "course", slug: `${tag}-p`, title: "T", courseId, priceCents: 100 } })).id;
    studentId = (await prisma.student.create({ data: { name: "F", email: `${tag}@t.dev`, passwordHash: "x" } })).id;
  });

  after(async () => {
    if (!run) return;
    await prisma.paymentFailure.deleteMany({});
    await prisma.event.deleteMany({ where: { event: "payment_failure_alert" } });
    await prisma.paymentFlag.deleteMany({ where: { paymentIntentId: { startsWith: `pi_${tag}` } } });
    await prisma.rateLimitHit.deleteMany({ where: { key: { startsWith: `t:${tag}` } } });
    await prisma.stripeEvent.deleteMany({ where: { eventId: { startsWith: `evt_${tag}` } } });
    await prisma.student.deleteMany({ where: { email: { startsWith: tag } } });
    await prisma.product.deleteMany({ where: { slug: { startsWith: tag } } });
    await prisma.course.deleteMany({ where: { slug: { startsWith: tag } } });
    await prisma.$disconnect();
  });

  test("a refund that arrives BEFORE its checkout event leaves the order refunded and grants nothing", async () => {
    const pi = `pi_${tag}_early`;
    await send("charge.refunded", { id: "ch_e", object: "charge", refunded: true, payment_intent: pi });
    await send("checkout.session.completed", session(`cs_${tag}_early`, pi));
    const order = await prisma.order.findUnique({ where: { stripeSessionId: `cs_${tag}_early` } });
    assert.equal(order.status, "refunded");
    assert.equal(await prisma.entitlement.count({ where: { studentId } }), 0);
  });

  test("a dispute arriving early is not downgraded by a later refund event", async () => {
    const pi = `pi_${tag}_dis`;
    await send("charge.dispute.created", { id: "dp_e", object: "dispute", payment_intent: pi });
    await send("charge.refunded", { id: "ch_d", object: "charge", refunded: true, payment_intent: pi });
    await send("checkout.session.completed", session(`cs_${tag}_dis`, pi));
    const order = await prisma.order.findUnique({ where: { stripeSessionId: `cs_${tag}_dis` } });
    assert.equal(order.status, "disputed");
    assert.equal(await prisma.entitlement.count({ where: { studentId } }), 0);
  });

  test("repeated failures: recorded once per event, student blocked after 3, one alert per burst", async () => {
    const first = await send("payment_intent.payment_failed", failed(`pi_${tag}_f0`, studentId));
    await send("payment_intent.payment_failed", failed(`pi_${tag}_f0`, studentId), first.id); // replay
    assert.equal(await prisma.paymentFailure.count(), 1);
    assert.equal(await studentIsBlockedForFailures(studentId), false);

    for (let i = 1; i < 7; i++) await send("payment_intent.payment_failed", failed(`pi_${tag}_f${i}`, studentId));
    assert.equal(await prisma.paymentFailure.count(), 7);
    assert.equal(await studentIsBlockedForFailures(studentId), true);
    assert.equal(await prisma.event.count({ where: { event: "payment_failure_alert" } }), 1);
  });

  test("failures for other students don't block this one", async () => {
    assert.equal(await studentIsBlockedForFailures("someone-else-id"), false);
  });

  test("rate limiter allows up to the limit, then blocks; keys are independent", async () => {
    const key = `t:${tag}:a`;
    const results = [];
    for (let i = 0; i < 5; i++) results.push(await allowRequest(key, 3, 60));
    assert.deepEqual(results, [true, true, true, false, false]);
    assert.equal(await allowRequest(`t:${tag}:b`, 3, 60), true);
  });
});

describe("turnstile", () => {
  const realFetch = globalThis.fetch;
  const env = process.env as Record<string, string | undefined>;
  const saved = { secret: env.TURNSTILE_SECRET_KEY, node: env.NODE_ENV };
  after(() => {
    globalThis.fetch = realFetch;
    env.TURNSTILE_SECRET_KEY = saved.secret;
    env.NODE_ENV = saved.node;
  });

  test("fails closed in production without a secret; skipped in dev", async () => {
    const { verifyTurnstile } = await import("../lib/services/turnstile");
    delete env.TURNSTILE_SECRET_KEY;
    env.NODE_ENV = "production";
    assert.equal(await verifyTurnstile("tok"), false);
    env.NODE_ENV = "development";
    assert.equal(await verifyTurnstile(""), true);
  });

  test("with a secret: requires a token and Cloudflare's success answer", async () => {
    const { verifyTurnstile } = await import("../lib/services/turnstile");
    env.TURNSTILE_SECRET_KEY = "secret";
    env.NODE_ENV = "production";
    assert.equal(await verifyTurnstile(""), false);
    globalThis.fetch = (async () => new Response(JSON.stringify({ success: true }))) as typeof fetch;
    assert.equal(await verifyTurnstile("tok"), true);
    globalThis.fetch = (async () => new Response(JSON.stringify({ success: false }))) as typeof fetch;
    assert.equal(await verifyTurnstile("tok"), false);
    globalThis.fetch = (async () => { throw new Error("network"); }) as typeof fetch;
    assert.equal(await verifyTurnstile("tok"), false);
  });
});
