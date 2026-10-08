import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
const require=createRequire(import.meta.url);
const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),"utf8"));
function load(path,deps={}){const js=ts.transpileModule(readFileSync(new URL(path,import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;const exports={};new Function("require","exports",js)(id=>id==="server-only"?{}:deps[id]??require(id),exports);return exports;}
const catalog=read("../content/research/catalog.json"), checkpoint=read("../content/research/review-checkpoint.json"), preflight=read("../content/research/preflight-review.json");
const core=load("../lib/research-content.ts",{"@/content/research/catalog.json":catalog});
const integrity=load("../lib/research-bundle.ts",{"@/lib/research-content":core});
const review=load("../lib/research-review.ts",{"@/lib/research-content":core,"@/lib/research-bundle":integrity,"@/content/research/preflight-review.json":preflight});
const intake=load("../lib/research-review-intake.ts",{"@/lib/research-bundle":integrity});
const result=review.buildResearchReviewPackage(checkpoint);
assert.equal(result.publicationAllowed,false);assert.equal(result.state,"awaiting_independent_review");
assert.equal(result.primitives.length,catalog.primitives.length);
for(const item of result.primitives){assert.equal(item.schedulable,false);assert.equal(item.decision,null);assert.equal(item.approvedAgeMonths,null);assert.equal(item.reviewer.name,null);assert.ok(item.contentFingerprint);assert.ok(item.preflight.finding);assert.ok(item.checks.every(c=>c.outcome===null));}
const stale=structuredClone(checkpoint);stale.catalogHash="stale";
assert.throws(()=>review.buildResearchReviewPackage(stale));
let role="viewer";
const route=load("../app/library/research/export/route.ts",{"@/lib/research-review":review,"@/lib/research-review-intake":intake,"@/content/research/review-checkpoint.json":checkpoint,"@/lib/family-context":{requireFamilyContext:async()=>({membership:{role}})}});
const request=format=>new Request(`https://mira.test/library/research/export${format?`?format=${format}`:""}`);
assert.equal((await route.GET(request())).status,403);assert.equal((await route.GET(request("markdown"))).status,403);role="owner";
const response=await route.GET(request());assert.equal(response.status,200);assert.equal(response.headers.get("Cache-Control"),"private, no-store");
const exported=await response.json();assert.equal(exported.family,undefined);assert.equal(exported.publicationAllowed,false);
const worksheet=await route.GET(request("markdown"));assert.equal(worksheet.status,200);assert.equal(worksheet.headers.get("Cache-Control"),"private, no-store");assert.match(worksheet.headers.get("Content-Disposition"),/\.md"$/);
const text=await worksheet.text();assert.match(text,/Unpublished drafts/);assert.match(text,/until the seventh birthday/);
for(const item of result.primitives){assert.ok(text.includes(item.contentFingerprint));assert.ok(text.includes(item.primitive.id));}
assert.equal((text.match(/#### Reviewer record/g)??[]).length,catalog.primitives.length);
assert.equal((await route.GET(request("html"))).status,400);
const responseForm=await route.GET(request("response"));assert.equal(responseForm.status,200);
const responseTemplate=await responseForm.json();assert.equal(responseTemplate.packageFingerprint,integrity.fingerprint(result));
assert.ok(responseTemplate.primitives.every(p=>p.decision===null&&p.draftIndices.length===0));
role="viewer";assert.equal((await route.GET(request("response"))).status,403);
const unsafe=structuredClone(result);unsafe.primitives[0].generation.drafts[0].invitation="<script>alert(1)</script>\n# Not a heading";
const escaped=review.renderResearchReviewWorksheet(unsafe);assert.ok(!escaped.includes("<script>"));assert.ok(escaped.includes("&lt;script&gt;"));assert.ok(escaped.includes("> \\# Not a heading"));
console.log("Research review package checks pass: current provenance, explicit pending review, no publication, owner-only export, no family data and stale-catalog rejection. No provider calls.");
