import { emailSequence } from "@/lib/config/emailSequence";
import { getPathway } from "@/lib/config/pathways";
import { appSettings } from "@/lib/settings";
import { logEmail, trackEvent } from "@/lib/store";
import type { FunnelLead } from "@/types/funnel";
import type { Course, Student } from "@/types/lms";

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

async function sendProviderEmail(payload: EmailPayload) {
  const provider = process.env.EMAIL_PROVIDER || "console";
  if (provider === "resend" && process.env.RESEND_API_KEY) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: payload.to,
        subject: payload.subject,
        html: payload.html
      })
    });
    return response.ok ? "sent" : `failed:${response.status}`;
  }
  console.info("[email:console]", payload);
  return "logged";
}

export function renderResultEmail(lead: FunnelLead) {
  const settings = appSettings();
  const pathway = getPathway(lead.pathwayResult);
  const roadmap = pathway.roadmap.map((step, index) => `${index + 1}. ${step}`).join("\n");
  const text = `Hi ${lead.firstName},

Your recommended cybersecurity pathway is:

${pathway.name}

Based on your answers, this pathway may be a strong fit because of your background, skills, and career goals.

Your suggested next steps are:

${roadmap}

You can also book a free Cyber Career Roadmap Call here:

${settings.bookingLink}

This call will help you understand which skills, certifications, and projects you should focus on first.

Regards,
Cyber Career Pathway Team`;

  return {
    subject: "Your Cybersecurity Career Pathway Is Ready",
    text,
    html: text.replaceAll("\n", "<br />")
  };
}

export async function sendQuizResultEmail(lead: FunnelLead) {
  const email = renderResultEmail(lead);
  const status = await sendProviderEmail({
    to: lead.email,
    subject: email.subject,
    text: email.text,
    html: email.html
  });
  await logEmail(lead.id, "quiz-result", email.subject, status);
  await trackEvent("Email Sent", { leadId: lead.id, emailType: "quiz-result", status });
}

export async function notifyAdmin(lead: FunnelLead) {
  const settings = appSettings();
  if (!settings.adminNotificationEmail) return;
  const subject = `New quiz completion: ${lead.firstName} ${lead.lastName}`;
  const text = `${lead.firstName} ${lead.lastName} completed the quiz and received ${lead.pathwayResult}.\nEmail: ${lead.email}\nPhone: ${lead.phone || "N/A"}`;
  const status = await sendProviderEmail({
    to: settings.adminNotificationEmail,
    subject,
    text,
    html: text.replaceAll("\n", "<br />")
  });
  await logEmail(lead.id, "admin-notification", subject, status);
}

export async function enqueueNurtureSequence(lead: FunnelLead) {
  for (const item of emailSequence) {
    await logEmail(
      lead.id,
      item.key,
      item.subject,
      item.delayDays === 0 ? "queued-immediate" : `scheduled-day-${item.delayDays}`
    );
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderBrandedEmail({ preheader, bodyHtml }: { preheader: string; bodyHtml: string }) {
  const settings = appSettings();
  const logo = settings.logoUrl
    ? `<img src="${escapeHtml(settings.logoUrl)}" alt="${escapeHtml(settings.cohortName)}" height="40" style="height:40px;display:block;" />`
    : `<div style="font-size:20px;font-weight:bold;color:#ffffff;">${escapeHtml(settings.cohortName)}</div>`;

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f5f7fb;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;">
    <span style="display:none;max-height:0;overflow:hidden;">${escapeHtml(preheader)}</span>
    <table role="presentation" width="100%" style="background:#f5f7fb;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" style="max-width:480px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">
            <tr>
              <td style="background:#071421;padding:20px 28px;">${logo}</td>
            </tr>
            <tr>
              <td style="padding:28px;color:#0d1f32;">${bodyHtml}</td>
            </tr>
            <tr>
              <td style="padding:16px 28px;color:#64748b;font-size:12px;border-top:1px solid #e2e8f0;">
                ${escapeHtml(settings.senderName)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function renderCourseAccessEmail(student: Student, course: Course, accessLink: string) {
  const subject = `You now have access to ${course.title}`;
  const text = `Hi ${student.name},

You now have access to "${course.title}".

Start learning here:
${accessLink}

This link signs you in automatically - no password needed.

Regards,
${appSettings().senderName}`;

  const html = renderBrandedEmail({
    preheader: subject,
    bodyHtml: `
      <h1 style="margin:0 0 12px;font-size:20px;">You now have access to ${escapeHtml(course.title)}</h1>
      <p style="margin:0 0 20px;line-height:1.6;">Hi ${escapeHtml(student.name)}, an admin has granted you access to this course. Click below to start learning - the link signs you in automatically, no password needed.</p>
      <p style="margin:0 0 24px;">
        <a href="${escapeHtml(accessLink)}" style="display:inline-block;background:#23a6f0;color:#071421;font-weight:bold;padding:12px 24px;border-radius:6px;text-decoration:none;">Start learning</a>
      </p>
      <p style="margin:0;font-size:13px;color:#64748b;">If the button does not work, copy and paste this link: ${escapeHtml(accessLink)}</p>
    `
  });

  return { subject, text, html };
}

export async function sendCourseAccessEmail(student: Student, course: Course, accessLink: string) {
  const email = renderCourseAccessEmail(student, course, accessLink);
  const status = await sendProviderEmail({
    to: student.email,
    subject: email.subject,
    text: email.text,
    html: email.html
  });
  await trackEvent("Course Access Email Sent", { studentId: student.id, courseId: course.id, status });
  return status;
}
