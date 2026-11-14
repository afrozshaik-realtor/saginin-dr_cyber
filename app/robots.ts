import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/blog/config";

export default function robots(): MetadataRoute.Robots {
  const base = getAppUrl();
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin/", "/api/", "/learn/", "/dashboard", "/access/", "/checkout/"] }],
    sitemap: `${base}/sitemap.xml`
  };
}
