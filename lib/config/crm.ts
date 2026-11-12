export const FUNNEL_STAGES = [
  { id: "signed_up", label: "Signed up" },
  { id: "bought_course", label: "Bought a course" },
  { id: "bought_bundle", label: "Bought the bundle" },
  { id: "completed_all", label: "Completed all 12" },
  { id: "booked_1x1", label: "Booked 1x1" },
  { id: "client", label: "Client" }
] as const;

export type FunnelStage = (typeof FUNNEL_STAGES)[number]["id"];

export function stageRank(stage: string) {
  return FUNNEL_STAGES.findIndex((s) => s.id === stage);
}

export function isFunnelStage(value: string): value is FunnelStage {
  return stageRank(value) >= 0;
}

/** The exact wording shown next to the signup checkbox; stored with the consent record as proof. */
export const MARKETING_CONSENT_TEXT =
  "Yes, email me cybersecurity tips, course updates and offers from Dr Cyber. I can unsubscribe at any time.";

export type CtaLevel = "none" | "soft" | "strong";

/** 1x1 call-to-action: soft after the first completed course, strong after the bundle or all courses completed. */
export function ctaLevel(input: { stage: string; completedCourses: number }): CtaLevel {
  if (stageRank(input.stage) >= stageRank("bought_bundle") || stageRank(input.stage) >= stageRank("completed_all")) return "strong";
  if (input.completedCourses >= 1) return "soft";
  return "none";
}
