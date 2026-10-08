import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import { evidenceFixture } from './fixtures/activity-evidence.mjs';
const require=createRequire(import.meta.url);
function load(path,deps={}){const js=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const exports={};new Function('require','exports',js)(id=>id==='server-only'?{}:deps[id]??require(id),exports);return exports;}
const grounding=load('../lib/guide-grounding.ts');
const evidence=load('../lib/activity-evidence.ts',{'@/lib/guide-grounding':grounding});
const candidates=load('../lib/library-candidates.ts',{'@/lib/activity-evidence':evidence,'@/lib/activity-publication-context':load('../lib/activity-publication-context.ts')}),view=load('../lib/library-view.ts');
const id='11111111-1111-4111-8111-111111111111';
for(const patch of [{status:'pending_review'},{status:'retired'},{applicability:''},{not_supported:' '},{checked_on:'2026-02-30'},{review_due_on:'2026-08-31'},{evidence_type:'invented'},{source_url:'https://user:pass@example.org'},{source_url:'javascript:alert(1)'},{claim_text:'x'.repeat(1601)},{notes:{}}]) {
  const fixture=evidenceFixture();fixture[0].claim={...fixture[0].claim,...patch};assert.equal(evidence.parseActivityEvidence(fixture,id),null);
}
assert.equal(evidence.parseActivityEvidence([...evidenceFixture(),...evidenceFixture()],id),null);
const mismatched=evidenceFixture();mismatched[0].link.claim_id='wrong';assert.equal(evidence.parseActivityEvidence(mismatched,id),null);
const snapshot={id,title:'Synthetic',instructions:'Fixture only',content_version:1,review_status:'expert_reviewed'};
for(const type of ['practice_explanation','implementation_package','framework','professional_position','policy_statement']){const fixture=evidenceFixture();fixture[0].claim.evidence_type=type;assert.equal(evidence.parseActivityEvidence(fixture,id)[0].evidenceType,type);}
let result={data:[{template_id:id,template_snapshot:snapshot,evidence_snapshot:evidenceFixture()},{template_id:id,template_snapshot:snapshot,evidence_snapshot:evidenceFixture()}],error:null},calls=[];
const client={rpc:async(name,args)=>{calls.push({name,args});return result;}};
assert.deepEqual(await candidates.loadLibraryCandidates(client,'child','2026-10-10'),{ids:[id],snapshots:[snapshot],evidenceByTemplate:{[id]:evidence.parseActivityEvidence(evidenceFixture(),id)},error:null});
assert.deepEqual(calls[0],{name:'get_reviewed_library_context',args:{p_child_id:'child',p_on_date:'2026-10-10'}});
for(const source of [null,[],evidenceFixture('wrong'),[{...evidenceFixture()[0],claim:{...evidenceFixture()[0].claim,review_due_on:'2026-10-01'}}]]){
  result={data:[{template_id:id,template_snapshot:snapshot,evidence_snapshot:source}],error:null};assert.ok((await candidates.loadLibraryCandidates(client,'child','2026-10-10')).error);
}
for(const invalid of [null,{},[{template_id:'bad'}],[null],[{template_id:id}],[{template_id:id,template_snapshot:{...snapshot,id:'other'}}],[{template_id:id,template_snapshot:{...snapshot,review_status:'internal_prototype'}}]]){result={data:invalid,error:null};const r=await candidates.loadLibraryCandidates(client,'child','2026-10-10');assert.deepEqual(r.ids,[]);assert.ok(r.error);}
for(const code of ['PGRST202','42501','500']){result={data:[{template_id:id}],error:{code,message:'private detail'}};const r=await candidates.loadLibraryCandidates(client,'child','2026-10-10');assert.deepEqual(r.ids,[]);assert.ok(r.error);assert.ok(!r.error.includes('private detail'));}
for(const invalid of ['//evil.test','https://evil.test/library','/libraryevil','/library/../../settings','/library/%5c%5cevil.test','javascript:alert(1)'])assert.equal(view.safeLibraryReturn(invalid),'/library');
assert.equal(view.safeLibraryReturn(`/library/${id}?saved=1&q=book`),`/library/${id}?q=book&saved=1`);
for(const reason of ['MIRA_TEMPLATE_NOT_REVIEWED','MIRA_REVIEW_MISSING_OR_STALE','MIRA_AGE_OUTSIDE_REVIEWED_RANGE','MIRA_TIME_BUDGET_EXCEEDED','MIRA_SCREEN_PREFERENCE','MIRA_MISSING_PLANNING_CONTEXT'])assert.ok(view.activityEligibilityMessage(reason));
assert.equal(view.activityEligibilityMessage('private database text'),null);
console.log('Library candidate checks pass: shared child/date RPC, invalid/missing/error results fail closed, safe return paths and bounded eligibility messages. No live calls.');
