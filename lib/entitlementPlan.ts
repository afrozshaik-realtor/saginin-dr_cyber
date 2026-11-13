/**
 * Pure (no DB) entitlement logic, kept separate so it can be unit-tested.
 */

export type ExistingEntitlement = { courseId: string; status: string };

/**
 * Given the courses a purchase should unlock and what the student already has, decide what to write.
 * - create:     no row yet
 * - reactivate: a revoked row exists (e.g. refunded earlier, buying again)
 * - skip:       already active (owned) - never duplicated, never re-granted
 */
export function planEntitlements(desiredCourseIds: string[], existing: ExistingEntitlement[]) {
  const status = new Map(existing.map((e) => [e.courseId, e.status]));
  const desired = Array.from(new Set(desiredCourseIds));
  return {
    create: desired.filter((id) => !status.has(id)),
    reactivate: desired.filter((id) => status.get(id) === "revoked"),
    skip: desired.filter((id) => status.get(id) === "active")
  };
}

/** Recommend the bundle when the cart holds every course in it, or costs more than the bundle. */
export function shouldRecommendBundle(input: {
  cartCourseCount: number;
  cartTotalCents: number;
  bundleCourseCount: number;
  bundlePriceCents: number;
}) {
  if (input.bundleCourseCount === 0) return false;
  return input.cartCourseCount >= input.bundleCourseCount || input.cartTotalCents > input.bundlePriceCents;
}
