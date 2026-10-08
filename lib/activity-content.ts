import type { PreparationTemplate } from "@/components/activity-preparation";
import { parsePublicationContext } from "@/lib/activity-publication-context";
import { parseActivityEvidence } from "@/lib/activity-evidence";
import { contextDatePlus, isContextDate, parseContextAnswers, parseContextContract, sameContextContract, type SavedFamilyContext } from "@/lib/activity-context";

export type SavedTemplate = PreparationTemplate & { id: string; title: string; instructions: string; summary: string };
export function savedActivityContent(value: unknown, templateId: string | null): {
  template: SavedTemplate | null; state: "saved" | "legacy" | "invalid" | "open";
} {
  if (templateId === null) return { template: null, state: "open" };
  if (value === null || value === undefined) return { template: null, state: "legacy" };
  const invalid = { template: null, state: "invalid" as const };
  if (typeof value !== "object" || Array.isArray(value)) return invalid;
  const snapshot = value as Record<string, unknown>;
  if ((snapshot.schema_version !== 1 && snapshot.schema_version !== 2) || !snapshot.template || typeof snapshot.template !== "object" || Array.isArray(snapshot.template)) return invalid;
  const evidence = snapshot.schema_version === 2 ? parseActivityEvidence(snapshot.evidence, templateId) : null;
  if (snapshot.schema_version === 2 && !evidence) return invalid;
  const t = snapshot.template as Record<string, unknown>;
  if (t.publication_context !== null && t.publication_context !== undefined && !parsePublicationContext(t.publication_context)) return invalid;
  let familyContext: SavedFamilyContext | null = null;
  if (t.context_requirements !== null && t.context_requirements !== undefined) {
    const contract = parseContextContract(t.context_requirements);
    const c = snapshot.family_context as Record<string, unknown> | null;
    if (!contract || !c || typeof c !== "object" || Array.isArray(c) || c.template_id !== templateId
      || c.content_version !== t.content_version || !isContextDate(c.valid_from) || !isContextDate(c.valid_until)
      || c.valid_until < c.valid_from || !Number.isInteger(c.revision) || Number(c.revision) < 1) return invalid;
    const reportedContract = parseContextContract(c.contract);
    if (!reportedContract || !sameContextContract(contract, reportedContract)
      || c.valid_until > contextDatePlus(c.valid_from, contract.max_valid_days - 1)) return invalid;
    const answers = parseContextAnswers(c.answers, contract);
    if (!answers) return invalid;
    familyContext = { contract, answers, valid_from: c.valid_from, valid_until: c.valid_until };
  }
  if (t.id !== templateId || !Number.isInteger(t.content_version) || Number(t.content_version) < 1) return invalid;
  if (typeof snapshot.selected_at !== "string" || !Number.isFinite(Date.parse(snapshot.selected_at))
    || !snapshot.review || typeof snapshot.review !== "object" || Array.isArray(snapshot.review)) return invalid;
  const review = snapshot.review as Record<string, unknown>;
  if (review.content_version !== t.content_version || typeof review.reviewed_at !== "string"
    || !Number.isFinite(Date.parse(review.reviewed_at)) || typeof review.review_due_on !== "string"
    || !/^\d{4}-\d{2}-\d{2}$/.test(review.review_due_on)) return invalid;
  const strings = ["title", "instructions", "summary", "domain", "cleanup_level", "parent_preparation", "adult_role", "conversation_prompt", "look_for", "child_choices", "make_easier", "extend_activity", "stop_signals", "avoid_prompt", "safety_note", "supervision_level", "why_it_matters", "source_note", "review_status"];
  if (strings.some(key => typeof t[key] !== "string")) return invalid;
  if (["duration_minutes", "setup_minutes"].some(key => !Number.isInteger(t[key]) || Number(t[key]) < 0)) return invalid;
  if (["materials", "observation_prompts", "support_ladder", "hazards"].some(key => !Array.isArray(t[key]) || (t[key] as unknown[]).some(item => typeof item !== "string"))) return invalid;
  // Linked capability/track labels have not yet been version-reviewed with the
  // template. Do not reattach today's mutable joins as historical evidence.
  return { state: "saved", template: { ...t, familyContext, sourceClaims: evidence, activity_template_capabilities: [], activity_template_tracks: [] } as unknown as SavedTemplate };
}

export function activityUseMessage(reason: string | null, failed = false) {
  if (failed) return "MIRA could not check whether this activity is still eligible. You can read the saved record, but it is not being offered as a current recommendation. Try again later.";
  if (reason === null) return null;
  if (reason === "MIRA_CONTEXT_REQUIRED" || reason === "MIRA_CONTEXT_NOT_CONFIRMED") return "The required family-context answers are missing, expired or no longer confirmed for this date. Keep this as a saved record; check materials and family context in Library before offering it.";
  if (reason === "MIRA_CONTEXT_REQUIREMENTS_UNREVIEWED") return "The activity’s context requirements need review. Your answers cannot approve a missing review; these instructions are kept as history, not a current recommendation.";
  if (reason === "MIRA_LEGACY_CONTENT_VERSION_UNKNOWN") return "This older activity has no saved template version. Its original text is kept below; today's library notes have not been substituted. It is not a currently verified recommendation.";
  if (reason === "MIRA_SAVED_CONTENT_CHANGED") return "The library entry changed after this activity was selected. These are the saved instructions, not the updated entry. Choose a currently reviewed alternative before offering it again.";
  return "This saved activity does not pass the current review, age or family-capacity checks. Keep it as a record; choose another reviewed option or leave the day open.";
}
