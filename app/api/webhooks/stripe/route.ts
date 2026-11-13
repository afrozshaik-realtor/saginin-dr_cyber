// Legacy webhook URL kept as an alias so an endpoint already registered in Stripe keeps working.
// The real handler lives in /api/stripe/webhook.
export { POST } from "@/app/api/stripe/webhook/route";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
