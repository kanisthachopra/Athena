import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {loadResearchModule as load,readResearchJson as read,loadResearchBatch,selectResearchBatch} from './research-batches.mjs';
const {core,integrity}=loadResearchBatch(selectResearchBatch(['--batch=play-expansion']));
const reviews=load('../lib/research-review.ts',{'@/lib/research-content':core,'@/lib/research-bundle':integrity,'@/content/research/preflight-review.json':read('../content/research/expansion/preflight-review.json')});
const supplement=load('../lib/research-authoring-sources.ts',{'@/lib/research-bundle':integrity});
const intake=load('../lib/research-review-intake.ts',{'@/lib/research-bundle':integrity});
const release=load('../lib/activity-release.ts',{'@/lib/research-bundle':integrity,'@/lib/research-review-intake':intake,'@/lib/activity-context':load('../lib/activity-context.ts')});
const base=reviews.buildResearchReviewPackage(read('../content/research/expansion/review-checkpoint.json'));
const original=JSON.stringify(base),input=read('../content/research/expansion/authoring-sources.json'),originalInput=JSON.stringify(input);
const current=supplement.addAuthoringSources(base,input);
assert.equal(JSON.stringify(base),original);assert.equal(JSON.stringify(input),originalInput);
assert.notEqual(integrity.fingerprint(base),integrity.fingerprint(current));
assert.deepEqual(current.claims,base.claims);assert.equal(current.catalogHash,base.catalogHash);
for(const item of current.primitives) {
  const before=base.primitives.find(p=>p.primitive.id===item.primitive.id);
  assert.deepEqual(item.primitive,before.primitive);assert.deepEqual(item.generation,before.generation);assert.equal(item.contentFingerprint,before.contentFingerprint);
  if(item.primitive.id==='open-mark-making')assert.deepEqual(item.authoringSourceIds,['aap-art-materials-2024']);
  else assert.equal(item.authoringSourceIds,undefined);
}
const negatives=[x=>x.version=2,x=>x.approved=true,x=>x.basePackageFingerprint='old',x=>x.sources=[],x=>x.sources.push({...x.sources[0]}),x=>x.sources[0].id=base.sources[0].id,x=>x.sources[0].title='',x=>x.sources[0].year='2024',x=>x.sources[0].url='javascript:alert(1)',x=>x.sources[0].url='https://user:password@example.org',x=>x.sources[0].rights=null,x=>x.bindings=[],x=>x.bindings.push({...x.bindings[0]}),x=>x.bindings[0].primitiveId='small-movement-mirror',x=>x.bindings[0].primitiveId='missing',x=>x.bindings[0].sourceIds=['missing'],x=>x.bindings[0].sourceIds.push(x.bindings[0].sourceIds[0]),x=>x.sources.push({...x.sources[0],id:'unbound'})];
for(const mutate of negatives){const bad=structuredClone(input);mutate(bad);assert.throws(()=>supplement.addAuthoringSources(base,bad),String(mutate));}
for(const bad of [null,undefined,42,[],{}])assert.throws(()=>supplement.addAuthoringSources(base,bad));
assert.throws(()=>supplement.addAuthoringSources(current,input));
const candidate=read('../content/research/expansion/activity-candidates/marks-of-their-own.json');
assert.deepEqual(release.assessActivityReleaseCandidate(candidate,current).issues,[]);
assert.equal(release.assessActivityReleaseCandidate(candidate,base).state,'needs_authoring');
const blank=release.createActivityReleaseReview(candidate,current);
assert.deepEqual(blank.submission.sources.map(s=>s.sourceId),['naeyc-process-art-2023','aap-art-materials-2024']);
assert.equal(release.assessActivityReleaseReview(candidate,blank,current,'2026-10-02').state,'blocked');
assert.throws(()=>release.prepareActivityPublication(candidate,blank,current,'2026-10-02'));
// Fictional paperwork only, in memory. No actual person, approval or publishing.
const response=structuredClone(blank);response.submission.reviewers=[{id:'fictional',name:'FICTIONAL TEST',qualifications:'Synthetic',relevantExpertise:'Synthetic',conflictsOfInterest:'Synthetic'}];
for(const s of response.submission.sources)Object.assign(s,{reviewerId:'fictional',checkedOn:'2026-10-02',reviewDueOn:'2026-11-01',access:'full_relevant_material_appraised',appraisal:'Synthetic',limitations:'Synthetic',rightsAssessment:'Synthetic'});
for(const p of response.submission.primitives){Object.assign(p,{decision:'ready_for_editorial_decision',decisionReviewerId:'fictional',reviewedOn:'2026-10-02',reviewDueOn:'2026-11-01',ageMonths:{minimum:48,maximum:71},readinessAndExclusions:'Synthetic',languageVarieties:['en']});for(const check of p.checks)Object.assign(check,{reviewerId:'fictional',outcome:'acceptable',evidence:'Synthetic',requiredChanges:null});}
const result=release.assessActivityReleaseReview(candidate,response,current,'2026-10-02');
assert.deepEqual(result.issues,[]);assert.equal(result.publicationAllowed,false);assert.equal(result.identityVerified,false);
const transport=release.prepareActivityPublication(candidate,response,current,'2026-10-02');
assert.deepEqual(transport.sources.map(source=>JSON.parse(source).id),['naeyc-process-art-2023','aap-art-materials-2024']);
for(const mutate of [r=>r.submission.sources.pop(),r=>r.submission.sources[1].sourceFingerprint='old',r=>r.submission.sources[1].rightsAssessment=null,r=>r.submission.sources[1].checkedOn='2026-10-03',r=>r.submission.sources[1].reviewDueOn='2026-10-01']) {
  const bad=structuredClone(response);mutate(bad);assert.equal(release.assessActivityReleaseReview(candidate,bad,current,'2026-10-02').state,'blocked');assert.throws(()=>release.prepareActivityPublication(candidate,bad,current,'2026-10-02'));
}
const changedInput=structuredClone(input);changedInput.sources[0].limit+=' Revised.';
const changedPackage=supplement.addAuthoringSources(base,changedInput);
assert.equal(release.assessActivityReleaseCandidate(candidate,changedPackage).state,'needs_authoring');
const changedCandidate=structuredClone(candidate);changedCandidate.template.materials[0]+=' Changed.';
assert.equal(release.assessActivityReleaseReview(changedCandidate,response,current,'2026-10-02').state,'blocked');
const worksheet=release.renderActivityReleaseWorksheet(candidate,current);
assert.ok(worksheet.includes('Later authoring sources'));assert.ok(worksheet.includes('aap-art-materials-2024'));
assert.equal(readFileSync(new URL('../docs/activity-review/marks-of-their-own.md',import.meta.url),'utf8').trimEnd(),worksheet.trimEnd());
assert.deepEqual(read('../docs/activity-review/marks-of-their-own.response.json'),blank);
const cli=spawnSync(process.execPath,['scripts/prepare-activity-release.mjs','--batch=play-expansion','--assess-review=content/research/expansion/activity-candidates/marks-of-their-own.json','--response=docs/activity-review/marks-of-their-own.response.json'],{encoding:'utf8'});
assert.equal(cli.status,1);assert.equal(JSON.parse(cli.stdout).state,'blocked');
assert.equal(JSON.stringify(base),original);
console.log('PASS authoring-source supplements: immutable generation, exact scoped source appraisal, stale/cross-package denial, unchanged efficacy claims, source-complete transport, unapproved full art candidate and unanswered-review denial. Positive paperwork is fictional only.');
