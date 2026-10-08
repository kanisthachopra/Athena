import assert from "node:assert/strict";
import { calendarFixture } from './fixtures/family-calendar.mjs';
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
const require = createRequire(import.meta.url);
function load(path, dependencies = {}) {
  dependencies = { '@/lib/family-calendar': calendarFixture, ...dependencies };
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  new Function("require", "exports", js)(id => id === "server-only" ? {} : dependencies[id] ?? require(id), exports);
  return exports;
}
const journal = load("../lib/journal-entry.ts");
const childId = "11111111-1111-4111-8111-111111111111";
const otherId = "22222222-2222-4222-8222-222222222222";
for (const value of ["2024-02-29", "2026-01-31"]) assert.equal(journal.isCalendarDate(value), true);
for (const value of ["2026-02-29", "2026-04-31", "2026-13-01", "2026-1-1", "not-a-date"]) assert.equal(journal.isCalendarDate(value), false);
assert.equal(journal.journalTitle("First line\nSecond line"), "First line");
assert.equal(Array.from(journal.journalTitle("🙂".repeat(100))).length, 70);
assert.deepEqual(journal.parseObservationSuggestion({ title: " A sound ", domain: "everyday" }), { title: "A sound", domain: "everyday" });
for (const value of [null, [], { title: "A", domain: "diagnosis" }, { title: "A", domain: "everyday", note: "invented" }, { title: " ", domain: "everyday" }]) assert.throws(() => journal.parseObservationSuggestion(value));
const rawNote = "She said “再来一次”.\n  Then she put the book down. مرحبا";
const valid = { title: "", note: rawNote, domain: "everyday", occurredOn: "2026-10-01", childId, requestId: otherId };
assert.equal(journal.validateJournalEntry(valid), null);
for (const patch of [{ note: " " }, { note: "x".repeat(1201) }, { title: "x".repeat(101) }, { childId: "bad" }, { domain: "invented" }, { occurredOn: "2026-02-30" }]) assert.ok(journal.validateJournalEntry({ ...valid, ...patch }));

let role = "owner", budgetError = false, saveError = false, aiCalls = 0, writes = [], revalidated = [], budgetCalls = [];
class FakeAiError extends Error {}
const fakeClient = {
  from() { return { select() { return this; }, eq() { return this; }, gte: async () => ({ data: [], count: 0, error: budgetError ? { message: "private database failure" } : null }), insert: async () => ({ error: null }) }; },
  async rpc(name, args) {
    if(name.includes('extraction_request')) {
      budgetCalls.push({name,args});
      return {data:name==='reserve_extraction_request'?childId:name==='begin_extraction_request_attempt'?1:true,error:budgetError?{message:'private budget error'}:null};
    }
    writes.push({ name, args }); return { data: childId, error: saveError ? { message: "private database detail" } : null };
  },
};
const context = async () => ({ supabase: fakeClient, membership: { role, family_id: "family" }, userId: "user", activeChild: { id: childId, birth_year: 2025, birth_month: 1 } });
const actions = load("../app/insights/actions.ts", {
  "@/lib/ai/extraction-budget": load("../lib/ai/extraction-budget.ts"),
  "@/lib/ai/permission": { familyAiAuthorizer: () => async () => {}, AiPermissionError: class extends Error {} },
  "@/lib/journal-entry": journal, "@/lib/family-context": { requireFamilyContext: context },
  "@/lib/ai/nebius": { AiProviderError: FakeAiError },
  "@/lib/ai/observation-extractor": { deterministicObservationFallback: note => ({ title: journal.journalTitle(note), domain: "everyday" }), extractObservation: async (_note,beforeRequest) => { await beforeRequest(); aiCalls++; return { proposal: { title: "A title", domain: "language" }, model: "synthetic", promptTokens: 1, completionTokens: 1, latencyMs: 1, usageKnown:true }; } },
  "next/cache": { revalidatePath: path => revalidated.push(path) },
});
const form = data => { const f = new FormData(); for (const [key, value] of Object.entries(data)) f.set(key, value); return f; };
const initial = { error: null, success: null };
assert.ok((await actions.saveLearningMoment(initial, form(valid))).success);
assert.equal(writes.length, 1); assert.equal(writes[0].args.p_note, rawNote); assert.equal(aiCalls, 0);
assert.equal(writes[0].name, "create_learning_moment_checked"); assert.equal(writes[0].args.p_request_id, otherId);
assert.equal(writes[0].args.p_child_id, childId); assert.ok(revalidated.includes("/insights"));
role = "viewer";
assert.ok((await actions.saveLearningMoment(initial, form(valid))).error);
assert.equal(writes.length, 1);
role = "owner";
assert.ok((await actions.saveLearningMoment(initial, form({ ...valid, childId: otherId }))).error);
assert.equal(writes.length, 1);
saveError = true;
const failedSave = await actions.saveLearningMoment(initial, form(valid));
assert.equal(failedSave.success, null); assert.ok(!failedSave.error.includes("private"));
saveError = false;
const request = { rawNote, occurredOn: "2026-10-01", childId };
assert.ok((await actions.proposeLearningMoment({}, form(request))).error); assert.equal(aiCalls, 0);
budgetError = true;
assert.ok((await actions.proposeLearningMoment({}, form({ ...request, allowAi: "on" }))).error); assert.equal(aiCalls, 0);
budgetError = false;
assert.ok((await actions.proposeLearningMoment({}, form({ ...request, allowAi: "on", childId: otherId }))).error); assert.equal(aiCalls, 0);
const proposed = await actions.proposeLearningMoment({}, form({ ...request, allowAi: "on" }));
assert.deepEqual(proposed.proposal, { title: "A title", domain: "language", occurredOn: "2026-10-01" }); assert.equal(aiCalls, 1);
assert.equal(writes.length, 2); // only the direct save and simulated failed save attempted an RPC
assert.equal(budgetCalls.at(-1).name,'finish_extraction_request');assert.ok(!JSON.stringify(budgetCalls).includes(rawNote));

