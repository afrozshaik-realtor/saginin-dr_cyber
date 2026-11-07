import {
  ArticleSection,
  CareerPathCard,
  DirectAnswer,
  ExternalLink,
  InternalLink,
  QuickInsight,
  RoadmapSteps,
  SourceNote,
  SubHeading,
  Takeaway,
  type CareerPath
} from "@/components/blog/ArticleParts";
import { CourseOfferCard, InlineCta, PrimaryCta } from "@/components/blog/CourseCta";
import { Faq } from "@/components/blog/Faq";
import { Figure } from "@/components/blog/Figure";
import { MARKETING_SITE_URL } from "@/lib/blog/config";
import type { BlogFaq, BlogPost, BlogSource, BlogTocItem } from "../types";

const SLUG = "switch-to-cybersecurity-guide";

/**
 * Figures below come from the content brief and must be re-checked against the live
 * sources before `status` is switched to "published" (see PR notes):
 *  - BLS Occupational Outlook Handbook, Information Security Analysts: 21% projected
 *    growth (2025–2035) and US$129,180 median annual wage. The BLS site could not be
 *    reached from the build environment, and a search snapshot showed 29% (2024–2034)
 *    and $124,910 (May 2024), so these need confirming.
 *  - Job Bank, Cybersecurity specialists (NOC 21220): CA$49.52/hour national median
 *    (confirmed via search; wage data updated 19 Nov 2025).
 */
const BLS_GROWTH = "21%";
const BLS_PERIOD = "2025 to 2035";
const BLS_MEDIAN_WAGE = "$129,180";
const JOBBANK_MEDIAN_HOURLY = "$49.52";

const BLS_URL = "https://www.bls.gov/ooh/computer-and-information-technology/information-security-analysts.htm";
const JOBBANK_URL = "https://www.jobbank.gc.ca/marketreport/summary-occupation/297999/ca";

export const toc: BlogTocItem[] = [
  { id: "what-is-cybersecurity", label: "What is cybersecurity?" },
  { id: "good-career-2026", label: "Is it a good career in 2026?" },
  { id: "coding-required", label: "Do you need coding?" },
  { id: "beginner-jobs", label: "Jobs beginners can explore" },
  { id: "salary", label: "How much can you earn?" },
  { id: "roadmap", label: "Seven-step roadmap" },
  { id: "ninety-day-plan", label: "90-day learning plan" },
  { id: "career-switch", label: "Switching from another career" },
  { id: "beginner-mistakes", label: "Five mistakes to avoid" },
  { id: "where-to-begin", label: "Where should you begin?" },
  { id: "dr-cyber-course", label: "Dr. Cyber beginner course" },
  { id: "faq", label: "FAQ" },
  { id: "conclusion", label: "Conclusion" }
];

export const faqs: BlogFaq[] = [
  {
    question: "Can I start cybersecurity with no IT experience?",
    answer:
      "Yes, you can begin learning without prior IT experience, although technical foundations and practical skills are needed for many jobs."
  },
  {
    question: "Do I need a university degree?",
    answer: "Not every cybersecurity position requires one. Requirements vary by employer and role."
  },
  {
    question: "Is cybersecurity difficult for non-technical people?",
    answer: "It can be challenging initially, but structured foundational learning helps."
  },
  {
    question: "Can I learn cybersecurity in three months?",
    answer:
      "You can build beginner knowledge in three months, but becoming job-ready may take longer."
  },
  {
    question: "Is coding necessary?",
    answer: "Not for every role, although foundational technical skills remain important."
  },
  {
    question: "What is a good first cybersecurity certification?",
    answer:
      "ISC2 Certified in Cybersecurity (CC) may suit newcomers; CompTIA Security+ is another foundational option depending on your prior knowledge."
  },
  {
    question: "What is the easiest job to start with?",
    answer:
      "There is no universally easiest role. IT support is one common stepping-stone into security."
  },
  {
    question: "Will a $29 course guarantee employment?",
    answer:
      "No. Introductory training helps learners explore and understand cybersecurity but cannot guarantee jobs or salary."
  }
];

