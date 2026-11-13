/**
 * The 12 beginner mini-courses sold on the site. Slugs are stable identifiers (Stripe metadata, URLs);
 * TITLES BELOW ARE PLACEHOLDERS - rename them from /admin/courses after seeding (the seed never
 * overwrites a title you have edited).
 */
export const MINI_COURSE_PRICE_CENTS = 100; // $1 USD
export const BUNDLE_PRICE_CENTS = 900; // $9 USD
export const BUNDLE_SLUG = "all-12-bundle";
export const PRODUCT_CURRENCY = "usd";

const images = [
  "/images/career-switcher-study.png",
  "/images/hands-on-lab.png",
  "/images/technical-coaching.png",
  "/images/cyber-workshop.png"
];

export const miniCourses = Array.from({ length: 12 }, (_, i) => {
  const n = String(i + 1).padStart(2, "0");
  return {
    slug: `mini-course-${n}`,
    title: `Mini-Course ${n} (rename me)`,
    sortOrder: i + 1,
    image: images[i % images.length]
  };
});
