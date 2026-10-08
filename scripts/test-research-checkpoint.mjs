import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
const require = createRequire(import.meta.url);
function load(path, dependencies) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const exports = {};
  new Function("require", "exports", js)(id => id === "server-only" ? {} : dependencies[id] ?? require(id), exports);
  return exports;
}
const catalog = JSON.parse(readFileSync(new URL("../content/research/catalog.json", import.meta.url), "utf8"));
const core = load("../lib/research-content.ts", { "@/content/research/catalog.json": catalog });
const integrity = load("../lib/research-bundle.ts", { "@/lib/research-content": core });
const { compileResearchCheckpoint: compile } = load("../lib/research-compiler.ts", { "@/lib/research-content": core, "@/lib/research-bundle": integrity });
const now = () => "2026-10-01T00:00:00.000Z";
const requested = [];
async function generate(args) {
  const primitive = catalog.primitives.find(p => core.draftPrompt(p).user === args.user);
  assert.ok(primitive);
  requested.push(primitive.id);
  return {
    model: "synthetic-test-only", promptTokens: 5, completionTokens: 5, latencyMs: 1,
    content: { drafts: [0, 1].map(i => ({ title: `Fixture ${i}`, invitation: "Fixture only. The child can stop.", caregiverWords: "Use your own words.", observation: "If you want to, notice a voluntary gesture.", claimIds: [primitive.claimIds[0]] })) },
  };
}
const single = await compile({ generate, now });
assert.equal(requested.length, 1);
assert.equal(single.stacks.length, 1);
assert.equal(single.compilationComplete, false);
assert.equal(single.publicationAllowed, false);
assert.equal(single.familyDataSent, false);
assert.throws(() => integrity.validateResearchBundle(single));
integrity.validateResearchBundle(single, { allowPartial: true });

let calls = 0;
const events = [];
const partial = await compile({ now, maxCalls: 6, generate: async args => {
  if (++calls === 2) throw Object.assign(new Error("secret provider detail"), { code: "timeout" });
  return generate(args);
}, onCheckpoint: async checkpoint => { events.push(checkpoint); } });
assert.equal(calls, 2, "Must stop spending after failure");
assert.equal(partial.stacks.length, 1, "Completed call must survive later failure");
assert.equal(events.length, 2);
assert.deepEqual(partial.failures, [{ primitiveId: catalog.primitives[1].id, code: "timeout" }]);
assert.ok(!JSON.stringify(partial).includes("secret provider detail"));
events[0].stacks.length = 0;
assert.equal(partial.stacks.length, 1, "Checkpoint callbacks must not mutate retained work");

requested.length = 0;
const resumed = await compile({ previous: partial, generate, now, maxCalls: catalog.primitives.length });
assert.equal(requested.length, catalog.primitives.length - 1);
assert.ok(!requested.includes(catalog.primitives[0].id));
assert.equal(resumed.compilationComplete, true);
assert.equal(resumed.publicationAllowed, false);
assert.ok(resumed.stacks.every(s => !s.schedulable));
integrity.validateResearchBundle(resumed);
await compile({ previous: resumed, now, generate: async () => { assert.fail("Completed batch must not spend again"); } });

const rejected = await compile({ now, generate: async args => ({ ...await generate(args), content: { invented: "invalid output" } }) });
assert.equal(rejected.stacks[0].status, "rejected_ai_draft");
assert.equal(rejected.stacks[0].drafts.length, 0);
requested.length = 0;
await compile({ previous: rejected, now, generate });
assert.deepEqual(requested, [catalog.primitives[1].id], "Rejected output is retained, not silently regenerated");

for (const maxCalls of [0, -1, catalog.primitives.length + 1, 1.2, NaN]) {
  await assert.rejects(compile({ maxCalls, generate: async () => assert.fail("Invalid budget must not spend") }));
}
const stale = structuredClone(single);
stale.catalogHash = "stale";
await assert.rejects(compile({ previous: stale, generate: async () => assert.fail("Stale checkpoint must not spend") }));
const malformed = await compile({ generate: async args => ({ ...await generate(args), promptTokens: -1 }), now });
assert.equal(malformed.stacks.length, 0);
assert.equal(malformed.failures[0].code, "validation_error");
console.log("Research checkpoint checks passed: bounded calls, failure retention, safe resume, quarantine, stale provenance denial and no automatic publication. All provider responses are synthetic.");
