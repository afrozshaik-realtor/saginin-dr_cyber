import { prisma } from "@/lib/prisma";
import { logEvent } from "@/lib/services/crm";
import { sendProviderEmail } from "@/lib/services/email";
import { appSettings } from "@/lib/settings";
import { formatPrice } from "@/lib/format";
import { createUnsubscribeToken } from "@/lib/studentAuth";

export type OutboundEmail = { to: string; subject: string; html: string; text: string };

/**
 * The one seam for outbound email. Swap the provider by implementing this interface and returning it from
 * getEmailSender() (selected by EMAIL_PROVIDER). Today it delegates to the existing console/Resend sender.
 */
export interface EmailSender {
  send(email: OutboundEmail): Promise<string>;
}

class ExistingProviderSender implements EmailSender {
  send(email: OutboundEmail) {
    return sendProviderEmail(email);
  }
}

let override: EmailSender | null = null;
/** For tests. */
export function setEmailSender(sender: EmailSender | null) {
  override = sender;
}
export function getEmailSender(): EmailSender {
  return override ?? new ExistingProviderSender();
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

async function deliver(studentId: string, type: string, email: OutboundEmail) {
  let status = "failed";
  try {
    status = await getEmailSender().send(email);
  } catch (error) {
    console.error(`[email] ${type} failed`, error);
  }
  await logEvent(prisma, studentId, "email_sent", { type, status });
  return status;
}

/** Transactional: sent to everyone who signs up. */
export async function sendWelcomeEmail(student: { id: string; name: string; email: string }) {
  const { appUrl, senderName } = appSettings();
  const text = `Hi ${student.name},\n\nWelcome to Dr Cyber! Your account is ready.\n\nBrowse the beginner courses: ${appUrl}/courses\n\n${senderName}`;
  const html = `<p>Hi ${esc(student.name)},</p><p>Welcome to Dr Cyber! Your account is ready.</p><p><a href="${appUrl}/courses">Browse the beginner courses</a></p><p>${esc(senderName)}</p>`;
  return deliver(student.id, "welcome", { to: student.email, subject: "Welcome to Dr Cyber", text, html });
}

/** Transactional: receipt + "your access is ready". Sent after the webhook has granted access. */
export async function sendReceiptEmail(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { student: true, items: { include: { product: { select: { title: true } } } } }
  });
  if (!order || order.status !== "paid") return "skipped";
  const { appUrl, senderName } = appSettings();
  const titles = order.items.map((i) => i.product.title);
  const total = formatPrice(order.amountCents, order.currency);
  const text = `Hi ${order.student.name},\n\nThanks for your purchase - your access is ready.\n\n${titles.map((t) => `- ${t}`).join("\n")}\nTotal: ${total}\n\nStart learning: ${appUrl}/dashboard\n\n${senderName}`;
  const html = `<p>Hi ${esc(order.student.name)},</p><p>Thanks for your purchase - your access is ready.</p><ul>${titles.map((t) => `<li>${esc(t)}</li>`).join("")}</ul><p>Total: ${esc(total)}</p><p><a href="${appUrl}/dashboard">Start learning</a></p><p>${esc(senderName)}</p>`;
  return deliver(order.studentId, "receipt", { to: order.student.email, subject: "Your Dr Cyber courses are ready", text, html });
}

/**
 * Promotional (a commercial message), so it is only sent with recorded consent (CASL) and always carries the
 * sender's identity, postal address and a working unsubscribe link. Sent at most once per student.
 */
export async function send1x1InviteEmail(studentId: string) {
  const crm = await prisma.studentCrm.findUnique({ where: { studentId }, include: { student: true } });
  if (!crm || !crm.emailConsent) return "no_consent";
  const already = await prisma.event.findFirst({ where: { studentId, event: "invite_1x1_sent" } });
  if (already) return "already_sent";

  const { appUrl, senderName } = appSettings();
  const address = process.env.BUSINESS_ADDRESS || "";
  const unsubscribe = `${appUrl}/unsubscribe/${createUnsubscribeToken(studentId)}`;
  const link = `${appUrl}/book-1x1`;
  const text = `Hi ${crm.student.name},\n\nCongratulations on finishing the beginner library! If you'd like help turning this into a cybersecurity career, you can book a 1x1 session with Dr Cyber:\n\n${link}\n\n${senderName}${address ? `\n${address}` : ""}\n\nUnsubscribe: ${unsubscribe}`;
  const html = `<p>Hi ${esc(crm.student.name)},</p><p>Congratulations on finishing the beginner library! If you'd like help turning this into a cybersecurity career, you can <a href="${link}">book a 1x1 session with Dr Cyber</a>.</p><p>${esc(senderName)}${address ? `<br/>${esc(address)}` : ""}</p><p style="font-size:12px;color:#666"><a href="${unsubscribe}">Unsubscribe</a></p>`;
  const status = await deliver(studentId, "invite_1x1", { to: crm.student.email, subject: "Ready for the next step? Book a 1x1 with Dr Cyber", text, html });
  await logEvent(prisma, studentId, "invite_1x1_sent", { status });
  return status;
}
