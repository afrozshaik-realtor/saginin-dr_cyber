import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { onBookingClicked } from "@/lib/services/crm";
import { getStudentSessionId } from "@/lib/studentAuth";

export const dynamic = "force-dynamic";

/**
 * "Book a 1x1 with Dr_Cyber": records the click, then redirects to the booking link from the environment
 * (never from a query string, so this can't be used as an open redirect).
 */
export async function GET() {
  const base = process.env.BOOKING_LINK_1X1 || process.env.BOOKING_LINK;
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  if (!base) return NextResponse.redirect(`${appUrl}/dashboard`);

  const url = new URL(base);
  const studentId = getStudentSessionId();
  if (studentId) {
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (student) {
      await onBookingClicked(prisma, student.id);
      // Calendly-style prefill so the booking can be matched back to the student by email.
      url.searchParams.set("name", student.name);
      url.searchParams.set("email", student.email);
    }
  }
  return NextResponse.redirect(url.toString());
}
