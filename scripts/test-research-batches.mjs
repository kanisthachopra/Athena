import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { readResearchJson, selectResearchBatch, loadResearchBatch, loadResearchModule } from "./research-batches.mjs";

const foundation = selectResearchBatch([]);
const expansion = selectResearchBatch(["--batch=play-expansion", "--limit=1"]);
assert.equal(foundation.name, "foundation");
assert.deepEqual(expansion.args, ["--limit=1"]);
for (const args of [["--batch=../../.env.local"], ["--batch="], ["--batch=foundation", "--batch=play-expansion"]]) assert.throws(() => selectResearchBatch(args));
const original = loadResearchBatch(foundation);
const next = loadResearchBatch(expansion);
const baseline = readResearchJson("../content/research/review-checkpoint.json");
original.integrity.validateResearchBundle(baseline, { allowPartial: true });
assert.throws(() => next.integrity.validateResearchBundle(baseline, { allowPartial: true }), "Batches must not reuse approvals or compiler provenance");
assert.equal(next.core.canScheduleResearchDraft(), false);
assert.equal(next.core.catalog.primitives.length, 4);
assert.ok(next.core.catalog.claims.every(claim => !claim.sourceIds.includes("who-movement-under-five-2019")), "Landing-page context must not become draft evidence");
const compiler = loadResearchModule("../lib/research-compiler.ts", { "@/lib/research-content": next.core, "@/lib/research-bundle": next.integrity });
let calls = 0;
const checkpoint = await compiler.compileResearchCheckpoint({ maxCalls: 4, now: () => "2026-10-02T00:00:00.000Z", generate: async args => {
  calls++;
  const { primitive, claims } = JSON.parse(args.user);
  assert.deepEqual(claims.map(claim => claim.id), primitive.claimIds);
  assert.ok(args.system.includes("unpublished"));
  return { model: "synthetic-test-only", promptTokens: 1, completionTokens: 1, latencyMs: 1, content: { drafts: [0, 1].map(i => ({ title: `Synthetic ${i}`, invitation: "If the child initiates, follow their choice. The child can stop or turn away.", caregiverWords: "Use your own words.", observation: "If you want to, notice whether the child repeats an action.", claimIds: primitive.claimIds })) } };
} });
assert.equal(calls, 4);
assert.equal(checkpoint.compilationComplete, true);
assert.ok(checkpoint.stacks.every(stack => stack.status === 'unreviewed_ai_draft'));
assert.equal(checkpoint.publicationAllowed, false);
assert.equal(checkpoint.familyDataSent, false);
next.integrity.validateResearchBundle(checkpoint);
assert.throws(() => original.integrity.validateResearchBundle(checkpoint));
await compiler.compileResearchCheckpoint({ previous: checkpoint, generate: async () => assert.fail("Complete batch must not spend again") });
const review = loadResearchModule("../lib/research-review.ts", {
  "@/lib/research-content": next.core, "@/lib/research-bundle": next.integrity,
  "@/content/research/preflight-review.json": { catalogVersion: next.core.catalog.version, checkpointHash: next.integrity.fingerprint(checkpoint), publicationApproved: false, reviewType: "synthetic test", findings: {} },
});
const packet = review.buildResearchReviewPackage(checkpoint);
assert.equal(packet.primitives.length, 4);
assert.ok(packet.primitives.every(item => item.reviewer.name === null && item.decision === null && item.schedulable === false));
assert.throws(() => review.buildResearchReviewPackage({ ...checkpoint, failures: [{ primitiveId: "changed", code: "timeout" }] }), "Preflight must bind exact checkpoint");
const changed = structuredClone(checkpoint);
changed.stacks[0].promptHash = "stale";
assert.throws(() => next.integrity.validateResearchBundle(changed));
const firstAttempt = readResearchJson('../content/research/expansion/attempt-1.json');
const provenance = readResearchJson('../content/research/expansion/attempt-1-provenance.json');
assert.equal(provenance.checkpointHash, next.integrity.fingerprint(firstAttempt));
assert.equal(next.integrity.fingerprint(provenance.catalog), firstAttempt.catalogHash);
for (const stack of firstAttempt.stacks) {
  assert.equal(next.integrity.fingerprint(provenance.prompts.find(p => p.primitiveId === stack.primitiveId).prompt), stack.promptHash);
  assert.throws(() => next.core.validateDrafts({drafts: stack.drafts}, next.core.catalog.primitives.find(p => p.id === stack.primitiveId)), 'Observed child-facing output must fail the corrected contract');
}
assert.throws(() => next.integrity.validateResearchBundle(firstAttempt), 'Superseded compiler output cannot be resumed as current');
for (const [field, value] of [['invitation', 'I will help. The child can stop or turn away.'], ['caregiverWords', 'You can change your marks.'], ['observation', 'If you want to, notice whether the child']]) {
  const bad = structuredClone(checkpoint.stacks[0].drafts); bad[0][field] = value;
  assert.throws(() => next.core.validateDrafts({drafts: bad}, next.core.catalog.primitives[0]));
}
const adult = structuredClone(checkpoint.stacks[0].drafts);
adult[0].invitation = 'If the child offers a rhythm, use your voice to respond. The child can stop or turn away.';
next.core.validateDrafts({drafts: adult}, next.core.catalog.primitives[0]);
adult[0].observation = 'If you want to, notice whether the child returns with renewed focus.';
assert.throws(() => next.core.validateDrafts({drafts: adult}, next.core.catalog.primitives[0]));
for (const args of [["--batch=play-expansion", "--limit=1"], []]) {
  const result = spawnSync(process.execPath, ["scripts/compile-research-drafts.mjs", ...args], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.mode, "dry-run"); assert.equal(output.publishes, false); assert.equal(output.familyDataSent, false);
}
const denied = spawnSync(process.execPath, ["scripts/compile-research-drafts.mjs", "--batch=unknown", "--live"], { encoding: "utf8" });
assert.equal(denied.status, 1);
assert.equal(JSON.parse(denied.stderr).status, "blocked");
const actual = readResearchJson('../content/research/expansion/review-checkpoint.json');
next.integrity.validateResearchBundle(actual);
assert.equal(actual.stacks.filter(stack => stack.status === 'unreviewed_ai_draft').length, 1);
assert.equal(actual.stacks.filter(stack => stack.status === 'rejected_ai_draft').length, 3);
const checkedReview = loadResearchModule('../lib/research-review.ts', {
  '@/lib/research-content': next.core, '@/lib/research-bundle': next.integrity,
  '@/content/research/preflight-review.json': readResearchJson('../content/research/expansion/preflight-review.json'),
});
const currentPacket = checkedReview.buildResearchReviewPackage(actual);
assert.equal(readFileSync(new URL('../docs/activity-review/play-expansion-worksheet.md', import.meta.url), 'utf8').trimEnd(), checkedReview.renderResearchReviewWorksheet(currentPacket).trimEnd());
const intake = loadResearchModule('../lib/research-review-intake.ts', {'@/lib/research-bundle': next.integrity});
const blank = readResearchJson('../docs/activity-review/play-expansion-response.json');
assert.deepEqual(blank, intake.createReviewSubmission(currentPacket));
const blankAssessment = intake.assessReviewSubmission(blank, currentPacket);
assert.equal(blankAssessment.state, 'blocked_or_partial');
assert.equal(blankAssessment.publicationAllowed, false);
assert.equal(blankAssessment.schedulable, false);
assert.ok(blankAssessment.issues.length > 0);
for (const [script, args, status] of [
  ['scripts/review-research.mjs', ['--batch=play-expansion'], 0],
  ['scripts/review-research.mjs', ['--batch=play-expansion', '--check=docs/activity-review/play-expansion-response.json'], 1],
  ['scripts/prepare-activity-release.mjs', ['--batch=play-expansion'], 0],
  ['scripts/prepare-activity-release.mjs', ['--batch=play-expansion', '--template=small-movement-mirror:0'], 1],
  ['scripts/prepare-activity-release.mjs', ['--batch=play-expansion', '--check=content/research/activity-candidates/answer-a-small-signal.json'], 1],
]) {
  const result = spawnSync(process.execPath, [script, ...args], {encoding: 'utf8'});
  assert.equal(result.status, status, result.stderr || result.stdout);
}
console.log("Research batch checks passed: baseline preserved, source/claim boundaries, isolated compiler provenance, bounded synthetic generation, no automatic approval, stale preflight denial and allowlisted CLI selection.");
