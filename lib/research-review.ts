import "server-only";
import { catalog } from "@/lib/research-content";
import { fingerprint, validateResearchBundle, type ResearchBatch } from "@/lib/research-bundle";
import type { ResearchCheckpoint } from "@/lib/research-compiler";
import preflight from "@/content/research/preflight-review.json";

const reviewQuestions = [
  ["evidence", "Does each claim accurately reflect the source, population, setting, uncertainty and contrary evidence?"],
  ["applicability", "For which ages and readiness contexts is this exact version appropriate? Specify exclusions; do not assign an age from a broad source alone."],
  ["materials", "Specify permitted materials, dimensions/condition, prohibited substitutions and what must be known before use."],
  ["supervision", "Define adult availability, positioning, setting and accessibility requirements; what unknowns must block scheduling?"],
  ["hazards", "Review choking/ingestion, suffocation, cords, water, falls, sharp/hot/electrical/chemical hazards, allergies, heavy objects, entrapment, roads and animals/plants as applicable."],
  ["autonomy", "Can the child decline, redirect or stop? Are there demands, tests, quotas, pressure or unsupported interpretations?"],
  ["wording", "Are instructions specific, feasible and respectful? Remove invented family facts, medical advice and ambiguous physical directions."],
  ["adaptation", "Define reviewed simpler/extended options and editable wording. No unrestricted physical substitution or safety edit."],
  ["language", "Name the language/variety and reviewers. Are caregiver phrasing and any translations culturally and linguistically appropriate?"],
  ["rights", "Confirm original wording, source attribution and reuse permissions for every external asset or excerpt."],
] as const;

const foundation = { catalog, preflight, validateResearchBundle };
type ReviewSource = {
  catalog: ResearchBatch["catalog"];
  preflight: { catalogVersion: string; checkpointHash: string; reviewType: string; publicationApproved: boolean; findings: Record<string, string> };
  validateResearchBundle: typeof validateResearchBundle;
};

// Dependencies are trusted, statically imported batch modules, never request data.
// The default preserves the original package byte-for-byte for existing reviews.
export function buildResearchReviewPackage(input: unknown, source: ReviewSource = foundation) {
  const { catalog, preflight, validateResearchBundle } = source;
  validateResearchBundle(input, { allowPartial: true });
  if (preflight.catalogVersion !== catalog.version || preflight.checkpointHash !== fingerprint(input) || preflight.publicationApproved !== false) throw new Error("Stale editorial inspection");
  const checkpoint = input as ResearchCheckpoint;
  return {
    format: "mira-editorial-review", version: 1,
    intendedAgeScope: "Birth until the seventh birthday; not a claim of reviewed coverage",
    state: "awaiting_independent_review", publicationAllowed: false,
    instructions: [
      "This package contains unpublished drafts, not instructions for families to try.",
      "Review source material independently. A schema pass, AI assertion or family-owner role is not content approval.",
      "Record reviewer identity/qualifications, date, evidence and requested changes for the exact content fingerprint.",
      "Leave unanswered fields null. After edits, re-review the new version; this file cannot publish content or change plans.",
    ],
    catalogVersion: catalog.version, catalogHash: fingerprint(catalog),
    compilerVersion: checkpoint.compilerVersion,
    sources: catalog.sources, claims: catalog.claims,
    pendingCompilation: catalog.primitives.filter(p => !checkpoint.stacks.some(s => s.primitiveId === p.id)).map(p => p.id),
    primitives: catalog.primitives.map(primitive => {
      const stack = checkpoint.stacks.find(s => s.primitiveId === primitive.id) ?? null;
      return {
        primitive, generation: stack, contentFingerprint: fingerprint({ primitive, stack }),
        preflight: { type: preflight.reviewType, finding: preflight.findings[primitive.id as keyof typeof preflight.findings] ?? "Not inspected", publicationApproved: false },
        reviewer: { name: null, qualifications: null, reviewedAt: null, conflictsOfInterest: null },
        decision: null, approvedAgeMonths: null, reviewedLanguageVarieties: [],
        checks: reviewQuestions.map(([id, question]) => ({ id, question, outcome: null, evidence: null, requiredChanges: null })),
        schedulable: false,
      };
    }),
  };
}

// Later authoring research is separate from the immutable generation record.
// Omitted on foundation packages, preserving their existing fingerprints.
export type ResearchReviewPackage = Omit<ReturnType<typeof buildResearchReviewPackage>, "primitives"> & {
  primitives: Array<ReturnType<typeof buildResearchReviewPackage>["primitives"][number] & { authoringSourceIds?: string[] }>;
};

