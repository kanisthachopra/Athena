import "server-only";
import { fingerprint } from "@/lib/research-bundle";
import { createReviewSubmission, assessReviewSubmission } from "@/lib/research-review-intake";
import { parseContextContract } from "@/lib/activity-context";
import type { ResearchReviewPackage } from "@/lib/research-review";

type ReviewPackage = ResearchReviewPackage;
type Issue = { path: string; code: string };
const instructions = "Unpublished authoring candidate, not instructions for families. Complete missing fields and resolve the original drafting findings. Source links support only the stated general mechanism. Review the entire completed candidate, including questions, variations and associations. No field here approves or publishes content. Do not add family or child data.";
const reviewInstructions = "Review the complete release candidate identified by candidateFingerprint, not just its original AI invitation. Every check covers the final wording, materials, context questions, variations and associations. The embedded response retains source appraisal and reviewer evidence. Complete paperwork does not verify the reviewer or authorize publication.";
const textFields = ["title", "summary", "instructions", "conversation_prompt", "look_for", "why_it_matters", "safety_note", "parent_preparation", "adult_role", "child_choices", "make_easier", "extend_activity", "stop_signals", "avoid_prompt", "source_note"] as const;
const listFields = ["materials", "setting", "support_ladder", "observation_prompts", "hazards"] as const;
const enums = {
  domain: ["language", "movement", "sensory", "maths", "creative", "life_skills", "nature"],
  experience_type: ["embedded", "intentional"], cleanup_level: ["none", "low", "medium", "high"],
  cost_level: ["none", "low", "medium", "high"], caregiver_skill_level: ["none", "basic", "confident"],
  screen_requirement: ["none", "optional", "required"], energy_level: ["quiet", "low", "active"],
  supervision_level: ["ordinary", "nearby", "continuous"],
} as const;
const capabilityCodes = ["relationships_attachment", "emotional_regulation", "communication_language", "physical_motor", "cognition_problem_solving", "executive_function", "curiosity_play_creativity", "independence_practical", "social_participation"];
const trackCodes = ["languages", "literacy_literature", "mathematics", "science_nature", "general_knowledge", "history_culture", "geography", "art_design", "music", "physical_pursuits", "making_practical", "technology_computation", "ethics_philosophy", "leadership_biographies"];
const templateKeys = [...textFields, ...listFields, ...Object.keys(enums), "min_age_months", "max_age_months", "duration_minutes", "setup_minutes", "context_requirements"];

function object(x: unknown): x is Record<string, unknown> { return x !== null && typeof x === "object" && !Array.isArray(x); }
function language(x: unknown): string | null {
  if (typeof x !== "string" || x.length > 60 || !/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(x)) return null;
  try { return new Intl.Locale(x).toString(); } catch { return null; }
}
function target(review: ReviewPackage, primitiveId: unknown, draftIndex: unknown) {
  const item = review.primitives.find(item => item.primitive.id === primitiveId);
  if (!item || item.generation?.status !== "unreviewed_ai_draft" || typeof draftIndex !== "number" || !Number.isInteger(draftIndex) || draftIndex < 0 || !item.generation.drafts[draftIndex]) return null;
  return { item, draft: item.generation.drafts[draftIndex], draftIndex };
}

// Copy only actual draft text/provenance. Unknown requirements stay null instead
// of inheriting the permissive defaults in legacy activity-template migrations.
export function createActivityReleaseDraft(review: ReviewPackage, primitiveId: string, draftIndex: number) {
  const selected = target(review, primitiveId, draftIndex);
  if (!selected) throw new Error("A current, non-quarantined draft is required");
  const { item, draft } = selected;
  return {
    format: "mira-activity-release-candidate", version: 1, instructions,
    origin: { packageFingerprint: fingerprint(review), primitiveId, contentFingerprint: item.contentFingerprint, draftIndex },
    authoring: { languageVariety: null, readiness: null, exclusions: null, changesFromDraft: null, unresolvedFindings: null },
    template: {
      ...Object.fromEntries(templateKeys.map(key => [key, null])),
      title: draft.title, instructions: draft.invitation, conversation_prompt: draft.caregiverWords, look_for: draft.observation,
    },
    // Labels are reviewable associations, not claimed child outcomes. Empty
    // tracks may be appropriate; null means the author has not decided yet.
    associations: { capabilities: null, tracks: null },
    claims: draft.claimIds.map(id => {
      const claim = review.claims.find(c => c.id === id);
      if (!claim) throw new Error("Missing source claim");
      return { claimId: id, claimFingerprint: fingerprint(claim), sourceIds: [...claim.sourceIds],
        wording: claim.text, applicability: claim.scope, notSupported: claim.notSupported, support: "general_mechanism" };
    }),
    personalization: "none",
  };
}

