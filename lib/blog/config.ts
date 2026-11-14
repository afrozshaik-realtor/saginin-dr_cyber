export const SITE_NAME = "Dr. Cyber";
export const MARKETING_SITE_URL = "https://drcyber.ca";

export function getAppUrl() {
  return (process.env.APP_URL || "https://app.drcyber.ca").replace(/\/$/, "");
}

/**
 * Destination for every "$29 USD beginner course" call to action: the course detail page,
 * whose enrol button starts the existing Stripe checkout. Courses are database-managed, so
 * override with BLOG_BEGINNER_COURSE_PATH (e.g. "/courses/<slug>") if the slug ever changes.
 * Note this course slug happens to match the article slug; they live under different routes
 * (/courses/... vs /blogs/...).
 */
export const DEFAULT_BEGINNER_COURSE_PATH = "/courses/switch-to-cybersecurity-guide";

export function getBeginnerCoursePath() {
  const configured = process.env.BLOG_BEGINNER_COURSE_PATH;
  return configured && configured.startsWith("/") && !configured.startsWith("//")
    ? configured
    : DEFAULT_BEGINNER_COURSE_PATH;
}

export const COURSE_PRICE_LABEL = "$29 USD";
