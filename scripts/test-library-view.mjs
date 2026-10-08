import assert from "node:assert/strict";
import { calendarFixture } from './fixtures/family-calendar.mjs';
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
const require = createRequire(import.meta.url);
function compile(path, overrides = {}) {
  overrides = { '@/lib/family-calendar': calendarFixture, ...overrides };
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  new Function("require", "exports", js)(id => id==='@/lib/activity-publication-context'?compile('../lib/activity-publication-context.ts'):overrides[id] ?? require(id), exports);
  return exports;
}
const lib = compile("../lib/library-view.ts");
const id = "11111111-1111-4111-8111-111111111111";
const filters = lib.libraryFilters({ q: "  book cloth  ", domain: "language", saved: "1", replace: id });
assert.equal(filters.q, "book cloth");
assert.deepEqual(lib.libraryFilters(Object.fromEntries(new URL(lib.libraryUrl(filters), "https://mira.test").searchParams)), filters);
assert.equal(lib.libraryFilters({ domain: "toString", replace: "//evil.test", q: ["one", "two"] }).domain, "");
assert.equal(lib.libraryFilters({ replace: "//evil.test" }).replace, "");
assert.equal(lib.libraryFilters({ q: "a".repeat(150) }).q.length, 100);
const item = { title: "A BOOK", summary: "Shared sounds", materials: ["soft cloth"] };
assert.equal(lib.matchesLibrarySearch(item, "book CLOTH"), true);
assert.equal(lib.matchesLibrarySearch(item, "book water"), false);
assert.equal(lib.matchesLibrarySearch(item, ""), true);
assert.equal(lib.matchesLibrarySearch(item, "%"), false);
const sourceRecords=compile('../components/source-records.tsx');
const { ActivityPreparation } = compile("../components/activity-preparation.tsx", { "@/lib/library-view": lib, '@/components/source-records':sourceRecords });
const template = { domain: "language", duration_minutes: 5, setup_minutes: 1, cleanup_level: "low", materials: ["Fixture book"], parent_preparation: "Fixture preparation", adult_role: "Fixture role", conversation_prompt: "Fixture words", look_for: "Fixture noticing", observation_prompts: [], support_ladder: ["Fixture help"], child_choices: "Fixture choice", make_easier: "Fixture easier", extend_activity: "Fixture variation", stop_signals: "Fixture stop", avoid_prompt: "Fixture avoid", safety_note: "Fixture safety", supervision_level: "close", hazards: ["fixture-hazard"], why_it_matters: "Fixture purpose", source_note: "Synthetic test only", review_status: "internal_prototype", content_version: 1, activity_template_capabilities: [], activity_template_tracks: [] };
const html = renderToStaticMarkup(React.createElement(ActivityPreparation, { title: "Synthetic idea", instructions: "Fixture instructions", template, selectionReason: "Fixture reason" }));
for (const text of ["Fixture safety", "Fixture stop", "Fixture avoid", "Fixture instructions", "Fixture choice", "Fixture help", "Fixture noticing", "Fixture reason", "not independently reviewed"]) assert.ok(html.includes(text), text);
assert.ok(html.indexOf("Fixture safety") < html.indexOf("Start here"));
assert.ok(html.indexOf("Fixture stop") < html.indexOf("<details>"));
assert.equal((html.match(/<h1/g) ?? []).length, 1);
assert.equal((html.match(/<details>/g) ?? []).length, 4);
console.log("Library tests passed: filter normalization/roundtrip, safe context, search, preparation content and safety ordering.");

// An ineligible saved choice stays removable but cannot expose activity
// instructions or a replacement control. This is a synthetic server render.
let role = "owner", candidateFailure = null;
const rowId = "22222222-2222-4222-8222-222222222222";
const fakeClient = { from(table) {
  const chain = { select() { return chain; }, eq() { return chain; }, in() { return chain; }, order() { return chain; }, maybeSingle() { return chain; }, then(resolve, reject) {
    return Promise.resolve({ data: table === "saved_activities" ? [{ template_id: rowId }] : table === "activity_templates" ? [{ id: rowId, title: "Synthetic old bookmark", domain: "language" }] : [], error: null }).then(resolve, reject);
  } }; return chain;
} };
const libraryPage = compile("../app/library/page.tsx", {
  "@/components/replace-activity-form": { ReplaceActivityForm: () => React.createElement("button", null, "Use this instead") },
  "@/components/app-header": { AppHeader: () => null },
  "@/components/save-activity-form": { SaveActivityForm: ({ removeLabel }) => React.createElement("button", null, removeLabel ?? "Save idea") },
  "@/lib/family-context": { requireFamilyContext: async () => ({ supabase: fakeClient, membership: { role }, family: { display_name: "Synthetic family" }, activeChild: { id, nickname: "Synthetic child" } }) },
  "@/lib/library-candidates": { loadLibraryCandidates: async () => ({ ids: [], snapshots: [], error: candidateFailure }) },
  "@/lib/library-view": lib,
  "next/link": { default: ({ children, ...props }) => React.createElement("a", props, children) },
}).default;
const renderLibrary = async () => renderToStaticMarkup(await libraryPage({ searchParams: Promise.resolve({ saved: "1" }) }));
const ownerHtml = await renderLibrary();
assert.ok(ownerHtml.includes("Synthetic old bookmark")); assert.ok(ownerHtml.includes("Remove saved idea"));
assert.ok(!ownerHtml.includes("Read preparation")); assert.ok(!ownerHtml.includes("Use this instead"));
role = "viewer"; assert.ok(!(await renderLibrary()).includes("Remove saved idea"));
candidateFailure = "Eligibility is unavailable";
const unavailableHtml = await renderLibrary(); assert.ok(unavailableHtml.includes("Eligibility is unavailable"));
assert.ok(!unavailableHtml.includes("No reviewed activity is available"));
assert.ok(unavailableHtml.includes('Library check unavailable'));
assert.ok(!unavailableHtml.includes('checked against'));
assert.ok(!unavailableHtml.includes('0 ideas'));
console.log("Library server-render checks pass: unavailable bookmarks preserved, owner removal available, viewer read-only and failure distinct from empty. No live data.");
