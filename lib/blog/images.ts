import type { BlogImage } from "./types";

const base = "/images/blog";
const size = { width: 1672, height: 941 } as const;

/**
 * Every article image, keyed by role. A figure whose file has not been uploaded
 * yet renders nothing (see components/blog/Figure.tsx) instead of a broken image.
 */
export const blogImages = {
  hero: {
    src: `${base}/start-cybersecurity-career-no-it-experience-hero.webp`,
    alt: "Three career changers from different professions looking toward a future in cybersecurity.",
    ...size
  },
  beginnerConfidence: {
    src: `${base}/adult-learning-cybersecurity-at-home.webp`,
    alt: "An adult beginner studying cybersecurity on a laptop at home.",
    ...size
  },
  homeSecurityAnalogy: {
    src: `${base}/home-security-vs-cybersecurity-analogy.webp`,
    alt: "Comparison of home security and cybersecurity: door locks match passwords, cameras match monitoring and alarms match security alerts.",
    ...size
  },
  healthcarePhishing: {
    src: `${base}/healthcare-worker-reviewing-suspicious-email.webp`,
    alt: "A healthcare worker reviewing a suspicious email that pretends to come from IT support and asks for a password.",
    ...size
  },
  careerOutlook: {
    src: `${base}/cybersecurity-career-growth-outlook.webp`,
    alt: "Infographic of projected employment growth for information security analysts, based on U.S. Bureau of Labor Statistics data.",
    ...size
  },
  industries: {
    src: `${base}/industries-that-need-cybersecurity.webp`,
    alt: "Healthcare, banking, e-commerce and government shown around a central security shield.",
    ...size
  },
  noCoding: {
    src: `${base}/coding-vs-non-coding-cybersecurity-roles.webp`,
    alt: "Cybersecurity is not just coding: non-coding security roles that monitor, review, plan, train and ensure compliance, beside technical roles that work with code, tools and systems, both built on people, processes, technology and protection.",
    ...size
  },
  careerPaths: {
    src: `${base}/five-beginner-cybersecurity-career-paths.webp`,
    alt: "Five beginner cybersecurity career paths: IT help desk and technical support, junior SOC analyst, security compliance and GRC assistant, security awareness coordinator, and vulnerability management assistant, each with a one-line description.",
    ...size
  },
  salary: {
    src: `${base}/cybersecurity-salary-us-vs-canada.webp`,
    alt: "Salary outlook infographic: U.S. information security analysts, US$129,180 median annual wage; Canadian cybersecurity specialists, CA$49.52 median hourly wage; labelled occupational medians, not beginner salaries.",
    ...size
  },
  roadmap: {
    src: `${base}/cybersecurity-career-roadmap-for-beginners.webp`,
    alt: "Seven-step cybersecurity career roadmap covering computer basics, networking, security threats, safe practice, certifications, portfolio building and job applications.",
    ...size
  },
  plan90Day: {
    src: `${base}/90-day-cybersecurity-learning-plan.webp`,
    alt: "90-day cybersecurity learning timeline: Month 1 computer fundamentals, Month 2 cybersecurity protection, Month 3 hands-on practice and career exploration.",
    ...size
  },
  transferableSkills: {
    src: `${base}/transferable-skills-for-cybersecurity-career-change.webp`,
    alt: "Four professions — teaching, healthcare, customer service and accounting — and the transferable skills each brings to a cybersecurity career: communication, confidentiality, problem-solving and precision.",
    ...size
  },
  beginnerMistakes: {
    src: `${base}/common-cybersecurity-beginner-mistakes.webp`,
    alt: "Five common beginner mistakes in cybersecurity learning, each paired with a better approach: it is not only hacking, avoid expensive courses too early, build skills not just certificates, be realistic about salary, and follow a clear plan.",
    ...size
  },
  learningTransformation: {
    src: `${base}/confusion-to-confidence-learn-cybersecurity.webp`,
    alt: "Before and after: a learner overwhelmed by terms like TCP/IP, firewall, VPN, SIEM and IAM, then a confident learner following four steps — build foundations, learn core security, practice real skills, get certified and prepare for jobs.",
    ...size
  },
  courseOffer: {
    src: `${base}/dr-cyber-beginner-course-learning-dashboard.webp`,
    alt: "Laptop showing a beginner learning dashboard with a progress bar and six topic tiles, beside books, a security shield, a checklist notebook and a mountain-summit path.",
    ...size
  },
  closingPath: {
    src: `${base}/closing-career-path-cybersecurity-career-changer.webp`,
    alt: "A smiling career changer with a backpack looks toward a glowing path with four milestones — Learn Fundamentals, Build Core Skills, Hands-On Practice and Prepare for Opportunities — leading to a modern security workplace.",
    ...size
  }
} satisfies Record<string, BlogImage>;

export type BlogImageKey = keyof typeof blogImages;
