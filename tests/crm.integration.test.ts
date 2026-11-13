/**
 * Phase 4 gate: moving through the funnel in test data updates stages correctly; consent rules; unsubscribe; Calendly.
 *   DATABASE_URL=mysql://... npm test
 */
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { after, before, describe, test } from "node:test";
import { NextRequest } from "next/server";
import { ctaLevel } from "../lib/config/crm";

process.env.STUDENT_SESSION_SECRET = "test-student-secret-0123456789";
process.env.APP_URL = "https://app.example.test";
process.env.BUSINESS_ADDRESS = "123 Test St, Toronto, ON";

const run = Boolean(process.env.DATABASE_URL);
const tag = `crm${Date.now()}`;

test("CTA level: none -> soft after first course -> strong after bundle or all courses", () => {
  assert.equal(ctaLevel({ stage: "signed_up", completedCourses: 0 }), "none");
  assert.equal(ctaLevel({ stage: "bought_course", completedCourses: 0 }), "none");
  assert.equal(ctaLevel({ stage: "bought_course", completedCourses: 1 }), "soft");
  assert.equal(ctaLevel({ stage: "bought_bundle", completedCourses: 0 }), "strong");
  assert.equal(ctaLevel({ stage: "completed_all", completedCourses: 12 }), "strong");
});

