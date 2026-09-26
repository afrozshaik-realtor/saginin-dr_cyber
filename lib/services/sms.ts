import { appSettings } from "@/lib/settings";
import { logSms, trackEvent } from "@/lib/store";
import type { FunnelLead } from "@/types/funnel";

export async function sendResultSms(lead: FunnelLead) {
  const settings = appSettings();
  const message = `Hi ${lead.firstName}, your Dr Cyber result is ready: ${lead.pathwayResult}. Book your free roadmap call here: ${settings.bookingLink}`;

  if (!settings.smsEnabled || !lead.phone) {
    await logSms(lead.id, "quiz-result", message, "skipped");
    return;
  }

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_FROM_NUMBER) {
    await logSms(lead.id, "quiz-result", message, "missing-credentials");
    return;
  }

  const body = new URLSearchParams({
    To: lead.phone,
    From: process.env.TWILIO_FROM_NUMBER,
    Body: message
  });
  const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64");
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body
    }
  );
  const status = response.ok ? "sent" : `failed:${response.status}`;
  await logSms(lead.id, "quiz-result", message, status);
  await trackEvent("SMS Sent", { leadId: lead.id, status });
}
