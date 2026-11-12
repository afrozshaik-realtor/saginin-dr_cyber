/**
 * Integration test for the Stripe webhook against a REAL database (no network, no Stripe account needed:
 * events are signed locally with a dummy secret).
 *
 *   DATABASE_URL=mysql://... npm test
 *
 * Skipped when DATABASE_URL is not set. Creates and removes its own rows (prefix "it-").
 */
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { NextRequest } from "next/server";
import Stripe from "stripe";

const SECRET = "whsec_integration_test";
process.env.STRIPE_SECRET_KEY = "sk_test_integration_dummy";
process.env.STRIPE_WEBHOOK_SECRET = SECRET;

const run = Boolean(process.env.DATABASE_URL);
const tag = `it-${Date.now()}`;

describe("stripe webhook", { skip: !run }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let POST: typeof import("../app/api/stripe/webhook/route").POST;
  const courseIds: string[] = [];
  const productByCourse: Record<string, string> = {};
  let bundleId = "";
  let studentId = "";
  let student2Id = "";
  let seq = 0;

  async function send(type: string, object: unknown, opts: { badSignature?: boolean; id?: string } = {}) {
    const payload = JSON.stringify({ id: opts.id ?? `evt_${tag}_${++seq}`, object: "event", type, data: { object } });
    const header = Stripe.webhooks.generateTestHeaderString({ payload, secret: opts.badSignature ? "whsec_wrong" : SECRET });
    const req = new NextRequest("http://localhost/api/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": header },
      body: payload
    });
    const res = await POST(req);
    return { status: res.status, body: await res.json(), eventId: JSON.parse(payload).id as string, payload, header };
  }

  const session = (id: string, student: string, productIds: string[], amount: number, pi: string, paid = true) => ({
    id,
    object: "checkout.session",
    payment_status: paid ? "paid" : "unpaid",
    amount_total: amount,
    currency: "usd",
    payment_intent: pi,
    metadata: { studentId: student, productIds: productIds.join(",") }
  });

  const activeFor = (sid: string) => prisma.entitlement.findMany({ where: { studentId: sid, status: "active" } });

  before(async () => {
    ({ prisma } = await import("../lib/prisma"));
    ({ POST } = await import("../app/api/stripe/webhook/route"));
    for (let i = 0; i < 12; i++) {
      const c = await prisma.course.create({
        data: {
          slug: `${tag}-c${i}`, title: `T${i}`, category: "x", level: "Beginner", summary: "s", description: "d",
          image: "/x.png", priceCents: 100, currency: "usd", modulesJson: []
        }
      });
      courseIds.push(c.id);
      const p = await prisma.product.create({
        data: { type: "course", slug: `${tag}-p${i}`, title: `T${i}`, courseId: c.id, priceCents: 100 }
      });
      productByCourse[c.id] = p.id;
    }
    const b = await prisma.product.create({ data: { type: "bundle", slug: `${tag}-bundle`, title: "B", priceCents: 900 } });
    bundleId = b.id;
    await prisma.bundleItem.createMany({ data: courseIds.map((courseId) => ({ productId: b.id, courseId })) });
    studentId = (await prisma.student.create({ data: { name: "A", email: `${tag}-a@test.dev`, passwordHash: "x" } })).id;
    student2Id = (await prisma.student.create({ data: { name: "B", email: `${tag}-b@test.dev`, passwordHash: "x" } })).id;
  });

  after(async () => {
    if (!run) return;
    await prisma.stripeEvent.deleteMany({ where: { eventId: { startsWith: `evt_${tag}` } } });
    await prisma.student.deleteMany({ where: { email: { startsWith: tag } } });
    await prisma.product.deleteMany({ where: { slug: { startsWith: tag } } });
    await prisma.course.deleteMany({ where: { slug: { startsWith: tag } } });
    await prisma.$disconnect();
  });

  test("rejects a bad signature and writes nothing", async () => {
    const res = await send("checkout.session.completed", session("cs_bad", studentId, [productByCourse[courseIds[0]]], 100, "pi_bad"), { badSignature: true });
    assert.equal(res.status, 400);
    assert.equal(await prisma.order.count({ where: { stripeSessionId: "cs_bad" } }), 0);
  });

  test("unpaid session grants nothing", async () => {
    await send("checkout.session.completed", session(`cs_${tag}_unpaid`, studentId, [productByCourse[courseIds[0]]], 100, "pi_unpaid", false));
    assert.equal((await activeFor(studentId)).length, 0);
  });

  test("single course purchase unlocks exactly that course", async () => {
    const res = await send("checkout.session.completed", session(`cs_${tag}_1`, studentId, [productByCourse[courseIds[0]]], 100, `pi_${tag}_1`));
    assert.equal(res.status, 200);
    const ents = await activeFor(studentId);
    assert.deepEqual(ents.map((e) => e.courseId), [courseIds[0]]);
  });

  test("replaying the same event id does not duplicate anything", async () => {
    const s = session(`cs_${tag}_replay`, student2Id, [productByCourse[courseIds[1]]], 100, `pi_${tag}_replay`);
    const first = await send("checkout.session.completed", s);
    const again = await send("checkout.session.completed", s, { id: first.eventId });
    assert.equal(again.status, 200);
    assert.equal(again.body.duplicate, true);
    assert.equal(await prisma.order.count({ where: { stripeSessionId: s.id } }), 1);
    assert.equal(await prisma.entitlement.count({ where: { studentId: student2Id } }), 1);
    assert.equal(await prisma.stripeEvent.count({ where: { eventId: first.eventId } }), 1);
  });

  test("a different event for the same session (async success) does not duplicate", async () => {
    const s = session(`cs_${tag}_1`, studentId, [productByCourse[courseIds[0]]], 100, `pi_${tag}_1`);
    await send("checkout.session.async_payment_succeeded", s);
    assert.equal(await prisma.order.count({ where: { stripeSessionId: s.id } }), 1);
    assert.equal(await prisma.entitlement.count({ where: { studentId } }), 1);
  });

  test("bundle after owning one course unlocks all 12 without duplicating the owned one", async () => {
    await send("checkout.session.completed", session(`cs_${tag}_bundle`, studentId, [bundleId], 900, `pi_${tag}_bundle`));
    const ents = await activeFor(studentId);
    assert.equal(ents.length, 12);
    assert.equal(await prisma.entitlement.count({ where: { studentId } }), 12);
    const owned = ents.find((e) => e.courseId === courseIds[0]);
    const firstOrder = await prisma.order.findUnique({ where: { stripeSessionId: `cs_${tag}_1` } });
    assert.equal(owned?.sourceOrderId, firstOrder?.id);
  });

  test("partial refund does not revoke", async () => {
    await send("charge.refunded", { id: "ch_1", object: "charge", refunded: false, payment_intent: `pi_${tag}_bundle` });
    assert.equal((await activeFor(studentId)).length, 12);
  });

  test("full refund of the bundle revokes bundle-sourced access only", async () => {
    await send("charge.refunded", { id: "ch_2", object: "charge", refunded: true, payment_intent: `pi_${tag}_bundle` });
    const ents = await activeFor(studentId);
    assert.deepEqual(ents.map((e) => e.courseId), [courseIds[0]]);
    const order = await prisma.order.findUnique({ where: { stripeSessionId: `cs_${tag}_bundle` } });
    assert.equal(order?.status, "refunded");
  });

  test("rebuying after a refund reactivates instead of duplicating", async () => {
    await send("checkout.session.completed", session(`cs_${tag}_bundle2`, studentId, [bundleId], 900, `pi_${tag}_bundle2`));
    assert.equal((await activeFor(studentId)).length, 12);
    assert.equal(await prisma.entitlement.count({ where: { studentId } }), 12);
  });

  test("refunding a course also covered by a still-paid bundle keeps it unlocked", async () => {
    await send("charge.refunded", { id: "ch_3", object: "charge", refunded: true, payment_intent: `pi_${tag}_1` });
    assert.equal((await activeFor(studentId)).length, 12);
  });

  test("dispute revokes access and marks the order disputed", async () => {
    await send("charge.dispute.created", { id: "dp_1", object: "dispute", payment_intent: `pi_${tag}_replay` });
    assert.equal((await activeFor(student2Id)).length, 0);
    const order = await prisma.order.findUnique({ where: { stripeSessionId: `cs_${tag}_replay` } });
    assert.equal(order?.status, "disputed");
  });
});