describe("crm funnel", { skip: !run }, () => {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  let prisma: any, crm: any, tx: any, auth: any;
  const sent: any[] = [];
  const courses: string[] = [];
  const lessonOf: Record<string, string> = {};
  const ids: string[] = [];

  const mk = async (suffix: string) => {
    const s = await prisma.student.create({ data: { name: `N ${suffix}`, email: `${tag}-${suffix}@t.dev`, passwordHash: "x" } });
    ids.push(s.id);
    return s;
  };
  const stageOf = async (id: string) => (await prisma.studentCrm.findUnique({ where: { studentId: id } })).stage;
  const count = (id: string, event: string) => prisma.event.count({ where: { studentId: id, event } });

  before(async () => {
    ({ prisma } = await import("../lib/prisma"));
    crm = await import("../lib/services/crm");
    tx = await import("../lib/services/transactional");
    auth = await import("../lib/studentAuth");
    tx.setEmailSender({ send: async (e: any) => (sent.push(e), "sent") });
    for (let i = 0; i < 2; i++) {
      const c = await prisma.course.create({
        data: { slug: `${tag}-c${i}`, title: `Course ${i}`, category: "x", level: "Beginner", summary: "s", description: "d", image: "/x.png", priceCents: 100, currency: "usd", modulesJson: [] }
      });
      courses.push(c.id);
      lessonOf[c.id] = (await prisma.courseLesson.create({ data: { courseId: c.id, title: "L", r2Key: `videos/${c.id}/a.mp4`, durationSeconds: 60 } })).id;
    }
  });

  after(async () => {
    tx.setEmailSender(null);
    await prisma.event.deleteMany({ where: { studentId: { in: ids } } });
    await prisma.lead.deleteMany({ where: { email: { startsWith: tag } } });
    await prisma.student.deleteMany({ where: { email: { startsWith: tag } } });
    await prisma.course.deleteMany({ where: { slug: { startsWith: tag } } });
    await prisma.$disconnect();
  });

  test("signup creates the CRM record with proof of consent; quiz lead is linked by email", async () => {
    const a = await mk("a");
    await prisma.lead.create({
      data: { firstName: "A", lastName: "B", email: a.email, currentProfession: "x", city: "x", country: "x", startTimeline: "x", pathwayResult: "soc", pathwayScoreJson: {} }
    });
    await crm.onSignedUp(prisma, a, { consent: true, consentText: "I agree text", source: "organic" });
    const row = await prisma.studentCrm.findUnique({ where: { studentId: a.id } });
    assert.equal(row.stage, "signed_up");
    assert.equal(row.source, "quiz");
    assert.ok(row.leadId);
    assert.equal(row.emailConsent, true);
    assert.equal(row.consentText, "I agree text");
    assert.ok(row.consentAt);
    assert.equal(await count(a.id, "signed_up"), 1);

    const b = await mk("b");
    await crm.onSignedUp(prisma, b, { consent: false, consentText: "t", source: "organic" });
    const rowB = await prisma.studentCrm.findUnique({ where: { studentId: b.id } });
    assert.equal(rowB.emailConsent, false);
    assert.equal(rowB.consentAt, null);
  });

  test("full journey: signed up -> bought course -> bought bundle -> completed all -> booked -> client", async () => {
    const s = await mk("j");
    await crm.onSignedUp(prisma, s, { consent: false, consentText: "t", source: "organic" });
    assert.equal(await stageOf(s.id), "signed_up");

    await crm.onPurchase(prisma, s.id, { orderId: "o1", includesBundle: false, amountCents: 100 });
    assert.equal(await stageOf(s.id), "bought_course");

    await crm.onPurchase(prisma, s.id, { orderId: "o2", includesBundle: true, amountCents: 900 });
    assert.equal(await stageOf(s.id), "bought_bundle");

    // buying a single course later must not move them backwards
    await crm.onPurchase(prisma, s.id, { orderId: "o3", includesBundle: false, amountCents: 100 });
    assert.equal(await stageOf(s.id), "bought_bundle");

    // finish course 0
    await prisma.watchProgress.create({ data: { studentId: s.id, courseId: courses[0], lessonId: lessonOf[courses[0]], completedAt: new Date() } });
    let r = await crm.onLessonCompleted(prisma, s.id, { id: lessonOf[courses[0]], courseId: courses[0] }, { allCourseIds: courses });
    assert.deepEqual(r, { courseDone: true, completedAll: false });
    assert.equal(await stageOf(s.id), "bought_bundle");
    assert.equal((await prisma.studentCrm.findUnique({ where: { studentId: s.id } })).completedCourses, 1);
    assert.equal(await count(s.id, "course_completed"), 1);

    // finish course 1 -> completed all
    await prisma.watchProgress.create({ data: { studentId: s.id, courseId: courses[1], lessonId: lessonOf[courses[1]], completedAt: new Date() } });
    r = await crm.onLessonCompleted(prisma, s.id, { id: lessonOf[courses[1]], courseId: courses[1] }, { allCourseIds: courses });
    assert.deepEqual(r, { courseDone: true, completedAll: true });
    assert.equal(await stageOf(s.id), "completed_all");
    assert.equal(await count(s.id, "completed_all"), 1);
    assert.equal(await count(s.id, "lesson_completed"), 2);

    // asking again does not re-trigger "completed all"
    r = await crm.onLessonCompleted(prisma, s.id, { id: lessonOf[courses[1]], courseId: courses[1] }, { allCourseIds: courses });
    assert.equal(r.completedAll, false);
    assert.equal(await count(s.id, "completed_all"), 1);

    // clicked the 1x1 button
    await crm.onBookingClicked(prisma, s.id);
    assert.equal(await count(s.id, "clicked_book_1x1"), 1);
    assert.ok((await prisma.studentCrm.findUnique({ where: { studentId: s.id } })).tags.includes("clicked-1x1"));
    assert.equal(await stageOf(s.id), "completed_all");

    // booking confirmed (matched by email, case-insensitive)
    assert.equal(await crm.onBooked(prisma, s.email.toUpperCase()), true);
    assert.equal(await stageOf(s.id), "booked_1x1");
    assert.equal(await crm.onBooked(prisma, "nobody@nowhere.dev"), false);

    // admin marks them a client; later auto events never pull them back
    assert.equal(await crm.setStageManually(prisma, s.id, "client"), true);
    await crm.onBooked(prisma, s.email);
    await crm.onPurchase(prisma, s.id, { orderId: "o4", includesBundle: true, amountCents: 900 });
    assert.equal(await stageOf(s.id), "client");

    // manual move backwards is allowed; junk stages are rejected
    assert.equal(await crm.setStageManually(prisma, s.id, "bought_course"), true);
    assert.equal(await stageOf(s.id), "bought_course");
    assert.equal(await crm.setStageManually(prisma, s.id, "nonsense"), false);
  });

  test("a refund is logged but does not roll the stage back", async () => {
    const s = await mk("r");
    await crm.onPurchase(prisma, s.id, { orderId: "o9", includesBundle: false, amountCents: 100 });
    await crm.onRefundOrDispute(prisma, s.id, "refunded", "o9");
    assert.equal(await stageOf(s.id), "bought_course");
    assert.equal(await count(s.id, "refunded"), 1);
  });

  test("1x1 invitation: needs recorded consent, carries unsubscribe + address, sends once", async () => {
    const s = await mk("m");
    await crm.onSignedUp(prisma, s, { consent: false, consentText: "t", source: "organic" });
    sent.length = 0;
    assert.equal(await tx.send1x1InviteEmail(s.id), "no_consent");
    assert.equal(sent.length, 0);

    await crm.setEmailConsent(prisma, s.id, true, "dashboard", "text");
    assert.equal(await tx.send1x1InviteEmail(s.id), "sent");
    assert.equal(sent.length, 1);
    assert.match(sent[0].text, /\/unsubscribe\//);
    assert.match(sent[0].text, /123 Test St/);
    assert.equal(await tx.send1x1InviteEmail(s.id), "already_sent");
    assert.equal(sent.length, 1);
  });

  test("unsubscribe link turns consent off; tampered or wrong-purpose tokens are rejected", async () => {
    const s = await mk("u");
    await crm.onSignedUp(prisma, s, { consent: true, consentText: "t", source: "organic" });
    const token = auth.createUnsubscribeToken(s.id);
    assert.deepEqual(auth.verifyUnsubscribeToken(token), { studentId: s.id });
    assert.equal(auth.verifyUnsubscribeToken(token.slice(0, -2) + "xx"), null);
    assert.equal(auth.verifyUnsubscribeToken(auth.createAccessToken(s.id, "slug")), null);

    const route = await import("../app/unsubscribe/[token]/route");
    assert.equal((await route.GET(null as any, { params: { token: "garbage" } })).status, 400);
    assert.equal((await route.GET(null as any, { params: { token } })).status, 200);
    assert.equal((await prisma.studentCrm.findUnique({ where: { studentId: s.id } })).emailConsent, false);
    assert.equal(await count(s.id, "unsubscribed"), 1);
  });

  test("receipt email lists the items and total, only for paid orders", async () => {
    const s = await mk("e");
    const product = await prisma.product.create({ data: { type: "course", slug: `${tag}-p`, title: "Receipt Course", courseId: courses[0], priceCents: 100 } });
    const order = await prisma.order.create({
      data: { studentId: s.id, stripeSessionId: `cs_${tag}_r`, amountCents: 100, currency: "usd", status: "paid", items: { create: [{ productId: product.id, unitAmountCents: 100 }] } }
    });
    sent.length = 0;
    assert.equal(await tx.sendReceiptEmail(order.id), "sent");
    assert.match(sent[0].text, /Receipt Course/);
    assert.match(sent[0].text, /\$1/);
    await prisma.order.update({ where: { id: order.id }, data: { status: "refunded" } });
    assert.equal(await tx.sendReceiptEmail(order.id), "skipped");
    await prisma.order.delete({ where: { id: order.id } });
    await prisma.product.deleteMany({ where: { slug: `${tag}-p` } });
  });

  test("Calendly webhook: bad signature rejected; verified booking moves the student to Booked 1x1", async () => {
    const s = await mk("c");
    await crm.onSignedUp(prisma, s, { consent: false, consentText: "t", source: "organic" });
    process.env.CALENDLY_WEBHOOK_SIGNING_KEY = "cal-key";
    const route = await import("../app/api/webhooks/calendly/route");
    const body = JSON.stringify({ payload: { email: s.email } });
    const req = (sig: string) =>
      new NextRequest("http://localhost/api/webhooks/calendly", { method: "POST", headers: { "calendly-webhook-signature": sig }, body });

    assert.equal((await route.POST(req("t=1,v1=deadbeef"))).status, 401);
    assert.equal(await stageOf(s.id), "signed_up");

    const t = Math.floor(Date.now() / 1000);
    const v1 = createHmac("sha256", "cal-key").update(`${t}.${body}`).digest("hex");
    assert.equal((await route.POST(req(`t=${t},v1=${v1}`))).status, 200);
    assert.equal(await stageOf(s.id), "booked_1x1");
    delete process.env.CALENDLY_WEBHOOK_SIGNING_KEY;
  });
});
