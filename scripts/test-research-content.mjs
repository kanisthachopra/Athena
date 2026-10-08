import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
const require = createRequire(import.meta.url);
const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
function load(path, dependencies) {
  const js = ts.transpileModule(read(path), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const exports = {};
  new Function("require", "exports", js)(id => id === "server-only" ? {} : dependencies[id] ?? require(id), exports);
  return exports;
}
const catalog = JSON.parse(read("../content/research/catalog.json"));
const core = load("../lib/research-content.ts", { "@/content/research/catalog.json": catalog });
const integrity = load("../lib/research-bundle.ts", { "@/lib/research-content": core });
// Synthetic fixture exercises the current contract. It is not provider output.
const bundle = {
  compilerVersion: core.COMPILER_VERSION, catalogVersion: catalog.version,
  catalogHash: integrity.fingerprint(catalog), familyDataSent: false,
  stacks: catalog.primitives.map(primitive => ({
    primitiveId: primitive.id, status: "unreviewed_ai_draft", schedulable: false,
    generatedAt: "2026-10-01T00:00:00.000Z", model: "synthetic-test-only",
    promptHash: integrity.fingerprint(core.draftPrompt(primitive)), promptTokens: 0,
    completionTokens: 0, latencyMs: 0, validationIssue: null, rejectedOutput: null,
    drafts: [0, 1].map(i => ({ title: `Fixture ${i}`, invitation: "Fixture only. The child can stop.", caregiverWords: "Use your own words.", observation: "If you want to, notice a voluntary gesture.", claimIds: [primitive.claimIds[0]] })),
  })),
};
integrity.validateResearchBundle(bundle);
assert.equal(core.canScheduleResearchDraft(), false);
let rejected = 0;
function reject(mutate) {
  const changed = structuredClone(bundle);
  mutate(changed);
  assert.throws(() => integrity.validateResearchBundle(changed));
  rejected++;
}
reject(b => { b.catalogHash = "stale"; });
reject(b => { b.catalogVersion = "old"; });
reject(b => { b.compilerVersion = "old"; });
reject(b => { b.familyDataSent = true; });
reject(b => { b.stacks.pop(); });
reject(b => { b.stacks[1] = b.stacks[0]; });
reject(b => { b.stacks[0].primitiveId = "unknown"; });
reject(b => { b.stacks[0].promptHash = "altered"; });
reject(b => { b.stacks[0].status = "approved"; });
reject(b => { b.stacks[0].schedulable = true; });
reject(b => { b.stacks[0].model = ""; });
reject(b => { b.stacks[0].generatedAt = "not a date"; });
reject(b => { b.stacks[0].promptTokens = -1; });
reject(b => { b.stacks[0].drafts[0].claimIds = ["invented"]; });
reject(b => { b.stacks[0].drafts[0].claimIds = ["shared-reading"]; });
reject(b => { b.stacks[0].drafts[0].claimIds = ["responsive-exchange", "responsive-exchange"]; });
reject(b => { b.stacks[0].drafts[0].title = "WHO-approved"; });
reject(b => { b.stacks[0].drafts[0].published = true; });
reject(b => { b.stacks[0].drafts[0].observation = "The child smiled."; });
reject(b => { b.stacks[0].drafts[0].invitation = "Demand a response."; });
reject(b => { b.stacks[0].drafts[0].caregiverWords = "I remember last time you smiled."; });
reject(b => { b.stacks[0].drafts[1].title = b.stacks[0].drafts[0].title; });
reject(b => { b.stacks[0].drafts[0].title = "x".repeat(91); });
const rejectedBatch = JSON.parse(read("../content/research/archive/batch-1-rejected.json"));
assert.throws(() => integrity.validateResearchBundle(rejectedBatch));
const quarantined = structuredClone(bundle);
quarantined.stacks[0].status = "rejected_ai_draft";
quarantined.stacks[0].validationIssue = "Observation must be an optional noticing prompt";
quarantined.stacks[0].rejectedOutput = { drafts: structuredClone(quarantined.stacks[0].drafts) };
quarantined.stacks[0].rejectedOutput.drafts[0].observation = "An invented observation.";
quarantined.stacks[0].drafts = [];
integrity.validateResearchBundle(quarantined);
quarantined.stacks[0].drafts = structuredClone(bundle.stacks[0].drafts);
assert.throws(() => integrity.validateResearchBundle(quarantined));
const sourceText = read("../scripts/compile-research-drafts.mjs");
assert.ok(!/supabase|service_role|writeFile/.test(sourceText));
console.log(`Research checks passed: synthetic bundle integrity, ${rejected} negative cases, old live batch rejected, drafts unschedulable. Semantic safety still requires independent review.`);
