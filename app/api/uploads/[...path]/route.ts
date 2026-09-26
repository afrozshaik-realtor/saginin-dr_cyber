import { NextRequest, NextResponse } from "next/server";
import { isAdminSession } from "@/lib/auth";
import { getAssignmentSubmissionByFileUrl } from "@/lib/store";
import { readUploadedFile } from "@/lib/services/storage";
import { getStudentSessionId } from "@/lib/studentAuth";

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  const relativePath = params.path.join("/");
  const fileUrl = `/api/uploads/${relativePath}`;

  const submission = await getAssignmentSubmissionByFileUrl(fileUrl);
  if (!submission) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const studentId = getStudentSessionId();
  const authorized = isAdminSession() || (studentId && studentId === submission.studentId);
  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const bytes = await readUploadedFile(relativePath);
    return new NextResponse(bytes, {
      headers: {
        "Content-Disposition": `attachment; filename="${submission.fileName || "download"}"`,
        "Content-Type": "application/octet-stream"
      }
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
