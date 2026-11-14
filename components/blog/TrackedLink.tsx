"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { trackBlogCtaClick } from "@/lib/actions/blog";

export function TrackedLink({
  href,
  slug,
  placement,
  className,
  children
}: {
  href: string;
  slug: string;
  placement: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        void trackBlogCtaClick(slug, placement);
      }}
    >
      {children}
    </Link>
  );
}
