import "server-only";
import { fingerprint } from "@/lib/research-bundle";
import type { ResearchReviewPackage } from "@/lib/research-review";

type ReviewPackage = ResearchReviewPackage;
type Issue = { path: string; code: string };
const reviewOutcomes = ["acceptable", "changes_required", "outside_expertise", "reject"];

// This is a response to an immutable package, not an editable copy of that
// package. Review text and identities never become scientific approval by code.
export function createReviewSubmission(review: ReviewPackage) {
  return {
    format: "mira-editorial-response", version: 1,
    packageFingerprint: fingerprint(review),
    instructions: "Complete only checks within your expertise. Use acceptable, changes_required, outside_expertise or reject. Keep unknown fields null. Supply source locators and requested changes, not just a tick. A complete response is ready for an editorial decision, never automatic publication. Do not enter family or child data.",
    reviewers: [{ id: "reviewer-1", name: null, qualifications: null, relevantExpertise: null, conflictsOfInterest: null }],
    sources: review.sources.map(source => ({
      sourceId: source.id, sourceFingerprint: fingerprint(source),
      reviewerId: null, checkedOn: null, reviewDueOn: null,
      access: null, appraisal: null, limitations: null, rightsAssessment: null,
    })),
    primitives: review.primitives.map(item => ({
      primitiveId: item.primitive.id, contentFingerprint: item.contentFingerprint,
      decision: null, decisionReviewerId: null, reviewedOn: null, reviewDueOn: null,
      // Explicit indices prevent a review of one draft being applied to both.
      draftIndices: [], ageMonths: { minimum: null, maximum: null },
      readinessAndExclusions: null, languageVarieties: [],
      checks: item.checks.map(check => ({ id: check.id, reviewerId: null, outcome: null, evidence: null, requiredChanges: null })),
    })),
  };
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function date(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
function language(value: unknown) {
  if (typeof value !== "string" || value.length > 60 || !/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(value)) return null;
  try { return new Intl.Locale(value).toString(); } catch { return null; }
}

export function assessReviewSubmission(input: unknown, review: ReviewPackage, today = new Date().toISOString().slice(0, 10)) {
  if (!date(today)) throw new Error("Invalid assessment date");
  const issues: Issue[] = [];
  const add = (path: string, code: string) => issues.push({ path, code });
  const fields = (value: unknown, path: string, keys: string[]): value is Record<string, unknown> => {
    if (!record(value)) { add(path, "invalid_object"); return false; }
    for (const key of keys) if (!Object.hasOwn(value, key)) add(`${path}.${key}`, "missing_field");
    if (Object.keys(value).some(key => !keys.includes(key))) add(path, "unexpected_field");
    return true;
  };
  const text = (value: unknown, path: string, max = 6000) => {
    if (typeof value !== "string" || !value.trim() || value.length > max) add(path, "required_bounded_text");
  };
  const dates = (checked: unknown, due: unknown, path: string, field = "checkedOn") => {
    if (!date(checked) || checked > today) add(`${path}.${field}`, "invalid_or_future_review_date");
    if (!date(due) || due < today || (date(checked) && due < checked)) add(`${path}.reviewDueOn`, "missing_or_expired_due_date");
  };
  const list = (value: unknown, path: string, max: number): unknown[] => {
    if (!Array.isArray(value) || value.length > max) { add(path, "invalid_list"); return []; }
    return value;
  };
  const base = {
    format: "mira-editorial-intake-result", version: 1,
    packageFingerprint: fingerprint(review), publicationAllowed: false, schedulable: false,
    identityVerified: false, substantiveReviewVerified: false,
    remainingReleaseGates: [
      "Verify reviewer identity, expertise and independence outside this structural checker.",
      "Resolve findings, prepare a complete activity template and review that exact release version.",
      "Enforce required family material, environment, readiness and supervision context before scheduling.",
      "Obtain a separate authorized editorial publication decision; this intake cannot publish.",
    ],
    // No input text is echoed into logs/results; completed submissions remain
    // separate confidential editorial records, not family-facing claims.
    issues, primitives: [] as Array<{ primitiveId: string; draftIndices: number[]; state: string; issues: Issue[] }>,
  };
  if (!fields(input, "$", ["format", "version", "packageFingerprint", "instructions", "reviewers", "sources", "primitives"])) return { ...base, state: "blocked" };
  if (input.format !== "mira-editorial-response" || input.version !== 1) add("$", "unsupported_format");
  if (input.packageFingerprint !== base.packageFingerprint) add("$.packageFingerprint", "stale_package");
  if (input.instructions !== createReviewSubmission(review).instructions) add("$.instructions", "changed_instructions");
  const reviewers = new Map<string, boolean>();
  for (const [index, item] of list(input.reviewers, "$.reviewers", 30).entries()) {
    const path = `$.reviewers[${index}]`; const before = issues.length;
    if (!fields(item, path, ["id", "name", "qualifications", "relevantExpertise", "conflictsOfInterest"])) continue;
    const id = typeof item.id === "string" && /^[a-z0-9][a-z0-9-]{0,59}$/.test(item.id) ? item.id : null;
    if (!id || reviewers.has(id)) { add(`${path}.id`, "invalid_or_duplicate_reviewer"); continue; }
    for (const key of ["name", "qualifications", "relevantExpertise", "conflictsOfInterest"]) text(item[key], `${path}.${key}`, 2000);
    reviewers.set(id, before === issues.length);
  }
  if (!reviewers.size) add("$.reviewers", "reviewer_required");
  const reviewer = (id: unknown, path: string) => {
    if (typeof id !== "string" || reviewers.get(id) !== true) add(path, "missing_or_incomplete_reviewer");
  };
  const sources = new Map<string, { complete: boolean; checkedOn: unknown }>();
  for (const [index, item] of list(input.sources, "$.sources", review.sources.length).entries()) {
    const path = `$.sources[${index}]`; const before = issues.length;
    if (!fields(item, path, ["sourceId", "sourceFingerprint", "reviewerId", "checkedOn", "reviewDueOn", "access", "appraisal", "limitations", "rightsAssessment"])) continue;
    const source = review.sources.find(source => source.id === item.sourceId);
    if (!source || sources.has(source.id)) { add(`${path}.sourceId`, "unknown_or_duplicate_source"); continue; }
    if (item.sourceFingerprint !== fingerprint(source)) add(`${path}.sourceFingerprint`, "stale_source");
    reviewer(item.reviewerId, `${path}.reviewerId`); dates(item.checkedOn, item.reviewDueOn, path);
    if (item.access !== "full_relevant_material_appraised") add(`${path}.access`, "source_appraisal_incomplete");
    for (const key of ["appraisal", "limitations", "rightsAssessment"]) text(item[key], `${path}.${key}`);
    sources.set(source.id, { complete: before === issues.length, checkedOn: item.checkedOn });
  }
  // A partial submission may deliberately cover only one primitive and its
  // sources. Omitted primitives stay unreviewed; no blanket approval is inferred.
  const seen = new Set<string>();
  const globalBlocking = issues.filter(issue => issue.path === "$" || issue.path.startsWith("$.packageFingerprint") || issue.path === "$.instructions" || issue.code === "unexpected_field" || issue.code.includes("duplicate") || issue.code === "invalid_list");
  const items = list(input.primitives, "$.primitives", review.primitives.length);
  if (!items.length) add("$.primitives", "primitive_review_required");
  for (const [index, item] of items.entries()) {
    const path = `$.primitives[${index}]`; const before = issues.length;
    if (!fields(item, path, ["primitiveId", "contentFingerprint", "decision", "decisionReviewerId", "reviewedOn", "reviewDueOn", "draftIndices", "ageMonths", "readinessAndExclusions", "languageVarieties", "checks"])) continue;
    const original = review.primitives.find(p => p.primitive.id === item.primitiveId);
    if (!original || seen.has(original.primitive.id)) { add(`${path}.primitiveId`, "unknown_or_duplicate_primitive"); continue; }
    seen.add(original.primitive.id);
    if (item.contentFingerprint !== original.contentFingerprint) add(`${path}.contentFingerprint`, "stale_content");
    if (!original.generation || original.generation.status !== "unreviewed_ai_draft" || !original.generation.drafts.length) add(path, "no_assessable_drafts");
    if (item.decision !== "ready_for_editorial_decision") add(`${path}.decision`, "not_recommended_for_editorial_decision");
    reviewer(item.decisionReviewerId, `${path}.decisionReviewerId`); dates(item.reviewedOn, item.reviewDueOn, path, "reviewedOn");
    if (date(item.reviewedOn) && original.generation && item.reviewedOn < original.generation.generatedAt.slice(0,10)) add(`${path}.reviewedOn`, "review_predates_content");
    const indices = list(item.draftIndices, `${path}.draftIndices`, original.generation?.drafts.length ?? 0);
    if (!indices.length || new Set(indices).size !== indices.length || indices.some(n => typeof n !== "number" || !Number.isInteger(n) || n < 0 || n >= (original.generation?.drafts.length ?? 0))) add(`${path}.draftIndices`, "invalid_or_missing_draft_selection");
    if (fields(item.ageMonths, `${path}.ageMonths`, ["minimum", "maximum"])) {
      const { minimum, maximum } = item.ageMonths;
      if (typeof minimum !== "number" || typeof maximum !== "number" || !Number.isInteger(minimum) || !Number.isInteger(maximum) || minimum < 0 || maximum > 83 || minimum > maximum) add(`${path}.ageMonths`, "invalid_reviewed_age_range");
    }
    text(item.readinessAndExclusions, `${path}.readinessAndExclusions`);
    const languages = list(item.languageVarieties, `${path}.languageVarieties`, 40).map(language);
    if (!languages.length || languages.includes(null) || new Set(languages).size !== languages.length) add(`${path}.languageVarieties`, "invalid_or_missing_language_review");
    const checks = new Set<string>();
    for (const [checkIndex, check] of list(item.checks, `${path}.checks`, original.checks.length).entries()) {
      const checkPath = `${path}.checks[${checkIndex}]`;
      if (!fields(check, checkPath, ["id", "reviewerId", "outcome", "evidence", "requiredChanges"])) continue;
      if (typeof check.id !== "string" || !original.checks.some(c => c.id === check.id) || checks.has(check.id)) { add(`${checkPath}.id`, "unknown_or_duplicate_check"); continue; }
      checks.add(check.id); reviewer(check.reviewerId, `${checkPath}.reviewerId`);
      if (typeof check.outcome !== "string" || !reviewOutcomes.includes(check.outcome) || check.outcome !== "acceptable") add(`${checkPath}.outcome`, "unresolved_review_check");
      text(check.evidence, `${checkPath}.evidence`);
      if (check.requiredChanges !== null) add(`${checkPath}.requiredChanges`, "unresolved_changes");
    }
    if (checks.size !== original.checks.length) add(`${path}.checks`, "missing_review_checks");
    const requiredSourceIds = new Set([...original.primitive.claimIds.flatMap(id => review.claims.find(c => c.id === id)?.sourceIds ?? []), ...(original.authoringSourceIds ?? [])]);
    for (const sourceId of requiredSourceIds) {
      const source = sources.get(sourceId);
      if (source?.complete !== true) add(`${path}.sources.${sourceId}`, "linked_source_review_incomplete");
      if (date(source?.checkedOn) && date(item.reviewedOn) && source.checkedOn > item.reviewedOn) add(`${path}.sources.${sourceId}`, "content_review_predates_source_appraisal");
    }
    const ownIssues = issues.slice(before);
    base.primitives.push({ primitiveId: original.primitive.id, draftIndices: indices.filter((n): n is number => typeof n === "number" && Number.isInteger(n)), state: ownIssues.length || globalBlocking.length ? "blocked" : "ready_for_editorial_decision", issues: ownIssues });
  }
  // Unknown/duplicate records anywhere invalidate the entire response rather
  // than allowing an apparently good preceding item through a malformed file.
  const structuralError = issues.some(issue => ["unexpected_field", "invalid_list", "invalid_object", "missing_field"].includes(issue.code) || issue.code.includes("duplicate"));
  if (structuralError) for (const item of base.primitives) item.state = "blocked";
  return { ...base, state: issues.length ? "blocked_or_partial" : "ready_for_editorial_decision", missingPrimitiveIds: review.primitives.filter(p => !seen.has(p.primitive.id)).map(p => p.primitive.id) };
}