const ask = load("../app/ask/actions.ts", {
  "@/lib/ai/guide-budget": load("../lib/ai/guide-budget.ts"),
  "@/lib/guide-context": { loadGuideContext: async () => ({error:"Reviewed context unavailable",context:null}) },
  "@/lib/age-context": load("../lib/age-context.ts"),
  "@/lib/ai/permission": { familyAiAuthorizer: () => async () => {}, AiPermissionError: class extends Error {} },
  "@/lib/family-context": { requireFamilyContext: context },
  "@/lib/ai/nebius": { AiProviderError: FakeAiError },
  "@/lib/ai/ask-copilot": { askCopilot: async () => { throw new Error("Provider must not run on missing reviewed context"); } },
});
assert.equal((await ask.askMira({}, form({ question: "A synthetic test question" }))).error,"Reviewed context unavailable");

// Exercise actual context-loader code with query-shaped mocks, never live credentials.
const calls = [];
let failureTable = "", authenticated = true;
const rows = { family_members: { family_id: "family", role: "viewer" }, families: { id: "family", display_name: "Synthetic" }, children: [{ id: childId, archived_at: null }], user_settings: { active_child_id: otherId } };
function client() {
  return { rpc: async(name,args)=>{calls.push([name,'p_child_id',args.p_child_id]);return{data:rows[name],error:failureTable===name?{message:'private'}:null};}, auth: { getClaims: async () => ({ data: { claims: authenticated ? { sub: "user" } : null }, error: null }) }, from(table) {
    const chain = { select() { return chain; }, eq(key, value) { calls.push([table, key, value]); return chain; }, order() { return chain; }, single() { return chain; }, maybeSingle() { return chain; }, then(resolve, reject) { return Promise.resolve({ data: rows[table], error: failureTable === table ? { message: "private" } : null }).then(resolve, reject); } };
    return chain;
  } };
}
const family = load("../lib/family-context.ts", { "@/lib/supabase/server": { createClient: async () => client() }, "next/navigation": { redirect: path => { throw new Error("redirect:" + path); } } });
const loaded = await family.requireFamilyContext();
assert.equal(loaded.membership.role, "viewer"); assert.equal(loaded.activeChild.id, childId);
assert.ok(calls.some(([table, key, value]) => table === "family_members" && key === "user_id" && value === "user"));
for (const table of Object.keys(rows)) { failureTable = table; await assert.rejects(family.requireFamilyContext(), error => !error.message.startsWith("redirect:") && !error.message.includes("private")); }
failureTable = ""; authenticated = false; await assert.rejects(family.requireFamilyContext(), /redirect:\/auth\/login/);
authenticated = true;

