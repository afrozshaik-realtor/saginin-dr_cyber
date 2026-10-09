import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/auth";
import { saveUploadedFile } from "@/lib/services/storage";

// Temporary diagnostic endpoint for the R2 "fetch failed" investigation.
// Exercises the exact same saveUploadedFile() code path the real lesson/
// assignment upload uses, from inside the live app process, and returns
// full error detail (including the underlying network cause) instead of
// Next's generic "failed to get redirect response" wrapper.
export async function GET() {
  if (!isAdminSession()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const envPresence = {
    R2_ACCOUNT_ID: Boolean(process.env.R2_ACCOUNT_ID),
    R2_ACCESS_KEY_ID: Boolean(process.env.R2_ACCESS_KEY_ID),
    R2_SECRET_ACCESS_KEY: Boolean(process.env.R2_SECRET_ACCESS_KEY),
    R2_BUCKET_NAME: Boolean(process.env.R2_BUCKET_NAME),
    R2_ACCOUNT_ID_length: process.env.R2_ACCOUNT_ID?.length ?? 0,
    R2_BUCKET_NAME_value: process.env.R2_BUCKET_NAME ?? null
  };

  try {
    const file = new File([Buffer.from("debug upload test")], "debug-test.txt", {
      type: "text/plain"
    });
    const result = await saveUploadedFile(file, "debug-test");
    return NextResponse.json({ ok: true, result, envPresence });
  } catch (err: unknown) {
    const error = err as Error & { cause?: unknown };
    return NextResponse.json({
      ok: false,
      envPresence,
      error: {
        name: error?.name,
        message: error?.message,
        cause: error?.cause ? String(error.cause) : undefined,
        causeDetail:
          error?.cause && typeof error.cause === "object"
            ? JSON.stringify(error.cause, Object.getOwnPropertyNames(error.cause))
            : undefined,
        stack: error?.stack
      }
    });
  }
}
