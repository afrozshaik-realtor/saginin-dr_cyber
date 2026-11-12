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
