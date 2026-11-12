import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { onBooked } from "@/lib/services/crm";
import { listLeads, setPipelineStage, trackEvent } from "@/lib/store";

/** Calendly signs webhooks: header "Calendly-Webhook-Signature: t=<unix>,v1=<hmac_sha256(t + '.' + body)>". */
function validSignature(header: string | null, body: string, key: string) {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  if (!parts.t || !parts.v1) return false;
  if (Math.abs(Date.now() / 1000 - Number(parts.t)) > 5 * 60) return false; // replay window
  const expected = Buffer.from(createHmac("sha256", key).update(`${parts.t}.${body}`).digest("hex"));
  const provided = Buffer.from(parts.v1);
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}

export async function POST(request: NextRequest) {
  const raw = await request.text();
  const body = (() => {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  })();
  const email = body?.payload?.email || body?.email || body?.invitee?.email;

  // Set CALENDLY_WEBHOOK_SIGNING_KEY to verify the sender. The student's CRM stage is only advanced from a
  // verified request (and in production a key is required), so a forged POST can't move someone to "Booked 1x1".
  const signingKey = process.env.CALENDLY_WEBHOOK_SIGNING_KEY;
  const verified = signingKey ? validSignature(request.headers.get("calendly-webhook-signature"), raw, signingKey) : false;
  if (signingKey && !verified) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  const mayUpdateCrm = verified || (!signingKey && process.env.NODE_ENV !== "production");

  if (email) {
    const [lead] = await listLeads({ q: email });
    if (lead) await setPipelineStage(lead.id, "Call Booked", { status: "Booked" });
    if (lead) await trackEvent("Call Booked", { leadId: lead.id, provider: "calendly" });
    if (mayUpdateCrm) await onBooked(prisma, String(email));
  }
  return NextResponse.json({ received: true });
}
