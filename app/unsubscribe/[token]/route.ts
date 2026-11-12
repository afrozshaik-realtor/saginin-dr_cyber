import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { setEmailConsent } from "@/lib/services/crm";
import { verifyUnsubscribeToken } from "@/lib/studentAuth";

export const dynamic = "force-dynamic";

function page(message: string, status = 200) {
  return new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Email preferences</title><body style="font-family:system-ui,sans-serif;max-width:32rem;margin:4rem auto;padding:0 1rem"><h1>${message}</h1><p><a href="/">Back to Dr Cyber</a></p></body>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

/** One-click unsubscribe from marketing email (works without logging in). Transactional emails (receipts) still send. */
export async function GET(_request: NextRequest, { params }: { params: { token: string } }) {
  const payload = verifyUnsubscribeToken(params.token);
  if (!payload) return page("This unsubscribe link is not valid.", 400);
  const exists = await prisma.student.findUnique({ where: { id: payload.studentId }, select: { id: true } });
  if (!exists) return page("This unsubscribe link is not valid.", 400);
  await setEmailConsent(prisma, payload.studentId, false, "unsubscribe_link");
  return page("You're unsubscribed from marketing emails.");
}
