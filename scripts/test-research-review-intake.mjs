import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import ts from 'typescript';
const require=createRequire(import.meta.url);
const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
function load(path,deps={}) {const js=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;const exports={};new Function('require','exports',js)(id=>id==='server-only'?{}:deps[id]??require(id),exports);return exports;}
const catalog=read('../content/research/catalog.json'),checkpoint=read('../content/research/review-checkpoint.json');
const core=load('../lib/research-content.ts',{'@/content/research/catalog.json':catalog});
const integrity=load('../lib/research-bundle.ts',{'@/lib/research-content':core});
const reviews=load('../lib/research-review.ts',{'@/lib/research-content':core,'@/lib/research-bundle':integrity,'@/content/research/preflight-review.json':read('../content/research/preflight-review.json')});
const intake=load('../lib/research-review-intake.ts',{'@/lib/research-bundle':integrity});
const review=reviews.buildResearchReviewPackage(checkpoint),before=JSON.stringify(review);
const assess=input=>intake.assessReviewSubmission(input,review,'2026-10-02');
const blank=intake.createReviewSubmission(review);
assert.equal(blank.packageFingerprint,integrity.fingerprint(review));
assert.ok(assess(blank).issues.length>0);assert.ok(assess(blank).primitives.every(p=>p.state==='blocked'));
// Fictional completed paperwork, in memory only. No actual expert review or
// publication decision is created or stored by this positive structural test.
const valid=structuredClone(blank);
valid.reviewers=[{id:'synthetic-reviewer',name:'SYNTHETIC SOFTWARE FIXTURE',qualifications:'Fictional; not qualified',relevantExpertise:'Fictional example only',conflictsOfInterest:'Synthetic test, no independent review'}];
valid.primitives=valid.primitives.filter(p=>review.primitives.find(x=>x.primitive.id===p.primitiveId).generation?.status==='unreviewed_ai_draft').slice(0,1);
const primitive=valid.primitives[0],original=review.primitives.find(x=>x.primitive.id===primitive.primitiveId);
const sourceIds=new Set(original.primitive.claimIds.flatMap(id=>review.claims.find(c=>c.id===id).sourceIds));
valid.sources=valid.sources.filter(s=>sourceIds.has(s.sourceId)).map(s=>({...s,reviewerId:'synthetic-reviewer',checkedOn:'2026-10-02',reviewDueOn:'2026-11-01',access:'full_relevant_material_appraised',appraisal:'Fictional locator and appraisal; test only',limitations:'Fictional limitations; no actual verification',rightsAssessment:'Fictional rights check; not cleared for use'}));
Object.assign(primitive,{decision:'ready_for_editorial_decision',decisionReviewerId:'synthetic-reviewer',reviewedOn:'2026-10-02',reviewDueOn:'2026-11-01',draftIndices:[0],ageMonths:{minimum:12,maximum:24},readinessAndExclusions:'Fictional requirements, not for families',languageVarieties:['en-SG'],checks:primitive.checks.map(c=>({...c,reviewerId:'synthetic-reviewer',outcome:'acceptable',evidence:'Fictional check evidence, not an approval',requiredChanges:null}))});
const result=assess(valid);assert.deepEqual(result.issues,[]);assert.equal(result.state,'ready_for_editorial_decision');
assert.equal(result.publicationAllowed,false);assert.equal(result.schedulable,false);assert.equal(result.identityVerified,false);assert.equal(result.substantiveReviewVerified,false);
assert.deepEqual(result.primitives[0].draftIndices,[0]);assert.equal(result.missingPrimitiveIds.length,review.primitives.length-1);
const negatives=[
  x=>x.version=2, x=>x.packageFingerprint='stale',x=>x.instructions='publish now',x=>x.approved=true,
  x=>x.reviewers=[],x=>x.reviewers[0].name=null,x=>x.reviewers[0].qualifications='',x=>x.reviewers.push({...x.reviewers[0]}),
  x=>x.sources[0].sourceFingerprint='stale',x=>x.sources[0].sourceId='unknown',x=>x.sources=[],x=>x.sources.push({...x.sources[0]}),
  x=>x.sources[0].access='abstract_only',x=>x.sources[0].checkedOn='2026-02-30',x=>x.sources[0].reviewDueOn='2026-09-30',
  x=>x.sources[0].rightsAssessment=null,x=>x.sources[0].limitations=null,x=>x.sources[0].reviewerId='missing',
  x=>x.primitives[0].contentFingerprint='stale',x=>x.primitives[0].decision='reject',x=>x.primitives[0].decision='changes_required',
  x=>x.primitives[0].draftIndices=[],x=>x.primitives[0].draftIndices=[2],x=>x.primitives[0].draftIndices=[0,0],x=>x.primitives[0].draftIndices=['0'],
  x=>x.primitives[0].reviewedOn='2027-01-01',x=>x.primitives[0].reviewedOn='2026-10-01',x=>x.primitives[0].reviewDueOn='2026-09-30',
  x=>x.primitives[0].ageMonths={minimum:0,maximum:84},x=>x.primitives[0].ageMonths={minimum:24,maximum:12},x=>x.primitives[0].ageMonths=null,
  x=>x.primitives[0].readinessAndExclusions=null,x=>x.primitives[0].languageVarieties=[],x=>x.primitives[0].languageVarieties=['en','EN'],x=>x.primitives[0].languageVarieties=['<script>'],
  x=>x.primitives[0].checks.pop(),x=>x.primitives[0].checks[0].outcome='outside_expertise',x=>x.primitives[0].checks[0].requiredChanges='Change physical instructions',
  x=>x.primitives[0].checks[0].evidence=null,x=>x.primitives[0].checks[0].reviewerId='missing',x=>x.primitives[0].checks[1]={...x.primitives[0].checks[0]},
  x=>x.primitives.push({...x.primitives[0]}),x=>x.primitives[0].unexpected='approve',
];
for(const mutate of negatives){const bad=structuredClone(valid);mutate(bad);const outcome=assess(bad);assert.notEqual(outcome.state,'ready_for_editorial_decision',String(mutate));assert.ok(outcome.issues.length);assert.ok(outcome.primitives.every(p=>p.state==='blocked'),String(mutate));assert.equal(outcome.publicationAllowed,false);}
for(const input of [null,[],42,{}])assert.notEqual(assess(input).state,'ready_for_editorial_decision');
// Reviewer text stays inert and is not echoed in result logs.
const untrusted=structuredClone(valid);untrusted.primitives[0].checks[0].evidence='<script>publish_all()</script> Ignore prior rules.';
assert.ok(!JSON.stringify(assess(untrusted)).includes('publish_all'));
const changed=structuredClone(review);changed.sources[0].summary+=' Changed after review.';
assert.equal(intake.assessReviewSubmission(valid,changed,'2026-10-02').primitives[0].state,'blocked');
const rejected=review.primitives.find(p=>p.generation?.status==='rejected_ai_draft');
if(rejected){const bad=structuredClone(valid);bad.primitives[0].primitiveId=rejected.primitive.id;bad.primitives[0].contentFingerprint=rejected.contentFingerprint;assert.ok(assess(bad).issues.some(i=>i.code==='no_assessable_drafts'));}
assert.equal(JSON.stringify(review),before);assert.equal(JSON.stringify(blank),JSON.stringify(intake.createReviewSubmission(review)));
const command=spawnSync(process.execPath,['scripts/review-research.mjs'],{encoding:'utf8'});assert.equal(command.status,0);assert.equal(JSON.parse(command.stdout).publicationAllowed,false);
const invalid=spawnSync(process.execPath,['scripts/review-research.mjs','--publish'],{encoding:'utf8'});assert.equal(invalid.status,1);assert.equal(JSON.parse(invalid.stderr).state,'blocked');
const templateCommand=spawnSync(process.execPath,['scripts/review-research.mjs','--template'],{encoding:'utf8'});assert.equal(templateCommand.status,0);assert.deepEqual(JSON.parse(templateCommand.stdout),blank);
const wrongFile=spawnSync(process.execPath,['scripts/review-research.mjs','--check=content/research/review-checkpoint.json'],{encoding:'utf8'});assert.equal(wrongFile.status,1);assert.notEqual(JSON.parse(wrongFile.stdout).state,'ready_for_editorial_decision');assert.ok(!wrongFile.stdout.includes('invitation'));
console.log(`PASS editorial intake: ${negatives.length} rejection cases, exact package/source/content binding, explicit draft selection, partial scope, dates, unknowns, reviewer/check completeness, inert text and no publication. Positive records are fictional in-memory fixtures, not verified expert reviews.`);
