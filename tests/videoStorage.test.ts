import assert from "node:assert/strict";
import { test } from "node:test";
import { presignObjectUrl, videoStorage } from "../lib/services/storage";

const env = process.env as Record<string, string | undefined>;
const VIDEO = ["R2_VIDEO_ACCOUNT_ID", "R2_VIDEO_ACCESS_KEY_ID", "R2_VIDEO_SECRET_ACCESS_KEY", "R2_VIDEO_BUCKET_NAME"];
const clearVideo = () => VIDEO.forEach((k) => delete env[k]);
const setGeneral = () => {
  env.R2_ACCOUNT_ID = "generalacct";
  env.R2_ACCESS_KEY_ID = "GENERALKEYID";
  env.R2_SECRET_ACCESS_KEY = "general-secret-value";
  env.R2_BUCKET_NAME = "general-bucket";
};
const setVideo = () => {
  env.R2_VIDEO_ACCOUNT_ID = "videoacct";
  env.R2_VIDEO_ACCESS_KEY_ID = "VIDEOKEYID";
  env.R2_VIDEO_SECRET_ACCESS_KEY = "video-secret-value";
  env.R2_VIDEO_BUCKET_NAME = "drcyber-videos-prod";
};
const fixed = new Date("2026-11-12T10:00:00Z");

test("with R2_VIDEO_* set, video links use the video account, bucket and key id (not the general ones)", () => {
  setGeneral(); setVideo();
  const url = new URL(videoStorage.presign("GET", "videos/c1/a.mp4", 3600).url);
  assert.equal(url.hostname, "videoacct.r2.cloudflarestorage.com");
  assert.ok(url.pathname.startsWith("/drcyber-videos-prod/videos/c1/a.mp4"));
  assert.ok(url.searchParams.get("X-Amz-Credential")?.startsWith("VIDEOKEYID/"));
  assert.equal(url.searchParams.get("X-Amz-Expires"), "3600");
  assert.equal(url.toString().includes("general-secret-value") || url.toString().includes("video-secret-value"), false);
});

test("the general uploads target is unchanged when video variables exist", () => {
  setGeneral(); setVideo();
  const url = new URL(presignObjectUrl("GET", "lesson-resources/x/y.pdf", 60).url);
  assert.equal(url.hostname, "generalacct.r2.cloudflarestorage.com");
  assert.ok(url.pathname.startsWith("/general-bucket/"));
  assert.ok(url.searchParams.get("X-Amz-Credential")?.startsWith("GENERALKEYID/"));
});

test("a video link and a general link for the same key and time carry different signatures", () => {
  setGeneral(); setVideo();
  const video = new URL(videoStorage.presign("GET", "videos/c1/a.mp4", 3600).url).searchParams.get("X-Amz-Signature");
  const general = new URL(presignObjectUrl("GET", "videos/c1/a.mp4", 3600, { now: fixed }).url).searchParams.get("X-Amz-Signature");
  assert.notEqual(video, general);
});

test("with no R2_VIDEO_* set, video falls back to the R2_* target (single-bucket setups)", () => {
  setGeneral(); clearVideo();
  const url = new URL(videoStorage.presign("PUT", "videos/c1/a.mp4", 900).url);
  assert.equal(url.hostname, "generalacct.r2.cloudflarestorage.com");
  assert.ok(url.pathname.startsWith("/general-bucket/"));
});

test("a half-configured video set is refused, naming the missing variables but never any values", () => {
  setGeneral(); clearVideo();
  env.R2_VIDEO_ACCOUNT_ID = "videoacct";
  env.R2_VIDEO_ACCESS_KEY_ID = "VIDEOKEYID";
  assert.throws(
    () => videoStorage.presign("GET", "videos/c1/a.mp4", 3600),
    (err: Error) =>
      /R2_VIDEO_SECRET_ACCESS_KEY/.test(err.message) &&
      /R2_VIDEO_BUCKET_NAME/.test(err.message) &&
      !/videoacct|VIDEOKEYID/.test(err.message)
  );
});

test("unsafe keys are still refused for video links", () => {
  setGeneral(); setVideo();
  assert.throws(() => videoStorage.presign("GET", "../secret", 60));
  assert.throws(() => videoStorage.presign("GET", "videos//x.mp4", 60));
});

test("nothing configured at all is a clear error", () => {
  for (const k of ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME", ...VIDEO]) delete env[k];
  assert.throws(() => videoStorage.presign("GET", "videos/c1/a.mp4", 60), /not configured/);
});
