import assert from "node:assert/strict";
import { calendarFixture } from './fixtures/family-calendar.mjs';
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
const require = createRequire(import.meta.url);
function load(path, deps = {}) {
  deps = { '@/lib/family-calendar': calendarFixture, ...deps };
  const js = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  new Function("require", "exports", js)(id => id === "server-only" ? {} : deps[id] ?? require(id), exports);
  return exports;
}
const age = load("../lib/age-context.ts");
const now = new Date("2026-10-01T12:00:00Z");
const context = (year, month) => age.ageContext(year, month, now);
assert.deepEqual(context(2026, 10), { minimumMonths: 0, maximumMonths: 0, precision: "month_year", scope: "within_target" });
assert.deepEqual(context(2020, 10), { minimumMonths: 71, maximumMonths: 72, precision: "month_year", scope: "within_target" });
assert.equal(context(2019, 11).scope, "within_target"); // six-year-old, not yet seven
assert.equal(context(2019, 10).scope, "boundary_uncertain"); // seventh birthday may not have happened
assert.equal(context(2019, 9).scope, "outside_target");
for (const [year, month] of [[2027, 1], [2026, 11], [2025, 0], [2025, 13], [2025.5, 1], [NaN, 1], [2025, Infinity], [1899, 1]]) assert.equal(context(year, month), null);
assert.equal(age.ageContext(2025, 1, new Date("invalid")), null);
assert.equal(age.ageRangeLabel(context(2020, 10)), "71–72 months (approximate)");
assert.equal(age.fitsReviewedAgeRange(context(2020, 10), 72, 83), false); // do not invent birthday=day1
assert.equal(age.fitsReviewedAgeRange(context(2020, 10), 70, 71), false);
assert.equal(age.fitsReviewedAgeRange(context(2020, 10), 71, 72), true);
for (const invalid of [null, context(2019, 10), context(2019, 9), { ...context(2020, 10), maximumMonths: NaN }, { ...context(2020, 10), maximumMonths: 70 }, { ...context(2020, 10), precision: "exact" }]) assert.equal(age.fitsReviewedAgeRange(invalid, 0, 83), false);
// Leap years and year rollover retain the same honest month/year envelope.
assert.equal(age.ageContext(2024, 2, new Date("2025-02-28T23:59:59Z")).maximumMonths, 12);
assert.equal(age.ageContext(2025, 12, new Date("2026-01-01T00:00:00Z")).maximumMonths, 1);

let requests = [];
const answer = { kind: "grounded", answer: "You can leave today open.", activity_ids: ["fixture"], claim_ids: ["claim"], next_steps: ["leave_open"] };
const guideContext={date:'2026-10-01',options:[{id:'fixture',title:'Synthetic',claimIds:['claim']}],claims:[{id:'claim',text:'Synthetic claim'}]};
const copilot = load("../lib/ai/ask-copilot.ts", {
  "@/lib/guide-grounding": load("../lib/guide-grounding.ts"),
  "@/lib/age-context": age,
  "@/lib/ai/nebius": { createStructuredCompletion: async args => { await args.beforeRequest(); requests.push(args); return { content: answer, model: "synthetic", promptTokens: 1, completionTokens: 1, latencyMs: 1 }; } },
});
await copilot.askCopilot({ question: "Can we leave today open?", age: context(2020, 10), context: guideContext, beforeRequest: async () => {} });
assert.match(requests[0].user, /71–72 months \(approximate\)/);
assert.match(requests[0].system, /not proof of (reviewed )?content coverage/);
assert.doesNotMatch(requests[0].user, /72 months old/);
for (const blocked of [context(2019, 10), context(2019, 9), null]) await assert.rejects(copilot.askCopilot({ question: "A question", age: blocked, context: guideContext, beforeRequest: async () => {} }));
assert.equal(requests.length, 1);
await assert.rejects(copilot.askCopilot({ question: "A question", age: context(2020, 10), context: guideContext, beforeRequest: async () => { throw new Error("withdrawn"); } }), /withdrawn/);
assert.equal(requests.length, 1);

// The application must fail before allowance queries, logs or provider calls.
let child = { birth_year: 2019, birth_month: 10 };
const ask = load("../app/ask/actions.ts", {
  "@/lib/ai/guide-budget": { guideRequestBudget: () => { throw new Error("Unexpected allowance reservation"); }, GuideBudgetError: class extends Error {} },
  "@/lib/guide-context": { loadGuideContext: () => { throw new Error("Unexpected context query"); } },
  "@/lib/age-context": { ...age, ageContext: (year, month) => age.ageContext(year, month, now) },
  "@/lib/ai/ask-copilot": { askCopilot: () => { throw new Error("Unexpected provider call"); } },
  "@/lib/ai/nebius": { AiProviderError: class extends Error {} },
  "@/lib/ai/permission": { familyAiAuthorizer: () => { throw new Error("Unexpected authorization request"); }, AiPermissionError: class extends Error {} },
  "@/lib/family-context": { requireFamilyContext: async () => ({ activeChild: child, membership: { family_id: "synthetic" }, supabase: { from: () => { throw new Error("Unexpected database write or allowance query"); } } }) },
});
for (const [birth_year, birth_month] of [[2019, 10], [2019, 9], [2027, 1]]) {
  child = { birth_year, birth_month };
  const form = new FormData(); form.set("question", "Can we leave today open?");
  const result = await ask.askMira({}, form);
  assert.equal(result.answer, null); assert.match(result.error, /no AI request was sent/);
}
console.log("Age checks pass: six-year-olds included, uncertain seventh birthday blocked, approximate prompt, reviewed-range envelope and zero requests on invalid age/withdrawal. No live API calls.");
