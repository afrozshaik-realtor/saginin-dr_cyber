import Image from "next/image";
import { resolveBlogImage } from "@/lib/blog/image-file";
import type { BlogImageKey } from "@/lib/blog/images";

/**
 * Full-width article image. Dimensions reserve space (no layout shift), below-the-fold
 * images lazy-load, and next/image serves responsive sizes from the original asset.
 * Renders nothing if the file has not been added to /public yet.
 */
export function Figure({
  imageKey,
  caption,
  priority = false,
  className = ""
}: {
  imageKey: BlogImageKey;
  caption?: string;
  priority?: boolean;
  className?: string;
}) {
  const image = resolveBlogImage(imageKey);
  if (!image) return null;
  return (
    <figure className={`my-8 ${className}`}>
      <Image
        src={image.src}
        alt={image.alt}
        width={image.width}
        height={image.height}
        priority={priority}
        loading={priority ? undefined : "lazy"}
        sizes="(min-width: 1024px) 768px, (min-width: 768px) 700px, 100vw"
        className="h-auto w-full rounded-2xl border border-slate-200 shadow-sm"
      />
      {caption ? <figcaption className="mt-3 text-sm text-slate-500">{caption}</figcaption> : null}
    </figure>
  );
}
