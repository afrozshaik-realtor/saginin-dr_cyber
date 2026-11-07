import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/blog/config";
import { listPublishedPosts } from "@/lib/blog/posts";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getAppUrl();
  const posts = listPublishedPosts();
  return [
    { url: base },
    { url: `${base}/courses` },
    ...(posts.length ? [{ url: `${base}/blogs` }] : []),
    ...posts.map((post) => ({
      url: `${base}/blogs/${post.meta.slug}`,
      lastModified: post.meta.modifiedAt
    }))
  ];
}
