import crypto from "crypto";

/**
 * Cloudflare R2 (S3-compatible) file storage.
 *
 * Replaces the previous local-disk implementation. Local disk lived inside
 * the app's own deploy folder, which Hostinger replaces on every git-based
 * redeploy - so every uploaded file (lesson resources, assignment
 * submissions, generated PDFs) was lost the next time code was pushed.
 * R2 is external object storage, so files now survive redeploys.
 *
 * No new npm dependency is added (AWS SigV4 signing is implemented here with
 * Node's built-in `crypto` + the global `fetch`), so this can't break the
 * build via a lockfile mismatch.
 *
 * Required environment variables (set these in Hostinger's
 * Environment Variables panel for app.drcyber.ca):
 *   R2_ACCOUNT_ID          - Cloudflare account ID
 *   R2_ACCESS_KEY_ID       - R2 API token access key ID
 *   R2_SECRET_ACCESS_KEY   - R2 API token secret access key
 *   R2_BUCKET_NAME         - R2 bucket name, e.g. "drcyber-uploads"
 */

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const BUCKET = process.env.R2_BUCKET_NAME!;
const REGION = "auto";
const SERVICE = "s3";

function assertConfigured() {
    if (!ACCOUNT_ID || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY || !BUCKET) {
          throw new Error(
                  "R2 storage is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, " +
                    "R2_SECRET_ACCESS_KEY and R2_BUCKET_NAME in the environment."
                );
    }
}

function hmac(key: Buffer | string, data: string) {
    return crypto.createHmac("sha256", key).update(data).digest();
}

function sha256Hex(data: Buffer | string) {
    return crypto.createHash("sha256").update(data).digest("hex");
}

function getSigningKey(dateStamp: string) {
    const kDate = hmac(`AWS4${SECRET_ACCESS_KEY}`, dateStamp);
    const kRegion = hmac(kDate, REGION);
    const kService = hmac(kRegion, SERVICE);
    return hmac(kService, "aws4_request");
}

function joinPath(folder: string, name: string) {
    return [folder, name]
      .filter(Boolean)
      .join("/")
      .replace(/\/{2,}/g, "/")
      .replace(/^\//, "");
}

/** Signed request to R2's S3-compatible API. */
async function r2Request(method: "PUT" | "GET", key: string, body?: Buffer) {
    assertConfigured();

  const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);
    const host = `${ACCOUNT_ID}.r2.cloudflarestorage.com`;
    const payloadHash = sha256Hex(body ?? Buffer.alloc(0));
    const canonicalUri = `/${BUCKET}/${key
                                           .split("/")
                                           .map(encodeURIComponent)
                                           .join("/")}`;

  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
    const canonicalRequest = [
          method,
          canonicalUri,
          "",
          canonicalHeaders,
          signedHeaders,
          payloadHash
        ].join("\n");

  const credentialScope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;
    const stringToSign = [
          "AWS4-HMAC-SHA256",
          amzDate,
          credentialScope,
          sha256Hex(canonicalRequest)
        ].join("\n");

  const signingKey = getSigningKey(dateStamp);
    const signature = hmac(signingKey, stringToSign).toString("hex");

  const authorization =
        `AWS4-HMAC-SHA256 Credential=${ACCESS_KEY_ID}/${credentialScope}, ` +
        `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return fetch(`https://${host}${canonicalUri}`, {
        method,
        headers: {
                "x-amz-content-sha256": payloadHash,
                "x-amz-date": amzDate,
                authorization
        },
        body
  });
}

/**
 * Local-disk file storage for assignment submissions. Works out of the box (no external
 * dependency), but the files live on the app server's disk only - not backed up, and not
 * shared if you ever run multiple instances. For real production use at scale, swap this
 * for an S3-compatible bucket (Cloudflare R2, AWS S3) behind the same two functions.
 *
 * ^ that comment was on the old local-disk version of this file. This is that swap.
 */
export async function saveUploadedFile(file: File, folder: string) {
    const bytes = Buffer.from(await file.arrayBuffer());
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120) || "upload";
    const storedName = `${crypto.randomUUID()}-${safeName}`;
    const relativePath = joinPath(folder, storedName);

  const res = await r2Request("PUT", relativePath, bytes);
    if (!res.ok) {
          throw new Error(`R2 upload failed (${res.status}): ${await res.text()}`);
    }

  return {
        url: `/api/uploads/${relativePath}`,
        relativePath,
        name: file.name,
        sizeBytes: bytes.length
  };
}

/** Same as saveUploadedFile, but for bytes generated by the server (e.g. a filled-in PDF) rather than an uploaded File. */
export async function saveGeneratedFile(bytes: Buffer, fileName: string, folder: string) {
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120) || "download";
    const storedName = `${crypto.randomUUID()}-${safeName}`;
    const relativePath = joinPath(folder, storedName);

  const res = await r2Request("PUT", relativePath, bytes);
    if (!res.ok) {
          throw new Error(`R2 upload failed (${res.status}): ${await res.text()}`);
    }

  return {
        url: `/api/uploads/${relativePath}`,
        relativePath,
        name: fileName,
        sizeBytes: bytes.length
  };
}

export async function readUploadedFile(relativePath: string): Promise<Buffer> {
    // Same path-traversal guard the local-disk version had.
  const segments = relativePath.split("/");
    if (relativePath.startsWith("/") || segments.some((s) => s === "" || s === "..")) {
          throw new Error("Invalid upload path");
    }

  const res = await r2Request("GET", relativePath);
    if (!res.ok) {
          throw new Error(`R2 read failed (${res.status})`);
    }
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
}
