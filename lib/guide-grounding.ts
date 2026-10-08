export type GuideClaim = { id: string; text: string; title: string; url: string; organisation: string; checkedOn: string; reviewDueOn: string; editorialNotes: string; applicability: string; notSupported: string; evidenceType: string };
export type GuideOption = { id: string; title: string; summary: string; instructions: string; adultRole: string; safety: string; stop: string; materials: string[]; claimIds: string[] };
export type GuideContext = { date: string; options: GuideOption[]; claims: GuideClaim[] };
export const guideStepLabels = {
  read_preparation: "Read the full preparation and safety notes before deciding.",
  leave_open: "Leave the day open; nothing needs to be added or completed.",
  record_observation: "If useful, keep a note of what happened in your own words.",
  review_capacity: "Review your saved weekday and weekend capacity in learning preferences.",
} as const;

export function publicSourceUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2000) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port
      || !url.hostname.includes(".") || /^\[|^[\d.]+$/.test(url.hostname)
      || /(^|\.)(localhost|local|internal|test|invalid)$/.test(url.hostname)) return null;
    return url.href;
  } catch { return null; }
}

export function guideReferenceSelection(value: unknown, context: GuideContext) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Guide reference selection is invalid");
  const result = value as Record<string, unknown>;
  const keys = ["kind", "answer", "activity_ids", "claim_ids", "next_steps"];
  if (Object.keys(result).length !== keys.length || keys.some(key => !Object.hasOwn(result, key))) throw new Error("Unexpected Guide fields");
  if (result.kind === "not_supported") {
    if (result.answer !== "" || ["activity_ids", "claim_ids", "next_steps"].some(key => !Array.isArray(result[key]) || (result[key] as unknown[]).length)) throw new Error("Unsupported response must not introduce advice");
    return { answer: "This question is not covered by the reviewed learning material available to Guide. It will not guess or change your plan.", tryNext: [] as string[], boundary: "Guide is an educational helper, not a developmental or medical assessment.", activities: [] as { id: string; title: string }[], sources: [] as GuideClaim[] };
  }
  if (result.kind !== "grounded") throw new Error("Unknown Guide response kind");
  if (typeof result.answer !== "string") throw new Error("Guide answer missing");
  const answer = result.answer.trim();
  if (!answer || answer.length > 800 || answer.split(/\s+/).length > 120 || !/[.!?]["'’”)]?$/.test(answer)
    || /https?:|www\.|\]\(|<\/?[a-z]/i.test(answer)) throw new Error("Guide answer is incomplete or contains unvalidated links");
  for (const key of ["activity_ids", "claim_ids", "next_steps"]) {
    const list = result[key];
    if (!Array.isArray(list) || (key !== "next_steps" && !list.length) || list.length > (key === "claim_ids" ? 4 : 2)
      || list.some(id => typeof id !== "string") || new Set(list).size !== list.length) throw new Error("Guide references are invalid");
  }
  const activityIds = result.activity_ids as string[], claimIds = result.claim_ids as string[];
  const options = activityIds.map(id => context.options.find(option => option.id === id));
  if (options.some(option => !option)) throw new Error("Guide used an unknown activity");
  if (claimIds.some(id => !context.claims.some(claim => claim.id === id) || !options.some(option => option?.claimIds.includes(id)))
    || options.some(option => !option?.claimIds.some(id => claimIds.includes(id)))) throw new Error("Guide used an unrelated source");
  if ((result.next_steps as string[]).some(step => !Object.hasOwn(guideStepLabels, step))) throw new Error("Guide proposed an unsupported action");
  return {
    answer,
    tryNext: (result.next_steps as (keyof typeof guideStepLabels)[]).map(step => guideStepLabels[step]),
    boundary: "These sources describe general guidance, not proof that a particular activity works for your child. Nothing in your plan has changed.",
    activities: options.map(option => ({ id: option!.id, title: option!.title })),
    sources: claimIds.map(id => context.claims.find(claim => claim.id === id)!),
  };
}