export function assessActivityReleaseCandidate(input: unknown, review: ReviewPackage) {
  const issues: Issue[] = [];
  const add = (path: string, code: string) => issues.push({ path, code });
  const fields = (x: unknown, path: string, keys: readonly string[]): x is Record<string, unknown> => {
    if (!object(x)) { add(path, "invalid_object"); return false; }
    if (Object.keys(x).length !== keys.length || keys.some(k => !Object.hasOwn(x, k))) add(path, "missing_or_unexpected_fields");
    return true;
  };
  const text = (x: unknown, path: string, max = 4000) => {
    if (typeof x !== "string" || !x.trim() || x.length > max) add(path, "required_bounded_text");
  };
  const integer = (x: unknown, path: string, min: number, max: number) => {
    if (typeof x !== "number" || !Number.isInteger(x) || x < min || x > max) add(path, "invalid_integer");
  };
  const list = (x: unknown, path: string, max: number): unknown[] => {
    if (!Array.isArray(x) || x.length > max) { add(path, "invalid_list"); return []; } return x;
  };
  const finish = () => ({ format: "mira-activity-release-assessment", version: 1,
    state: issues.length ? "needs_authoring" : "ready_for_exact_version_review",
    candidateFingerprint: fingerprint(input ?? null), publicationAllowed: false, schedulable: false, issues });
  if (!fields(input, "$", ["format", "version", "instructions", "origin", "authoring", "template", "associations", "claims", "personalization"])) return finish();
  if (input.format !== "mira-activity-release-candidate" || input.version !== 1 || input.instructions !== instructions) add("$", "unsupported_or_changed_envelope");
  if (input.personalization !== "none") add("$.personalization", "unreviewed_personalization_policy");
  let selected: ReturnType<typeof target> = null;
  if (fields(input.origin, "$.origin", ["packageFingerprint", "primitiveId", "contentFingerprint", "draftIndex"])) {
    selected = target(review, input.origin.primitiveId, input.origin.draftIndex);
    if (!selected || input.origin.packageFingerprint !== fingerprint(review) || input.origin.contentFingerprint !== selected.item.contentFingerprint) add("$.origin", "stale_or_unassessable_origin");
  }
  if (fields(input.authoring, "$.authoring", ["languageVariety", "readiness", "exclusions", "changesFromDraft", "unresolvedFindings"])) {
    if (!language(input.authoring.languageVariety) || language(input.authoring.languageVariety) !== input.authoring.languageVariety) add("$.authoring.languageVariety", "canonical_language_variety_required");
    for (const key of ["readiness", "exclusions", "changesFromDraft"]) text(input.authoring[key], `$.authoring.${key}`);
    // [] is an explicit author declaration, not a verified finding resolution.
    if (!Array.isArray(input.authoring.unresolvedFindings) || input.authoring.unresolvedFindings.length) add("$.authoring.unresolvedFindings", "unresolved_authoring_findings");
  }
  if (fields(input.template, "$.template", templateKeys)) {
    const t = input.template;
    for (const key of textFields) text(t[key], `$.template.${key}`, key === "title" ? 120 : 4000);
    for (const key of listFields) {
      const values = list(t[key], `$.template.${key}`, 30);
      if (["setting", "observation_prompts"].includes(key) && !values.length) add(`$.template.${key}`, "list_must_not_be_empty");
      for (const [i, value] of values.entries()) text(value, `$.template.${key}[${i}]`, 1000);
      if (new Set(values).size !== values.length) add(`$.template.${key}`, "duplicate_values");
    }
    for (const [key, allowed] of Object.entries(enums)) if (!(allowed as readonly unknown[]).includes(t[key])) add(`$.template.${key}`, "invalid_enum");
    integer(t.min_age_months, "$.template.min_age_months", 0, 83); integer(t.max_age_months, "$.template.max_age_months", 0, 83);
    if (typeof t.min_age_months === "number" && typeof t.max_age_months === "number" && t.min_age_months > t.max_age_months) add("$.template", "reversed_age_range");
    integer(t.duration_minutes, "$.template.duration_minutes", 1, 120); integer(t.setup_minutes, "$.template.setup_minutes", 0, 60);
    if (!parseContextContract(t.context_requirements)) add("$.template.context_requirements", "incomplete_context_contract");
  }
  if (fields(input.associations, "$.associations", ["capabilities", "tracks"])) {
    const capabilities = list(input.associations.capabilities, "$.associations.capabilities", capabilityCodes.length);
    if (!capabilities.length) add("$.associations.capabilities", "capability_required");
    const seen = new Set<string>();
    for (const [i, c] of capabilities.entries()) {
      const path = `$.associations.capabilities[${i}]`;
      if (!fields(c, path, ["code", "emphasis", "rationale"])) continue;
      if (typeof c.code !== "string" || !capabilityCodes.includes(c.code) || seen.has(c.code)) add(path, "unknown_or_duplicate_capability");
      else seen.add(c.code);
      if (c.emphasis !== "primary" && c.emphasis !== "supporting") add(path, "invalid_emphasis");
      text(c.rationale, `${path}.rationale`);
    }
    const tracks = list(input.associations.tracks, "$.associations.tracks", trackCodes.length); seen.clear();
    for (const [i, t] of tracks.entries()) {
      const path = `$.associations.tracks[${i}]`;
      if (!fields(t, path, ["code", "rationale"])) continue;
      if (typeof t.code !== "string" || !trackCodes.includes(t.code) || seen.has(t.code)) add(path, "unknown_or_duplicate_track");
      else seen.add(t.code);
      text(t.rationale, `${path}.rationale`);
    }
  }
  const claims = list(input.claims, "$.claims", review.claims.length);
  if (!claims.length) add("$.claims", "claim_required");
  const seen = new Set<string>();
  for (const [i, c] of claims.entries()) {
    const path = `$.claims[${i}]`;
    if (!fields(c, path, ["claimId", "claimFingerprint", "sourceIds", "wording", "applicability", "notSupported", "support"])) continue;
    const original = review.claims.find(item => item.id === c.claimId);
    if (!original || !selected?.draft.claimIds.includes(original.id) || seen.has(original.id)) { add(path, "unknown_or_duplicate_claim"); continue; }
    seen.add(original.id);
    if (c.claimFingerprint !== fingerprint(original)) add(path, "stale_claim");
    if (!Array.isArray(c.sourceIds) || c.sourceIds.length !== original.sourceIds.length || new Set(c.sourceIds).size !== c.sourceIds.length || c.sourceIds.some(id => !original.sourceIds.includes(id))) add(path, "changed_source_links");
    for (const key of ["wording", "applicability", "notSupported"]) text(c[key], `${path}.${key}`, 1600);
    if (c.support !== "general_mechanism") add(path, "unsupported_activity_specific_claim");
  }
  return finish();
}

