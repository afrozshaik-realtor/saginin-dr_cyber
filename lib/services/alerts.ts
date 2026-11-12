import { prisma } from "@/lib/prisma";
import { sendAdminAlertEmail } from "@/lib/services/email";

const BURST_WINDOW_MS = 10 * 60_000;
export const FAILED_PAYMENT_ALERT_THRESHOLD = Number(process.env.FAILED_PAYMENT_ALERT_THRESHOLD || 5);
export const STUDENT_FAILURE_BLOCK_THRESHOLD = 3; // failed payments per student per hour before checkout is blocked

/**
 * If failed payments in the last 10 minutes reach the threshold, log an error and email the admin
 * (at most once per window). This is the card-testing tripwire.
 */
export async function alertOnFailureBurst() {
  const since = new Date(Date.now() - BURST_WINDOW_MS);
  const count = await prisma.paymentFailure.count({ where: { createdAt: { gt: since } } });
  if (count < FAILED_PAYMENT_ALERT_THRESHOLD) return false;

  const recentAlert = await prisma.event.findFirst({ where: { event: "payment_failure_alert", createdAt: { gt: since } } });
  if (recentAlert) return false;

  await prisma.event.create({ data: { event: "payment_failure_alert", metadataJson: { count } } });
  const message = `${count} failed payments in the last 10 minutes. This can be card testing: review Stripe Radar and /admin/orders.`;
  console.error(`[ALERT] ${message}`);
  await sendAdminAlertEmail("Dr Cyber: burst of failed payments", message);
  return true;
}

export async function studentIsBlockedForFailures(studentId: string) {
  const failures = await prisma.paymentFailure.count({
    where: { studentId, createdAt: { gt: new Date(Date.now() - 3600_000) } }
  });
  return failures >= STUDENT_FAILURE_BLOCK_THRESHOLD;
}
