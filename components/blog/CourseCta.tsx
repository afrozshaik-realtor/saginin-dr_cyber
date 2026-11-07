import Image from "next/image";
import { getBeginnerCoursePath } from "@/lib/blog/config";
import { resolveBlogImage } from "@/lib/blog/image-file";
import { TrackedLink } from "./TrackedLink";

const buttonClass =
  "focus-ring inline-flex items-center justify-center rounded-lg bg-[#10BFA5] px-6 py-3 text-base font-bold text-[#101C42] shadow-sm transition hover:bg-[#34d399] motion-reduce:transition-none";

/** Compact in-article call to action (soft and contextual placements). */
export function InlineCta({
  slug,
  placement,
  text,
  buttonLabel
}: {
  slug: string;
  placement: string;
  text: string;
  buttonLabel: string;
}) {
  return (
    <aside
      aria-label="Dr. Cyber beginner course"
      className="my-10 flex flex-col gap-4 rounded-2xl bg-gradient-to-r from-[#101C42] to-[#2563EB] p-6 text-white sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-lg font-semibold leading-7">{text}</p>
      <TrackedLink href={getBeginnerCoursePath()} slug={slug} placement={placement} className={`${buttonClass} shrink-0`}>
        {buttonLabel}
      </TrackedLink>
    </aside>
  );
}

/** Section-11 offer. Text sits in the blank panels of the artwork on wide screens and below it on mobile. */
export function CourseOfferCard({ slug }: { slug: string }) {
  const image = resolveBlogImage("courseOffer");
  const headline = "Start Your Cybersecurity Learning Journey With Dr. Cyber";
  const sub = "Affordable $29 USD beginner course";
  return (
    <div className="my-8">
      {image ? (
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 shadow-sm [container-type:inline-size]">
          <Image
            src={image.src}
            alt={image.alt}
            width={image.width}
            height={image.height}
            loading="lazy"
            sizes="(min-width: 1024px) 768px, 100vw"
            className="h-auto w-full"
          />
          <div className="absolute left-[3%] top-[6%] hidden h-[28%] w-[66%] items-center sm:flex" aria-hidden="true">
            <p className="font-bold leading-tight text-white [font-size:clamp(13px,3.7cqw,30px)]">{headline}</p>
          </div>
          <div className="absolute left-[4%] top-[42.5%] hidden h-[16%] w-[36%] items-center sm:flex" aria-hidden="true">
            <p className="font-semibold leading-tight text-white [font-size:clamp(10px,2.2cqw,18px)]">{sub}</p>
          </div>
        </div>
      ) : null}
      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-base leading-7 text-slate-700">
          Interested in cybersecurity but not sure where to begin? Dr. Cyber offers an affordable $29 USD beginner course for
          non-technical adults exploring IT and cybersecurity. Begin with the fundamentals, gain a clearer understanding of the
          field, and decide what to learn next.
        </p>
        <div className="mt-5">
          <TrackedLink href={getBeginnerCoursePath()} slug={slug} placement="course-offer" className={buttonClass}>
            Start Learning Cybersecurity — $29 USD
          </TrackedLink>
        </div>
      </div>
    </div>
  );
}

/** Primary closing call to action. */
export function PrimaryCta({ slug }: { slug: string }) {
  return (
    <aside
      aria-labelledby="primary-cta-heading"
      className="my-10 rounded-3xl bg-gradient-to-br from-[#101C42] via-[#2563EB] to-[#8B5CF6] p-8 text-white"
    >
      <h2 id="primary-cta-heading" className="text-2xl font-bold sm:text-3xl">
        Your Cybersecurity Journey Starts With One Step
      </h2>
      <p className="mt-3 max-w-xl text-lg leading-8 text-blue-50">
        Explore the fundamentals with Dr. Cyber’s beginner-friendly course.
      </p>
      <div className="mt-6">
        <TrackedLink href={getBeginnerCoursePath()} slug={slug} placement="primary-conclusion" className={buttonClass}>
          Explore the Dr. Cyber Beginner Course — $29 USD
        </TrackedLink>
      </div>
    </aside>
  );
}