export const sources: BlogSource[] = [
  {
    name: "U.S. Bureau of Labor Statistics — Occupational Outlook Handbook: Information Security Analysts",
    url: BLS_URL,
    note: "Employment projections, median wage and typical entry requirements for information security analysts."
  },
  {
    name: "Government of Canada Job Bank — Cybersecurity specialists (NOC 21220)",
    url: JOBBANK_URL,
    note: "National median hourly wage for cybersecurity specialists in Canada."
  },
  {
    name: "ISC2 — Certified in Cybersecurity (CC)",
    url: "https://www.isc2.org/",
    note: "Entry-level certification details and requirements."
  },
  {
    name: "CompTIA — Security+",
    url: "https://www.comptia.org/",
    note: "Foundational certification details, recommended experience and exam information."
  }
];

const careerPaths: CareerPath[] = [
  {
    title: "IT Help Desk / Technical Support",
    note: "An adjacent IT entry route, not a cybersecurity specialization in itself.",
    does: "Helps colleagues or customers fix everyday technology problems: password resets, software that won’t open, devices that won’t connect.",
    example: "An employee is locked out of their account. You verify who they are, reset access safely and notice when a request looks suspicious.",
    skills: "Troubleshooting, clear communication, patience, basic knowledge of operating systems and networks.",
    experience: "Often not required for entry-level roles, but employers usually expect some technology confidence and customer-service skills.",
    fit: "You enjoy helping people and solving practical problems."
  },
  {
    title: "Junior Security Operations Centre (SOC) Analyst",
    does: "Watches security alerts, decides which ones are real and escalates serious problems. A SOC is the team that monitors an organization’s systems for trouble.",
    example: "An alert shows an employee account signing in from two countries within minutes. You investigate and pass it to a senior analyst if it looks suspicious.",
    skills: "Networking basics, operating systems, log reading, careful note-taking, calm decision-making.",
    experience: "Many employers expect some prior IT experience or recognized foundational training; requirements vary.",
    fit: "You like investigating puzzles and following clues."
  },
  {
    title: "Security Compliance / GRC Assistant",
    does: "Supports governance, risk and compliance (GRC): making sure the organization follows security rules, standards and laws, and tracking where it falls short.",
    example: "You collect evidence that every laptop has encryption turned on, then record any gaps for review.",
    skills: "Organization, documentation, attention to detail, understanding of policies and basic security concepts.",
    experience: "Often less technical than SOC work, but a grounding in security concepts is still expected; some roles ask for related experience.",
    fit: "You like structured processes and careful records."
  },
  {
    title: "Security Awareness Coordinator",
    does: "Teaches employees to spot scams and handle information safely, through training, reminders and practice exercises.",
    example: "You run a short session showing staff how to recognize a fake “IT support” email.",
    skills: "Communication, training, empathy, writing in plain language, security fundamentals.",
    experience: "Often values teaching, communications or HR backgrounds alongside security knowledge; requirements vary by employer.",
    fit: "You enjoy explaining ideas and helping people change habits."
  },
  {
    title: "Vulnerability Management Assistant",
    does: "Helps find, track and prioritize weaknesses (vulnerabilities) in software and devices, then follows up until they are fixed.",
    example: "A scan shows laptops missing an important update. You track which teams must install it and check that they did.",
    skills: "Systems knowledge, spreadsheets and ticketing tools, persistence, attention to detail.",
    experience: "Usually expects some IT or systems background; entry points vary.",
    fit: "You like technical puzzles and seeing problems through to a fix."
  }
];

