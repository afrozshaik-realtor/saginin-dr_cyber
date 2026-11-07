import Image from "next/image";
import { resolveBlogImage } from "@/lib/blog/image-file";
import type { BlogImageKey } from "@/lib/blog/images";

export type OverlayLabel = {
  text: string;
  /** Position of the blank panel in the artwork, as percentages of the image. */
  left: number;
  top: number;
  width: number;
  height: number;
};

/**
 * Figure for artwork that ships with blank label panels. Labels are real HTML text laid over the
 * panels on wider screens (decorative, aria-hidden: the same information is in the article text).
 */
export function OverlayFigure({ imageKey, labels }: { imageKey: BlogImageKey; labels: OverlayLabel[] }) {
  const image = resolveBlogImage(imageKey);
  if (!image) return null;
  return (
    <figure className="my-8">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 shadow-sm [container-type:inline-size]">
        <Image
          src={image.src}
          alt={image.alt}
          width={image.width}
          height={image.height}
          loading="lazy"
          sizes="(min-width: 1024px) 768px, (min-width: 768px) 700px, 100vw"
          className="h-auto w-full"
        />
        {labels.map((label) => (
          <div
            key={label.text}
            aria-hidden="true"
            className="absolute hidden items-center justify-center text-center sm:flex"
            style={{ left: `${label.left}%`, top: `${label.top}%`, width: `${label.width}%`, height: `${label.height}%` }}
          >
            <p className="font-bold leading-tight text-[#101C42] [font-size:clamp(9px,2.1cqw,18px)]">{label.text}</p>
          </div>
        ))}
      </div>
    </figure>
  );
}
