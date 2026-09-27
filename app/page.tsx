import Link from "next/link";
import { ButtonLink } from "@/components/ButtonLink";
import { pathways } from "@/lib/config/pathways";

const storyCards = [
  {
    title: "From Dentist to Cybersecurity Professional",
    copy: "A career switch is possible when the roadmap fits your real background.",
    image: "/images/dentist-to-cyber.png",
    alt: "A healthcare professional transitioning into cybersecurity study"
  },
  {
    title: "Cybersecurity Is Bigger Than Hacking",
    copy: "Risk, identity, cloud, compliance, SOC, and AI security all need different strengths.",
    image: "/images/myth-vs-reality.png",
    alt: "Infographic explaining cybersecurity is more than hacking"
  },
  {
    title: "How the Program Works",
    copy: "Take the quiz, review your roadmap, book a call, and choose a learning sequence.",
    image: "/images/quiz-process.png",
    alt: "Cyber career pathway quiz process infographic"
  }
];

export default function LandingPage({
  searchParams
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const utm = new URLSearchParams();
  ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach((key) => {
    const value = searchParams[key];
    if (typeof value === "string") utm.set(key, value);
  });
  const quizHref = `/quiz${utm.toString() ? `?${utm.toString()}` : ""}`;

  return (
    <main>
      <section className="relative overflow-hidden bg-navy text-white">
        <img
          className="absolute inset-0 h-full w-full object-cover opacity-45"
          src="/images/career-switcher-study.png"
          alt=""
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/85 to-navy/40" />
        <div className="absolute right-6 top-6 z-10 lg:right-8 lg:top-8">
          <Link
            className="focus-ring inline-flex items-center justify-center rounded-md border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
            href="/login"
          >
            Members
          </Link>
        </div>
        <div className="relative mx-auto grid min-h-[92vh] max-w-7xl gap-10 px-6 py-10 md:grid-cols-[1.05fr_.95fr] md:items-center lg:px-8">
          <div className="max-w-3xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-mint">Free career roadmap quiz</p>
            <h1 className="text-4xl font-bold leading-tight md:text-6xl">
              Switch Into Cybersecurity - Even If You Are Not From IT
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200">
              Discover the cybersecurity pathway that fits your background, skills, and career goals. Take the free
              career roadmap quiz and get a personalized learning plan.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href={quizHref}>Take the Free Dr Cyber Quiz</ButtonLink>
              <ButtonLink href="#pathways" variant="secondary">
                Explore pathways
              </ButtonLink>
              <ButtonLink href="/courses" variant="secondary">
                Browse courses
              </ButtonLink>
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border border-white/10 bg-white/5 shadow-glow">
            <img
              className="h-full min-h-[360px] w-full object-cover"
              src="/images/skill-match-healthcare.png"
              alt="Cybersecurity skill match dashboard for a healthcare career switcher"
            />
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-3">
            {storyCards.map((card) => (
              <article key={card.title} className="overflow-hidden rounded-lg border border-slate-200 bg-cloud">
                <img className="aspect-[16/10] w-full object-cover" src={card.image} alt={card.alt} />
                <div className="p-6">
                  <h2 className="text-xl font-bold">{card.title}</h2>
                  <p className="mt-3 text-slate-600">{card.copy}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="pathways" className="py-16">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
            <div>
              <h2 className="text-3xl font-bold">Cybersecurity Domains</h2>
              <p className="mt-3 text-slate-600">
                The quiz maps transferable strengths to a practical first pathway, then gives you projects and milestones.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {pathways.slice(0, 6).map((pathway) => (
                  <article key={pathway.id} className="rounded-lg border border-slate-200 bg-white p-5">
                    <h3 className="font-bold">{pathway.name}</h3>
                    <p className="mt-2 text-sm text-slate-600">{pathway.bestFor}</p>
                  </article>
                ))}
              </div>
            </div>
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-glow">
              <img
                className="w-full object-cover"
                src="/images/cybersecurity-domains.png"
                alt="Infographic showing multiple cybersecurity career domains"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:px-8">
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-cloud shadow-glow">
            <img
              className="w-full object-cover"
              src="/images/guided-process.png"
              alt="Six-step guided process from uncertainty to practical cybersecurity proof"
            />
          </div>
          <div>
            <h2 className="text-3xl font-bold">How the Career Switch Program Works</h2>
            <p className="mt-4 text-slate-600">
              You move from uncertainty to practical proof: discover your pathway, build foundations, follow a roadmap,
              learn with guidance, complete portfolio projects, and prepare for career transition.
            </p>
            <div className="mt-6">
              <ButtonLink href={quizHref}>Start with the quiz</ButtonLink>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 lg:grid-cols-[.95fr_1.05fr] lg:items-center lg:px-8">
          <div>
            <h2 className="text-3xl font-bold">Student Pathways With Guided Tools</h2>
            <p className="mt-4 text-slate-600">
              After the quiz, the funnel can grow into a guided learning experience with roadmaps, class scheduling,
              assignments, progress tracking, mentor feedback, and portfolio guidance.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {["Personalized roadmap", "Course lessons", "Progress tracking", "Portfolio guidance"].map((item) => (
                <div key={item} className="rounded-md border border-slate-200 bg-white p-4 text-sm font-semibold">
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-glow">
            <img
              className="w-full object-cover"
              src="/images/portal-experience.png"
              alt="Student and teacher portal experience for guided cybersecurity learning"
            />
          </div>
        </div>
      </section>

      <section className="bg-ink py-16 text-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 md:grid-cols-3 lg:px-8">
          <div>
            <h2 className="text-3xl font-bold">Meet Your Mentors</h2>
            <p className="mt-3 text-slate-300">
              Learn from practitioners who can translate cybersecurity into practical career-switch steps.
            </p>
          </div>
          <div className="md:col-span-2 grid gap-4 sm:grid-cols-2">
            <div className="overflow-hidden rounded-lg border border-white/10 bg-white/5">
              <img
                className="aspect-[16/9] w-full object-cover"
                src="/images/cyber-workshop.png"
                alt="Cybersecurity mentor leading a small group discussion"
              />
              <div className="p-5">
              <h3 className="font-bold">Student Pathways</h3>
              <p className="mt-2 text-sm text-slate-300">
                See whether GRC, SOC, cloud, IAM, vulnerability management, AI security, or foundations fit you first.
              </p>
              </div>
            </div>
            <div className="overflow-hidden rounded-lg border border-white/10 bg-white/5">
              <img
                className="aspect-[16/9] w-full object-cover"
                src="/images/classroom-instruction.png"
                alt="Instructor teaching cybersecurity concepts to career switchers"
              />
              <div className="p-5">
              <h3 className="font-bold">Clear Next Steps</h3>
              <p className="mt-2 text-sm text-slate-300">
                Leave with certifications, projects, and a consultation link instead of generic advice.
              </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-white py-16">
        <img
          className="absolute inset-0 h-full w-full object-cover opacity-10"
          src="/images/mentor-group-discussion.png"
          alt=""
          aria-hidden="true"
        />
        <div className="relative mx-auto flex max-w-6xl flex-col items-start justify-between gap-5 px-6 md:flex-row md:items-center lg:px-8">
          <div>
            <h2 className="text-3xl font-bold">Find your cyber pathway today</h2>
            <p className="mt-2 text-slate-600">The quiz takes about five minutes and creates your personalized roadmap.</p>
          </div>
          <ButtonLink href={quizHref}>Take the Free Dr Cyber Quiz</ButtonLink>
        </div>
      </section>
    </main>
  );
}