export function createActivityReleaseReview(input: unknown, review: ReviewPackage) {
  const assessment = assessActivityReleaseCandidate(input, review);
  if (assessment.issues.length) throw new Error("Complete the candidate before requesting final review");
  // Validation above establishes these boundaries, not scientific correctness.
  const c = input as ReturnType<typeof createActivityReleaseDraft>;
  const submission = createReviewSubmission(review);
  const primitives = submission.primitives.filter(p => p.primitiveId === c.origin.primitiveId)
    .map(p => ({ ...p, draftIndices: [c.origin.draftIndex] }));
  const original = review.primitives.find(p => p.primitive.id === c.origin.primitiveId)!;
  const sourceIds = new Set([...original.primitive.claimIds.flatMap(id => review.claims.find(claim => claim.id === id)!.sourceIds), ...(original.authoringSourceIds ?? [])]);
  submission.sources = submission.sources.filter(source => sourceIds.has(source.sourceId));
  return { format: "mira-activity-release-review", version: 1, instructions: reviewInstructions,
    candidateFingerprint: assessment.candidateFingerprint, submission: { ...submission, primitives } };
}

export function assessActivityReleaseReview(input: unknown, response: unknown, review: ReviewPackage, today?: string) {
  const candidate = assessActivityReleaseCandidate(input, review);
  const issues: Issue[] = [...candidate.issues];
  const add = (path: string, code: string) => issues.push({ path, code });
  let intake: ReturnType<typeof assessReviewSubmission> | null = null;
  if (!object(response) || Object.keys(response).sort().join() !== "candidateFingerprint,format,instructions,submission,version") add("$.response", "invalid_review_envelope");
  else {
    if (response.format !== "mira-activity-release-review" || response.version !== 1 || response.instructions !== reviewInstructions) add("$.response", "unsupported_review_envelope");
    if (response.candidateFingerprint !== candidate.candidateFingerprint) add("$.response.candidateFingerprint", "stale_release_review");
    intake = assessReviewSubmission(response.submission, review, today);
    if (intake.state !== "ready_for_editorial_decision") add("$.response.submission", "incomplete_source_or_content_review");
    if (object(input) && object(input.origin) && object(input.template) && object(input.authoring) && object(response.submission)) {
      const selected = Array.isArray(response.submission.primitives) && response.submission.primitives.length === 1 ? response.submission.primitives[0] : null;
      if (!object(selected) || selected.primitiveId !== input.origin.primitiveId || !Array.isArray(selected.draftIndices) || selected.draftIndices.length !== 1 || selected.draftIndices[0] !== input.origin.draftIndex) add("$.response.submission", "wrong_review_target");
      if (!object(selected) || !object(selected.ageMonths) || selected.ageMonths.minimum !== input.template.min_age_months || selected.ageMonths.maximum !== input.template.max_age_months) add("$.response.submission", "reviewed_age_mismatch");
      if (!object(selected) || !Array.isArray(selected.languageVarieties) || selected.languageVarieties.length !== 1 || language(selected.languageVarieties[0]) !== language(input.authoring.languageVariety)) add("$.response.submission", "reviewed_language_mismatch");
    }
  }
  return { format: "mira-activity-release-review-assessment", version: 1,
    state: issues.length ? "blocked" : "ready_for_authorized_editorial_decision",
    candidateFingerprint: candidate.candidateFingerprint, responseFingerprint: fingerprint(response ?? null),
    publicationAllowed: false, schedulable: false, identityVerified: false, substantiveReviewVerified: false,
    issues, intake,
    remainingReleaseGates: ["Verify reviewer identity, expertise, independence and substantive findings.", "Obtain a separate authorized publication decision for this exact candidate and source evidence.", "Import an immutable release with database-verified claim/capability/track associations and reviewed language coverage.", "Apply current family eligibility; a release review is not approval for every child or date."],
  };
}

