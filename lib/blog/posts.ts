import { post as switchToCybersecurityGuide } from "./posts/switch-to-cybersecurity-guide";
import type { BlogPost } from "./types";

// Register new articles here. Each article is one file in lib/blog/posts/.
const allPosts: BlogPost[] = [switchToCybersecurityGuide];

const showDrafts = () => process.env.NODE_ENV !== "production";

export function listPosts(): BlogPost[] {
  return allPosts
    .filter((post) => post.meta.status === "published" || showDrafts())
    .sort((a, b) => b.meta.publishedAt.localeCompare(a.meta.publishedAt));
}

export function listPublishedPosts(): BlogPost[] {
  return allPosts.filter((post) => post.meta.status === "published");
}

export function getPost(slug: string): BlogPost | undefined {
  return listPosts().find((post) => post.meta.slug === slug);
}