// Escaping preserves literal model text without allowing it to become active
// markup in a reviewer’s Markdown viewer. The JSON companion retains raw fields.
function literal(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/([\\`*_{}\[\]#|])/g, "\\$1");
}
function quoted(value: string) {
  return value.split(/\r?\n/).map(line => `> ${literal(line)}`).join("\n");
}

export function renderResearchReviewWorksheet(review: ReturnType<typeof buildResearchReviewPackage>) {
  const lines = [
    "# MIRA activity library — independent review worksheet", "",
    "**Unpublished drafts. Not instructions for families to try.**", "",
    "Target: birth until the seventh birthday. This does not establish reviewed age or language coverage.", "",
    `Catalog: ${literal(review.catalogVersion)}`, "",
    `Catalog fingerprint: \`${review.catalogHash}\``, "",
    `Compiler: ${literal(review.compilerVersion)}`, "",
    "## How to use this package", "",
    ...review.instructions.map(instruction => `- ${literal(instruction)}`), "",
    "The companion JSON contains exact machine-readable records. This worksheet contains no family or child information. No reviewer is appointed or approved by this export.", "",
    "Record an outcome (acceptable / changes required / outside my expertise) and evidence for every check. Use additional qualified reviewers where needed. A completed worksheet is evidence for a separate editorial decision; it cannot publish a template or authorize family use.", "",
    "## Source register", "",
  ];
  for (const source of review.sources) lines.push(
    `### ${literal(source.title)}`, "", `ID: ${literal(source.id)} · ${literal(source.publisher)} · ${source.year}`, "",
    `Source: ${source.url}`, "", `Access recorded: ${literal(source.access)}`, "",
    `Location: ${literal(source.location)}`, "", `Summary: ${literal(source.summary)}`, "",
    `Limits: ${literal(source.limit)}`, "", `Rights record: ${literal(source.rights)}`, "",
    "Independent source appraisal / contrary evidence / remaining access needed: ____________________", "",
  );
  lines.push("## Claim register", "");
  for (const claim of review.claims) lines.push(
    `### ${literal(claim.id)}`, "", literal(claim.text), "", `Scope: ${literal(claim.scope)}`, "",
    `Does not establish: ${literal(claim.notSupported)}`, "", `Sources: ${claim.sourceIds.map(literal).join(", ")}`, "",
    "Independent appraisal / wording corrections: ____________________", "",
  );
  lines.push("## Primitive-by-primitive review", "");
  for (const item of review.primitives) {
    lines.push(`### ${literal(item.primitive.name)}`, "", `ID: ${literal(item.primitive.id)}`, "",
      `Content fingerprint: \`${item.contentFingerprint}\``, "", literal(item.primitive.mechanism), "",
      `Claim references: ${item.primitive.claimIds.map(literal).join(", ")}`, "",
      `Unresolved applicability: ${literal(item.primitive.readiness)}`, "",
      `Materials in drafting brief: ${item.primitive.materials.map(literal).join("; ")}`, "",
      "#### Drafting constraints (not a safety approval)", "", ...item.primitive.constraints.map(rule => `- ${literal(rule)}`), "",
      "#### Known drafting problems", "", literal(item.preflight.finding), "",
      "These findings are AI-assisted, not an independent review. Review the full source and draft, not only the listed defects.", "",
      "#### Preserved AI drafts — not for use", "");
    if (item.generation) {
      lines.push(`Local contract status: ${literal(item.generation.status)}. A structure pass is not approval.`, "",
        `Generated: ${literal(item.generation.generatedAt)} · Model: ${literal(item.generation.model)}`, "",
        `Prompt fingerprint: \`${item.generation.promptHash}\``, "");
      for (const [index, draft] of item.generation.drafts.entries()) lines.push(
        `##### Draft ${index + 1}: ${literal(draft.title)}`, "", "Invitation:", "", quoted(draft.invitation), "",
        "Caregiver wording:", "", quoted(draft.caregiverWords), "", "Optional noticing:", "", quoted(draft.observation), "",
        `Claim references: ${draft.claimIds.map(literal).join(", ")}`, "");
      if (item.generation.validationIssue) lines.push(`Validation issue: ${literal(item.generation.validationIssue)}`, "", "Rejected raw output, if present, is preserved in the JSON companion.", "");
    } else lines.push("No generation record. Do not fill this gap with an assumed approval.", "");
    lines.push("#### Reviewer record", "", "Name / qualifications / relevant scope: ____________________", "",
      "Review date / conflicts of interest: ____________________", "",
      "Exact draft(s) assessed: ____________________", "",
      "Proposed age range, readiness conditions and exclusions (not the product-wide age target): ____________________", "",
      "Language / variety and language reviewer: ____________________", "",
      "Recommendation (changes required / reject / ready for separate editorial decision): ____________________", "");
    for (const check of item.checks) lines.push(`**${literal(check.id)}** — ${literal(check.question)}`, "",
      "Outcome: ____________________", "", "Evidence / locator: ____________________", "", "Required changes: ____________________", "");
    lines.push("Edits change the content fingerprint and require a new review record. Publication remains blocked.", "");
  }
  return lines.join("\n");
}
