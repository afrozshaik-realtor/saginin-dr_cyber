import assert from "node:assert/strict";
import { test } from "node:test";
import { planEntitlements, shouldRecommendBundle } from "../lib/entitlementPlan";

test("new purchase creates entitlements", () => {
  assert.deepEqual(planEntitlements(["a", "b"], []), { create: ["a", "b"], reactivate: [], skip: [] });
});

test("bundle after owning some courses skips the owned ones", () => {
  const plan = planEntitlements(["a", "b", "c"], [{ courseId: "a", status: "active" }]);
  assert.deepEqual(plan, { create: ["b", "c"], reactivate: [], skip: ["a"] });
});

test("revoked entitlement is reactivated, not duplicated", () => {
  const plan = planEntitlements(["a"], [{ courseId: "a", status: "revoked" }]);
  assert.deepEqual(plan, { create: [], reactivate: ["a"], skip: [] });
});

test("duplicate desired ids are collapsed", () => {
  assert.deepEqual(planEntitlements(["a", "a"], []).create, ["a"]);
});

test("bundle recommended when all courses are in the cart or total exceeds bundle price", () => {
  const base = { bundleCourseCount: 12, bundlePriceCents: 900 };
  assert.equal(shouldRecommendBundle({ ...base, cartCourseCount: 12, cartTotalCents: 1200 }), true);
  assert.equal(shouldRecommendBundle({ ...base, cartCourseCount: 10, cartTotalCents: 1000 }), true);
  assert.equal(shouldRecommendBundle({ ...base, cartCourseCount: 9, cartTotalCents: 900 }), false);
  assert.equal(shouldRecommendBundle({ bundleCourseCount: 0, bundlePriceCents: 900, cartCourseCount: 5, cartTotalCents: 5000 }), false);
});

test("presigned URL carries the requested expiry and a signature", async () => {
  process.env.R2_ACCOUNT_ID = "a";
  process.env.R2_ACCESS_KEY_ID = "k";
  process.env.R2_SECRET_ACCESS_KEY = "s";
  process.env.R2_BUCKET_NAME = "b";
  const { presignObjectUrl, isSafeObjectKey } = await import("../lib/services/storage");
  const t = new Date("2026-01-01T00:00:00Z");
  const { url, expiresAt } = presignObjectUrl("GET", "videos/c1/x.mp4", 3600, { now: t });
  const u = new URL(url);
  assert.equal(u.searchParams.get("X-Amz-Expires"), "3600");
  assert.equal(u.searchParams.get("X-Amz-Date"), "20260101T000000Z");
  assert.equal(expiresAt.toISOString(), "2026-01-01T01:00:00.000Z");
  assert.equal(isSafeObjectKey("videos/../secret"), false);
  assert.equal(isSafeObjectKey("videos/c1/x.mp4"), true);
  assert.throws(() => presignObjectUrl("GET", "../x", 60));
});
