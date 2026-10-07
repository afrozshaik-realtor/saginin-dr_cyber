import { NextRequest, NextResponse } from "next/server";
import { isAdminSession } from "@/lib/auth";
import { getAssignmentSubmissionByFileUrl, getEnrollment } from "@/lib/store";
import { readUploadedFile } from "@/lib/services/storage";
import { getStudentSessionId } from "@/lib/studentAuth";

async function serveFile(relativePath: string, fileName: string) {
  try {
    const bytes = await readUploadedFile(relativePath);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Type": "application/octet-stream"
      }
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  const relativePath = params.path.join("/");
  const fileUrl = `/api/uploads/${relativePath}`;
  const fileName = relativePath.split("/").pop() || "download";
  const isAdmin = isAdminSession();
  const studentId = getStudentSessionId();

  const submission = await getAssignmentSubmissionByFileUrl(fileUrl);
  if (submission) {
    const authorized = isAdmin || (studentId && studentId === submission.studentId);
    if (!authorized) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return serveFile(relativePath, submission.fileName || "download");
  }

  // Lesson resources and assignment PDF templates are both stored under
  // "<kind>/<courseId>/..." and share the same access rule: an admin can always download,
  // and a student can if they're enrolled in that course.
  if (relativePath.startsWith("lesson-resources/") || relativePath.startsWith("assignment-templates/")) {
    if (isAdmin) return serveFile(relativePath, fileName);
    const courseId = relativePath.split("/")[1];
    const enrollment = studentId && courseId ? await getEnrollment(studentId, courseId) : null;
    if (!enrollment) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return serveFile(relativePath, fileName);
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
