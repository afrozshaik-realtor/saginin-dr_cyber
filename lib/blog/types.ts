import type { ComponentType } from "react";

export type BlogImage = {
  /** Path under /public, e.g. /images/blog/example.webp */
  src: string;
  alt: string;
  width: number;
  height: number;
};

export type BlogFaq = { question: string; answer: string };

export type BlogSource = { name: string; url: string; note: string };

export type BlogTocItem = { id: string; label: string };

export type BlogPostMeta = {
  slug: string;
  /** Visible H1 */
  title: string;
  seoTitle: string;
  description: string;
  /** Short standfirst shown in the hero */
  standfirst: string;
  category: string;
  author: { name: string; url: string; bio: string };
  /** ISO date (YYYY-MM-DD). Update to the real publishing date at launch. */
  publishedAt: string;
  modifiedAt: string;
  readingMinutes: number;
  /** Drafts 404 in production and are left out of the sitemap. */
  status: "draft" | "published";
  heroImageKey: string;
  keywords: string[];
};

export type BlogPost = {
  meta: BlogPostMeta;
  toc: BlogTocItem[];
  faqs: BlogFaq[];
  sources: BlogSource[];
  Body: ComponentType;
};
