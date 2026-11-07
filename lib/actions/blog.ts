"use server";

import { trackEvent } from "@/lib/store";

const placements = new Set(["soft-after-roadmap", "contextual-after-90-day-plan", "course-offer", "primary-conclusion"]);

/** Records a blog CTA click with the app's existing event log. Never throws into the UI. */
export async function trackBlogCtaClick(slug: string, placement: string) {
  if (!/^[a-z0-9-]{1,100}$/.test(slug) || !placements.has(placement)) return;
  try {
    await trackEvent("blog_cta_click", { slug, placement });
  } catch (error) {
    console.error("blog_cta_click tracking failed", error);
  }
}
