export const SITE_NAME = "Dr. Cyber";
export const MARKETING_SITE_URL = "https://drcyber.ca";

export function getAppUrl() {
  return (process.env.APP_URL || "https://app.drcyber.ca").replace(/\/$/, "");
}

/**
 * Destination for every "$29 USD beginner course" call to action.
 *
 * Courses live in the database (managed from /admin/courses), so the slug of the
 * $29 course is not in the codebase. Until it is confirmed, CTAs point at the real
 * course catalogue. Set BLOG_BEGINNER_COURSE_PATH (e.g. "/courses/<slug>") to
 * point them at the course detail page, which starts the existing Stripe checkout.
 */
export function getBeginnerCoursePath() {
  const configured = process.env.BLOG_BEGINNER_COURSE_PATH;
  return configured && configured.startsWith("/") && !configured.startsWith("//") ? configured : "/courses";
}

export const COURSE_PRICE_LABEL = "$29 USD";