const roadmapSteps = [
  { title: "Understand computers", detail: "Get comfortable with Windows, files, operating systems, user accounts and basic troubleshooting." },
  { title: "Understand networking", detail: "Learn how Wi-Fi, routers, IP addresses, the internet and connected devices fit together." },
  { title: "Learn common threats", detail: "Study phishing, malware, ransomware and stolen passwords, and how each one works." },
  { title: "Practice safely", detail: "Use authorized labs, set up multi-factor authentication, practise spotting suspicious emails and learn how account permissions work." },
  { title: "Explore certifications", detail: "Look at ISC2 Certified in Cybersecurity (CC) and CompTIA Security+, and choose based on your background." },
  { title: "Build a small portfolio", detail: "Document learning exercises, simple projects, security observations and troubleshooting you have done." },
  { title: "Apply strategically", detail: "Research help desk, IT support, security trainee, junior SOC and suitable compliance positions, and match them to your skills." }
];

function Body() {
  return (
    <>
      <ArticleSection id="introduction" title="Is cybersecurity possible without another four-year degree?">
        <p className="text-xl font-semibold leading-9 text-[#101C42]">
          “What if your next career didn’t require starting with another four-year degree?”
        </p>
        <p>
          Every day, <strong>cybersecurity</strong> professionals help protect hospitals, banks, businesses, families and the
          digital information they all rely on. When a clinic’s patient records stay private or a bank blocks a fraudulent
          login, someone’s security work is behind it.
        </p>
        <p>
          The encouraging part for career changers: beginners do not necessarily need a computer science degree or coding
          experience to <em>start learning</em>. Many people begin with everyday computer skills and build up step by step.
        </p>
        <p>
          One honest distinction matters, though. <strong>Starting to learn</strong> is not the same as{" "}
          <strong>being qualified for a job</strong>. Learning gets you moving. Employers still look for practical skills and,
          for many roles, some experience. This guide gives you a realistic roadmap for starting without a technical
          background, so you know what to learn, in what order, and what to expect.
        </p>
        <Figure imageKey="beginnerConfidence" />
        <p>
          Technical skills can be learned step by step, the same way you learned any skill in your current career. Nobody
          arrives knowing what a firewall is.
        </p>
      </ArticleSection>

      <ArticleSection id="what-is-cybersecurity" title="What Is Cybersecurity? Explained in Simple English">
        <DirectAnswer>
          Cybersecurity means protecting computers, online accounts, networks, and information from unauthorized access, theft,
          damage, and disruption.
        </DirectAnswer>
        <p>Think of protecting a house. The locks on your doors are like <strong>passwords and access controls</strong>: they decide who may come in. Security cameras are like <strong>monitoring</strong>: they let you see what is happening. A home alarm is like a <strong>security alert</strong>: it tells you quickly when something is wrong.</p>
        <Figure imageKey="homeSecurityAnalogy" />
        <p>Here is a real-world style example. A hospital employee receives an email that looks like it comes from “IT support.” It says their account will be closed unless they reply with their password. This is <strong>phishing</strong>: a message designed to trick someone into giving away information or clicking something harmful. The attacker is not “hacking” the hospital’s computers at all. They are asking a person to open the door.</p>
        <Figure imageKey="healthcarePhishing" />
        <p>A security team’s job includes making that trick harder to pull off, spotting it quickly and helping people respond. That is why it helps to remember:</p>
        <Takeaway>Cybersecurity isn’t only about protecting computers. It’s about protecting the people who depend on them.</Takeaway>
      </ArticleSection>

      <ArticleSection id="good-career-2026" title="Is Cybersecurity a Good Career in 2026?">
        <DirectAnswer>
          It can be: demand for qualified professionals is projected to grow, but competition for entry-level roles is real, so
          realistic expectations matter.
        </DirectAnswer>
        <p>
          The U.S. Bureau of Labor Statistics (BLS) projects employment of <strong>information security analysts</strong> to
          grow about {BLS_GROWTH} from {BLS_PERIOD}, well above the average projected for all occupations (
          <ExternalLink href={BLS_URL}>BLS Occupational Outlook Handbook</ExternalLink>).
        </p>
        <p>
          Read that carefully. It covers one occupation, information security analysts. It is not a figure for every
          cybersecurity job, and projected growth does not mean every employer has plenty of beginner openings. Many people
          compete for entry-level roles, and employers often ask for foundational skills or related experience.
        </p>
        <Figure imageKey="careerOutlook" />
        <p>The need for security work shows up across many kinds of organizations:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li><strong>Healthcare:</strong> protecting patient records and keeping clinical systems running.</li>
          <li><strong>Banking:</strong> defending accounts and payments from fraud.</li>
          <li><strong>E-commerce:</strong> keeping customer data and checkouts safe.</li>
          <li><strong>Government:</strong> safeguarding public services and citizen information.</li>
          <li><strong>Small businesses:</strong> protecting a handful of systems, often with few dedicated security staff.</li>
        </ul>
        <Figure imageKey="industries" />
        <p>
          Your current industry can be an advantage. Someone who already understands how a clinic, a bank or a school works
          can bring useful context to security. Just do not assume every industry is hiring beginners in large numbers: it
          varies by region, employer and year.
        </p>
      </ArticleSection>

      <ArticleSection id="coding-required" title="Do You Need Coding to Work in Cybersecurity?">
        <DirectAnswer>No. Coding is not required for every cybersecurity job.</DirectAnswer>
        <p>
          Some roles are highly technical and involve writing scripts or analysing software. Others focus on people, policy and
          process. Examples of less coding-intensive work include <strong>security awareness</strong> training,{" "}
          <strong>governance, risk and compliance (GRC)</strong>, writing and maintaining <strong>security policy documentation</strong>, and{" "}
          <strong>risk coordination</strong>.
        </p>
        <p>
          One caution: “no coding” does not mean “no technology.” Every cybersecurity professional still needs relevant
          technology knowledge, such as how operating systems, accounts and networks work. You are not avoiding technical
          learning, only choosing a path where programming is not the main skill.
        </p>
        <Figure imageKey="noCoding" />
      </ArticleSection>

      <ArticleSection id="beginner-jobs" title="Which Cybersecurity Jobs Can Beginners Explore?">
        <DirectAnswer>
          Beginners can explore help desk, junior SOC, compliance, security awareness and vulnerability management routes, but
          not all of them are open without experience.
        </DirectAnswer>
        <p>Here are five pathways. Notice that each one lists whether prior IT experience is typically expected, because honest expectations save you time.</p>
        <div className="space-y-4">
          {careerPaths.map((path, i) => (
            <CareerPathCard key={path.title} path={path} index={i + 1} />
          ))}
        </div>
        <Figure imageKey="careerPaths" />
        <QuickInsight label="A question to ask yourself">
          Do you enjoy helping people, investigating problems, following structured processes, or solving technical puzzles?
          Your answer is a good clue about which pathway to explore first.
        </QuickInsight>
      </ArticleSection>

      <ArticleSection id="salary" title="How Much Can You Earn in Cybersecurity?">
        <DirectAnswer>It depends on location, experience, role, employer and specialization, and published medians are not beginner salaries.</DirectAnswer>
        <p>Two official sources give a useful picture of what established professionals earn:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>United States:</strong> BLS reports a median annual wage of {BLS_MEDIAN_WAGE} for information security
            analysts (<ExternalLink href={BLS_URL}>U.S. Bureau of Labor Statistics</ExternalLink>).
          </li>
          <li>
            <strong>Canada:</strong> the Government of Canada Job Bank lists a national median of CA{JOBBANK_MEDIAN_HOURLY} per
            hour for cybersecurity specialists (<ExternalLink href={JOBBANK_URL}>Job Bank</ExternalLink>).
          </li>
        </ul>
        <QuickInsight label="Important">
          These are occupational medians, not beginner salaries. They describe the middle of everyone working in that occupation,
          including experienced professionals. Entry-level pay varies and is often lower.
        </QuickInsight>
        <Figure imageKey="salary" />
        <p>Dr. Cyber does not promise that students will earn these amounts. Use them to understand the field, not to predict your first paycheque.</p>
      </ArticleSection>

      <ArticleSection id="roadmap" title="How to Start Cybersecurity From Zero: Your Beginner Roadmap">
        <DirectAnswer>Start with computers and networks, learn common threats, practise safely, then build proof of your skills before applying.</DirectAnswer>
        <RoadmapSteps steps={roadmapSteps} />
        <p>
          On certifications: <ExternalLink href="https://www.isc2.org/">ISC2</ExternalLink> offers the Certified in Cybersecurity
          (CC) credential aimed at people entering the field, and{" "}
          <ExternalLink href="https://www.comptia.org/">CompTIA</ExternalLink> offers Security+, a widely recognized foundational
          certification. Check each organization’s official page for current requirements, recommended experience and costs
          before choosing.
        </p>
        <Figure imageKey="roadmap" />
        <Takeaway>You don’t have to learn everything. You need to learn the right things in the right order.</Takeaway>
        <InlineCta
          slug={SLUG}
          placement="soft-after-roadmap"
          text="Not sure what to learn first? Explore Dr. Cyber’s beginner course."
          buttonLabel="Explore the beginner course"
        />
      </ArticleSection>

      <ArticleSection id="ninety-day-plan" title="A Simple 90-Day Cybersecurity Learning Plan">
        <DirectAnswer>Spend three months on fundamentals, then security foundations, then practice, which builds beginner knowledge but not job readiness.</DirectAnswer>
        <SubHeading>Days 1–30: Computer Fundamentals</SubHeading>
        <p>Focus on basic computing, operating systems, how the internet works, user accounts and simple troubleshooting. Aim to explain, in your own words, what happens when you sign in to a website.</p>
        <SubHeading>Days 31–60: Cybersecurity Foundations</SubHeading>
        <p>Learn common threats, strong passwords and password managers, access controls, identity protection and core security concepts. Try describing each threat with an everyday analogy.</p>
        <SubHeading>Days 61–90: Practice and Career Exploration</SubHeading>
        <p>Use authorized practice labs, start a learning portfolio, research roles that interest you and decide on your next training step.</p>
        <Figure imageKey="plan90Day" />
        <p>
          Be clear about what this plan is: it builds a foundation. It does not guarantee job readiness, employment or
          certification.
        </p>
        <InlineCta
          slug={SLUG}
          placement="contextual-after-90-day-plan"
          text="Start building your cybersecurity foundation for $29 USD."
          buttonLabel="See the beginner course"
        />
      </ArticleSection>

      <ArticleSection id="career-switch" title="Can You Switch to Cybersecurity From a Completely Different Career?">
        <DirectAnswer>Yes. Many career changers do, and the skills from your previous work often transfer.</DirectAnswer>
        <p className="text-xl font-semibold text-[#101C42]">Your previous career might be an advantage, not an obstacle.</p>
        <ul className="list-disc space-y-2 pl-6">
          <li><strong>Teacher:</strong> communication and training, valuable for security awareness.</li>
          <li><strong>Healthcare professional:</strong> confidentiality and careful documentation.</li>
          <li><strong>Customer service representative:</strong> problem-solving and communication under pressure.</li>
          <li><strong>Accountant:</strong> precision, audits and policy awareness, useful in compliance.</li>
        </ul>
        <Figure imageKey="transferableSkills" />
        <p>
          Transferable skills complement technical training; they do not replace it. You will still need to learn the
          technology, but you start with strengths employers value. Age is not the barrier here: people explore this switch in
          their 30s, 40s and beyond, and the same learning roadmap applies.
        </p>
      </ArticleSection>

      <ArticleSection id="beginner-mistakes" title="Five Mistakes Cybersecurity Beginners Should Avoid">
        <ol className="list-decimal space-y-3 pl-6">
          <li><strong>Assuming cybersecurity is only hacking.</strong> It also includes defence, risk, compliance and training.</li>
          <li><strong>Buying expensive courses too early.</strong> Start with affordable, trusted resources and build a foundation first.</li>
          <li><strong>Collecting certifications without practical knowledge.</strong> Employers value what you can do, so practise in labs and projects.</li>
          <li><strong>Expecting an immediate high salary.</strong> Build experience step by step, and earning potential can grow.</li>
          <li><strong>Trying to learn everything at once.</strong> Follow a clear plan and learn in small steps.</li>
        </ol>
        <Figure imageKey="beginnerMistakes" />
        <Takeaway>The smartest first investment isn’t necessarily the most expensive course. It’s learning enough to choose your next step confidently.</Takeaway>
      </ArticleSection>

      <ArticleSection id="where-to-begin" title="Where Should You Begin?">
        <p>
          If terms like <em>networking</em>, <em>firewalls</em>, <em>encryption</em> and <em>cloud security</em> make your head
          spin, you’re normal. Beginners often feel overwhelmed because they meet dozens of unfamiliar words at once, with no
          order to learn them in.
        </p>
        <p>A structured pathway changes that. When each concept builds on the last, the field stops looking like a wall of jargon and starts looking like a sequence of manageable steps.</p>
        <Figure imageKey="learningTransformation" />
        <p>
          If you’d like help seeing which direction fits you, Dr. Cyber’s <InternalLink href="/quiz">career pathway quiz</InternalLink>{" "}
          is a quick place to start, and our affordable beginner course is designed for exactly this stage.
        </p>
      </ArticleSection>

      <ArticleSection id="dr-cyber-course" title="Start Your Cybersecurity Learning Journey With Dr. Cyber">
        <CourseOfferCard slug={SLUG} />
        <SourceNote>
          Educational training does not guarantee employment, certification or income. Browse all <InternalLink href="/courses">Dr. Cyber courses</InternalLink>.
        </SourceNote>
      </ArticleSection>

      <FaqSectionSlot />

      <ArticleSection id="conclusion" title="Your Next Step">
        <Figure imageKey="closingPath" />
        <p>You don’t have to change your entire career today. Start by learning what cybersecurity is, discover which opportunities interest you, and take one manageable step forward.</p>
        <PrimaryCta slug={SLUG} />
        <SourceNote>
          Disclaimer: this article is educational. It does not guarantee employment, certification or income. Salary and
          outlook figures describe occupations, not outcomes for individual learners.
        </SourceNote>
      </ArticleSection>
    </>
  );
}