export function renderActivityReleaseWorksheet(input: unknown, review: ReviewPackage) {
  const assessment = assessActivityReleaseCandidate(input, review);
  if (assessment.issues.length) throw new Error("A complete candidate is required");
  // Plain field traversal, never executable markup/URLs from an authored string.
  const literal = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/([\\`*_{}\[\]#|])/g, "\\$1");
  const lines = ["# MIRA complete activity — exact-version review", "", "Unpublished. Not instructions for families to try.", "", `Candidate fingerprint: ${assessment.candidateFingerprint}`, "", reviewInstructions, ""];
  const walk = (value: unknown, path: string) => {
    if (object(value)) for (const [key, item] of Object.entries(value)) walk(item, path ? `${path}.${key}` : key);
    else if (Array.isArray(value) && value.length) value.forEach((item, i) => walk(item, `${path}[${i}]`));
    else lines.push(`**${literal(path)}**`, "", ...String(Array.isArray(value) ? "Explicitly empty list" : value).split(/\r?\n/).map(line => `> ${literal(line)}`), "");
  };
  walk(input, "candidate");
  const candidate = input as ReturnType<typeof createActivityReleaseDraft>;
  const addedSourceIds = review.primitives.find(item => item.primitive.id === candidate.origin.primitiveId)?.authoringSourceIds ?? [];
  if (addedSourceIds.length) {
    lines.push("## Later authoring sources", "", "These sources were added after generation. They must be independently appraised for this exact release; they do not retroactively support the model output or establish activity efficacy.", "");
    for (const id of addedSourceIds) walk(review.sources.find(source => source.id === id), `authoringSource.${id}`);
  }
  lines.push("## Independent review", "", "Use the companion release response. Check the complete activity above and the source package. Edits change the candidate fingerprint and require fresh review. No content is published by this worksheet.", "");
  return lines.join("\n");
}

/** Transport only. An independently authorized editor must still publish it.
 * Exact JSON strings preserve the existing fingerprint algorithm in PostgreSQL.
 * Full responses contain confidential editorial records, never family UI data.
 */
export function prepareActivityPublication(input: unknown, response: unknown, review: ReviewPackage, today?: string) {
  const result = assessActivityReleaseReview(input, response, review, today);
  if (result.issues.length) throw new Error("A complete exact-version review is required");
  const candidate = input as ReturnType<typeof createActivityReleaseDraft>;
  const original = review.primitives.find(item => item.primitive.id === candidate.origin.primitiveId)!;
  const sourceIds = new Set([...candidate.claims.flatMap(claim => claim.sourceIds), ...(original.authoringSourceIds ?? [])]);
  return {
    format: "mira-activity-publication", version: 1, publicationAllowed: false,
    candidateText: JSON.stringify(input), responseText: JSON.stringify(response),
    sources: review.sources.filter(source => sourceIds.has(source.id)).map(source => JSON.stringify(source)),
  };
}
