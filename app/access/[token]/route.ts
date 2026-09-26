import { NextRequest, NextResponse } from "next/server";
import { getCourseBySlug } from "@/lib/config/courses";
import { getStudentById } from "@/lib/store";
import { setStudentSession, verifyAccessToken } from "@/lib/studentAuth";

export async function GET(request: NextRequest, { params }: { params: { token: string } }) {
  const payload = verifyAccessToken(params.token);
  const appUrl = process.env.APP_URL || "http://localhost:3000";

  if (!payload) {
    return NextResponse.redirect(`${appUrl}/login?error=expired`);
  }

  const [student, course] = await Promise.all([
    getStudentById(payload.studentId),
    Promise.resolve(getCourseBySlug(payload.courseSlug))
  ]);
  if (!student || !course) {
    return NextResponse.redirect(`${appUrl}/login?error=expired`);
  }

  setStudentSession(student.id);
  return NextResponse.redirect(`${appUrl}/learn/${course.slug}`);
}