// The FAQ renders from `faqs` so visible content and data stay in sync.
function FaqSectionSlot() {
  return (
    <ArticleSection id="faq" title="Frequently Asked Questions About Cybersecurity Careers">
      <Faq faqs={faqs} />
    </ArticleSection>
  );
}

export const post: BlogPost = {
  meta: {
    slug: SLUG,
    title: "How to Start a Cybersecurity Career With No IT Experience (2026 Beginner’s Guide)",
    seoTitle: "Cybersecurity Career With No Experience: 2026 Guide",
    description:
      "No IT experience? Learn how to start a cybersecurity career, explore beginner-friendly jobs, discover essential skills, and follow a practical roadmap.",
    standfirst:
      "A realistic, plain-English roadmap for non-technical adults thinking about a career change into IT or cybersecurity.",
    category: "Cybersecurity Careers",
    author: {
      name: "Dr. Cyber",
      url: MARKETING_SITE_URL,
      bio: "Dr. Cyber publishes beginner-friendly guides and courses for adults exploring a career change into IT and cybersecurity."
    },
    publishedAt: "2026-11-07",
    modifiedAt: "2026-11-07",
    readingMinutes: 12,
    status: "draft",
    heroImageKey: "hero",
    keywords: [
      "how to start a cybersecurity career with no experience",
      "cybersecurity for beginners",
      "career change to cybersecurity",
      "entry-level cybersecurity jobs",
      "cybersecurity career roadmap"
    ]
  },
  toc,
  faqs,
  sources,
  Body
};
