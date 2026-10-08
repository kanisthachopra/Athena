import "server-only";
import { fingerprint, validateResearchBundle } from "@/lib/research-bundle";
import { buildResearchReviewPackage, renderResearchReviewWorksheet, type ResearchReviewPackage } from "@/lib/research-review";
import { addAuthoringSources } from "@/lib/research-authoring-sources";
import { assessActivityReleaseCandidate, createActivityReleaseReview, renderActivityReleaseWorksheet } from "@/lib/activity-release";
import * as expansion from "@/lib/research-expansion-content";
import foundationCheckpoint from "@/content/research/review-checkpoint.json";
import expansionCheckpoint from "@/content/research/expansion/review-checkpoint.json";
import expansionPreflight from "@/content/research/expansion/preflight-review.json";
import authoringSources from "@/content/research/expansion/authoring-sources.json";
import signal from "@/content/research/activity-candidates/answer-a-small-signal.json";
import sound from "@/content/research/activity-candidates/answer-their-sound.json";
import notice from "@/content/research/activity-candidates/notice-without-moving.json";
import hello from "@/content/research/activity-candidates/an-unhurried-hello.json";
import story from "@/content/research/activity-candidates/a-story-that-just-happened.json";
import difference from "@/content/research/activity-candidates/a-difference-they-notice.json";
import marks from "@/content/research/expansion/activity-candidates/marks-of-their-own.json";

// Public editorial content only. Explicit imports prohibit path traversal, private
// reviewer records, environment files and request-selected filesystem access.
const candidates = [
  { slug: "answer-a-small-signal", batch: "foundation", candidate: signal },
  { slug: "answer-their-sound", batch: "foundation", candidate: sound },
  { slug: "notice-without-moving", batch: "foundation", candidate: notice },
  { slug: "an-unhurried-hello", batch: "foundation", candidate: hello },
  { slug: "a-story-that-just-happened", batch: "foundation", candidate: story },
  { slug: "a-difference-they-notice", batch: "foundation", candidate: difference },
  { slug: "marks-of-their-own", batch: "play-expansion", candidate: marks },
] as const;

export function hasActivityReviewPacket(slug: string) {
  return candidates.some(item => item.slug === slug);
}

function packageFor(batch: "foundation" | "play-expansion"): ResearchReviewPackage {
  if (batch === "foundation") return buildResearchReviewPackage(foundationCheckpoint);
  const base = buildResearchReviewPackage(expansionCheckpoint, {
    catalog: expansion.catalog,
    preflight: expansionPreflight,
    validateResearchBundle: (input, options) => validateResearchBundle(input, options, expansion),
  });
  return addAuthoringSources(base, authoringSources);
}

export function getActivityReviewPacket(slug: string) {
  const entry = candidates.find(item => item.slug === slug);
  if (!entry) return null;
  const review = packageFor(entry.batch);
  const assessment = assessActivityReleaseCandidate(entry.candidate, review);
  if (assessment.issues.length) throw new Error("Activity review packet needs a provenance check");
  const primitive = review.primitives.find(item => item.primitive.id === entry.candidate.origin.primitiveId)!;
  const sourceIds = new Set([...entry.candidate.claims.flatMap(claim => claim.sourceIds), ...(primitive.authoringSourceIds ?? [])]);
  return {
    slug: entry.slug, batch: entry.batch, candidate: entry.candidate, review,
    candidateFingerprint: assessment.candidateFingerprint,
    packageFingerprint: fingerprint(review),
    primitiveName: primitive.primitive.name,
    sources: review.sources.filter(source => sourceIds.has(source.id)),
  };
}

export function listActivityReviewPackets() {
  return candidates.map(entry => {
    const packet = getActivityReviewPacket(entry.slug)!;
    return {
      slug: packet.slug, title: packet.candidate.template.title,
      summary: packet.candidate.template.summary,
      minimumMonths: packet.candidate.template.min_age_months,
      maximumMonths: packet.candidate.template.max_age_months,
      primitiveName: packet.primitiveName,
      sourcePublishers: [...new Set(packet.sources.map(source => source.publisher))],
      candidateFingerprint: packet.candidateFingerprint,
    };
  });
}

export function exportActivityReviewPacket(packet: NonNullable<ReturnType<typeof getActivityReviewPacket>>, format: "json" | "markdown" | "response") {
  if (format === "response") return JSON.stringify(createActivityReleaseReview(packet.candidate, packet.review), null, 2);
  if (format === "markdown") return [
    renderActivityReleaseWorksheet(packet.candidate, packet.review),
    "## Source package and original drafting record", "",
    "The following is the full originating batch, including other drafts and any rejected output. Only the candidate named above is the target of this complete-activity worksheet.", "",
    renderResearchReviewWorksheet(packet.review),
  ].join("\n");
  return JSON.stringify({
    format: "mira-complete-activity-review-packet", version: 1,
    state: "awaiting_independent_review", publicationAllowed: false, schedulable: false,
    instructions: "Unpublished. Not instructions for families to try. Review the complete candidate and its sources independently. Download the blank response separately; keep completed reviewer records private. A separate authorized editor must decide publication.",
    candidateFingerprint: packet.candidateFingerprint, packageFingerprint: packet.packageFingerprint,
    candidate: packet.candidate, sourcePackage: packet.review,
  }, null, 2);
}