// Export must fail atomically rather than return an apparently complete partial file.
rows.children = { id: childId, family_id: "family", nickname: "Synthetic" };
rows.child_language_goals = [{ id: "synthetic-goal", language_code: "hi", environment: { support: null }, environment_revision: 3 }];
rows.caregivers = [{ id: "synthetic-caregiver", display_name: "Synthetic adult", caregiver_languages: [{ language_code: "hi", proficiency: null, proficiency_reported: false }] }];
rows.family_calendar_settings = { time_zone: "Asia/Kolkata", revision: 2, updated_at: "2026-10-02T01:00:00Z" };
rows.export_aspiration_directions = [{aspiration_id:'synthetic-hope',hope:'Synthetic hope',direction:{horizon:'future',capabilities:[],tracks:['music']},revision:1}];
const exported = load("../app/family/export/route.ts", { "@/lib/supabase/server": { createClient: async () => client() } });
const req = { nextUrl: new URL("https://mira.test/family/export?child=" + childId) };
let response = await exported.GET(req);
assert.equal(response.status, 200); assert.equal(response.headers.get("Cache-Control"), "private, no-store");
const exportBody = await response.json();
assert.equal(exportBody.version, 8);
assert.deepEqual(exportBody.learning_directions, rows.export_aspiration_directions);
assert.ok(calls.some(([name,key,value])=>name==='export_aspiration_directions'&&key==='p_child_id'&&value===childId));
assert.deepEqual(exportBody.family_calendar, rows.family_calendar_settings);
assert.ok(calls.some(([table, key, value]) => table === "family_calendar_settings" && key === "family_id" && value === "family"));
assert.deepEqual(exportBody.language_goals, rows.child_language_goals);
assert.deepEqual(exportBody.caregivers, rows.caregivers);
assert.ok(calls.some(([table, key, value]) => table === "caregivers" && key === "family_id" && value === "family"));
for (const table of ["children", "families", "family_preferences", "aspirations", "child_language_goals", "plans", "activity_instances", "observations", "learning_moments", "saved_activities", "activity_content_versions", "activity_context_confirmations", "caregivers", "family_calendar_settings", "export_aspiration_directions"]) {
  failureTable = table; response = await exported.GET(req); assert.equal(response.status, 503, table);
  assert.equal(response.headers.get("Content-Disposition"), null); assert.ok(!(await response.text()).includes("private database"));
}
console.log("Pilot reliability checks passed: multilingual original text, strict metadata-only AI, no-AI save, acknowledgement/budget/child/role guards, context failures, and atomic export failure. Database behavior is mocked, not certified.");

let authFailure = { status: 0 };
class MockResponse extends Response {
  static next() { return { cookies: { set() {} } }; }
  static redirect(url) { return new Response(null, { status: 307, headers: { Location: String(url) } }); }
}
const proxy = load("../lib/supabase/proxy.ts", {
  "@supabase/ssr": { createServerClient: () => ({ auth: { getClaims: async () => ({ data: null, error: authFailure }) } }) },
  "next/server": { NextResponse: MockResponse }, "../utils": { hasEnvVars: true },
});
const route = new URL("https://mira.test/insights"); route.clone = () => new URL(route);
const fakeRequest = { nextUrl: route, cookies: { getAll: () => [], set() {} } };
for (const status of [0, 429, 500, 503]) {
  authFailure = { status }; const unavailable = await proxy.updateSession(fakeRequest);
  assert.equal(unavailable.status, 503); assert.equal(unavailable.headers.get("Location"), null);
}
authFailure = { status: 401 };
assert.equal((await proxy.updateSession(fakeRequest)).status, 307);
console.log("Session proxy checks passed: upstream outage fails closed with 503 rather than a misleading login redirect; invalid sessions redirect.");
