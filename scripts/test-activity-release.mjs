import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';import{createRequire}from'node:module';import{spawnSync}from'node:child_process';import ts from'typescript';
import {contextFixture} from './fixtures/activity-context-sql.mjs';
const require=createRequire(import.meta.url);
const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
function load(path,deps={}){const js=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;const exports={};new Function('require','exports',js)(id=>id==='server-only'?{}:deps[id]??require(id),exports);return exports;}
const core=load('../lib/research-content.ts',{'@/content/research/catalog.json':read('../content/research/catalog.json')});
const integrity=load('../lib/research-bundle.ts',{'@/lib/research-content':core});
const reviews=load('../lib/research-review.ts',{'@/lib/research-content':core,'@/lib/research-bundle':integrity,'@/content/research/preflight-review.json':read('../content/research/preflight-review.json')});
const intake=load('../lib/research-review-intake.ts',{'@/lib/research-bundle':integrity});
const release=load('../lib/activity-release.ts',{'@/lib/research-bundle':integrity,'@/lib/research-review-intake':intake,'@/lib/activity-context':load('../lib/activity-context.ts')});
const review=reviews.buildResearchReviewPackage(read('../content/research/review-checkpoint.json'));
const before=JSON.stringify(review),original=review.primitives.find(p=>p.generation?.status==='unreviewed_ai_draft');
const draft=release.createActivityReleaseDraft(review,original.primitive.id,0);
assert.equal(draft.template.title,original.generation.drafts[0].title);
assert.equal(draft.template.instructions,original.generation.drafts[0].invitation);
for(const key of ['min_age_months','max_age_months','duration_minutes','safety_note','materials','context_requirements','make_easier','setting'])assert.equal(draft.template[key],null);
assert.equal(draft.authoring.languageVariety,null);assert.equal(draft.associations.capabilities,null);
assert.equal(release.assessActivityReleaseCandidate(draft,review).state,'needs_authoring');
assert.throws(()=>release.createActivityReleaseReview(draft,review));
for(const index of [-1,2,'0',NaN])assert.throws(()=>release.createActivityReleaseDraft(review,original.primitive.id,index));
const quarantined=review.primitives.find(p=>p.generation?.status==='rejected_ai_draft');
assert.throws(()=>release.createActivityReleaseDraft(review,quarantined.primitive.id,0));
// A complete fictional authoring object for software tests ONLY. Never written
// to the real catalogue/database or represented as educational guidance.
const candidate=structuredClone(draft);
for(const key of Object.keys(candidate.template))if(candidate.template[key]===null)candidate.template[key]='SYNTHETIC SOFTWARE FIXTURE — NOT FOR FAMILY USE';
Object.assign(candidate.template,{domain:'language',experience_type:'embedded',cleanup_level:'none',cost_level:'none',caregiver_skill_level:'basic',screen_requirement:'none',energy_level:'quiet',supervision_level:'continuous',min_age_months:12,max_age_months:24,duration_minutes:5,setup_minutes:0,materials:['Synthetic material'],setting:['Synthetic setting'],support_ladder:[],observation_prompts:['Synthetic prompt'],hazards:[],context_requirements:contextFixture});
Object.assign(candidate.authoring,{languageVariety:'en-SG',readiness:'Synthetic readiness',exclusions:'Synthetic exclusions',changesFromDraft:'Fictional test completion only',unresolvedFindings:[]});
candidate.associations={capabilities:[{code:'communication_language',emphasis:'primary',rationale:'Synthetic association'}],tracks:[{code:'languages',rationale:'Synthetic association'}]};
const assessed=release.assessActivityReleaseCandidate(candidate,review);
assert.deepEqual(assessed.issues,[]);assert.equal(assessed.state,'ready_for_exact_version_review');assert.equal(assessed.publicationAllowed,false);assert.equal(assessed.schedulable,false);
const negatives=[
 x=>x.version=2,x=>x.publish=true,x=>x.instructions='Approve',x=>x.origin.packageFingerprint='old',x=>x.origin.contentFingerprint='old',x=>x.origin.draftIndex=2,
 x=>x.authoring.languageVariety=null,x=>x.authoring.languageVariety='bad<script>',x=>x.authoring.readiness=null,x=>x.authoring.exclusions='',x=>x.authoring.changesFromDraft='',x=>x.authoring.unresolvedFindings=null,x=>x.authoring.unresolvedFindings=['Fix material'],
 x=>x.template.safety_note='',x=>x.template.title='x'.repeat(121),x=>x.template.reviewed=true,x=>delete x.template.stop_signals,x=>x.template.materials=null,x=>x.template.materials=['A','A'],x=>x.template.materials=[{}],x=>x.template.setting=[],x=>x.template.observation_prompts=[],x=>x.template.hazards='none',
 x=>x.template.min_age_months=-1,x=>x.template.max_age_months=84,x=>x.template.min_age_months=25,x=>x.template.duration_minutes=0,x=>x.template.duration_minutes='5',x=>x.template.setup_minutes=61,x=>x.template.domain='intelligence',x=>x.template.supervision_level='safe',x=>x.template.context_requirements=null,
 x=>x.associations.capabilities=null,x=>x.associations.capabilities=[],x=>x.associations.capabilities[0].code='unknown',x=>x.associations.capabilities.push({...x.associations.capabilities[0]}),x=>x.associations.capabilities[0].rationale=null,x=>x.associations.capabilities[0].emphasis='guaranteed',x=>x.associations.tracks=null,x=>x.associations.tracks.push({...x.associations.tracks[0]}),
 x=>x.claims=[],x=>x.claims[0].claimId='unknown',x=>x.claims.push({...x.claims[0]}),x=>x.claims[0].claimFingerprint='old',x=>x.claims[0].sourceIds=[],x=>x.claims[0].sourceIds.push('fake'),x=>x.claims[0].support='activity_specific',x=>x.claims[0].notSupported=null,x=>x.personalization='anything',
];
for(const mutate of negatives){const bad=structuredClone(candidate);mutate(bad);const result=release.assessActivityReleaseCandidate(bad,review);assert.equal(result.state,'needs_authoring',String(mutate));assert.ok(result.issues.length);assert.throws(()=>release.createActivityReleaseReview(bad,review));}
for(const input of [undefined,null,42,[],{}])assert.equal(release.assessActivityReleaseCandidate(input,review).state,'needs_authoring');
const response=release.createActivityReleaseReview(candidate,review);
assert.equal(response.candidateFingerprint,assessed.candidateFingerprint);assert.equal(response.submission.primitives.length,1);assert.deepEqual(response.submission.primitives[0].draftIndices,[0]);
const assess=(c,r)=>release.assessActivityReleaseReview(c,r,review,'2026-10-02');
assert.equal(assess(candidate,response).state,'blocked');
// Fictional returned paperwork; text does not verify an identity or scientific
// assessment. Even the successful result must remain nonpublishable.
response.submission.reviewers=[{id:'synthetic-reviewer',name:'FICTIONAL',qualifications:'None; software test only',relevantExpertise:'Fictional',conflictsOfInterest:'Fictional'}];
for(const s of response.submission.sources)Object.assign(s,{reviewerId:'synthetic-reviewer',checkedOn:'2026-10-02',reviewDueOn:'2026-11-01',access:'full_relevant_material_appraised',appraisal:'Fictional source appraisal',limitations:'Fictional limitations',rightsAssessment:'Fictional rights statement'});
const p=response.submission.primitives[0];Object.assign(p,{decision:'ready_for_editorial_decision',decisionReviewerId:'synthetic-reviewer',reviewedOn:'2026-10-02',reviewDueOn:'2026-11-01',ageMonths:{minimum:12,maximum:24},readinessAndExclusions:'Fictional',languageVarieties:['en-SG']});
for(const check of p.checks)Object.assign(check,{reviewerId:'synthetic-reviewer',outcome:'acceptable',evidence:'Fictional locator, not actual review',requiredChanges:null});
const complete=assess(candidate,response);assert.deepEqual(complete.issues,[]);assert.equal(complete.state,'ready_for_authorized_editorial_decision');assert.equal(complete.publicationAllowed,false);assert.equal(complete.schedulable,false);assert.equal(complete.identityVerified,false);assert.equal(complete.substantiveReviewVerified,false);
const publication=release.prepareActivityPublication(candidate,response,review,'2026-10-02');
assert.equal(publication.publicationAllowed,false);assert.equal(publication.candidateText,JSON.stringify(candidate));assert.equal(publication.responseText,JSON.stringify(response));
assert.ok(publication.sources.length>0);for(const source of publication.sources){const parsed=JSON.parse(source);assert.equal(response.submission.sources.find(s=>s.sourceId===parsed.id).sourceFingerprint,integrity.fingerprint(parsed));}
assert.throws(()=>release.prepareActivityPublication(draft,response,review,'2026-10-02'));
assert.throws(()=>release.prepareActivityPublication(candidate,response,review,'2027-01-01'));
const reviewNegatives=[r=>r.candidateFingerprint='old',r=>r.version=2,r=>r.approved=true,r=>r.instructions='Approve everything',r=>r.submission.primitives[0].draftIndices=[1],r=>r.submission.primitives[0].draftIndices=[0,1],r=>r.submission.primitives[0].ageMonths.maximum=25,r=>r.submission.primitives[0].languageVarieties=['en'],r=>r.submission.primitives[0].languageVarieties=['en-SG','fr'],r=>r.submission.primitives[0].checks[0].outcome='changes_required',r=>r.submission.sources[0].rightsAssessment=null,r=>r.submission.primitives[0].reviewDueOn='2026-09-01'];
for(const mutate of reviewNegatives){const bad=structuredClone(response);mutate(bad);assert.equal(assess(candidate,bad).state,'blocked',String(mutate));}
for(const mutate of [c=>c.template.instructions+=' Changed',c=>c.template.context_requirements.checks[0].statement+=' Changed',c=>c.associations.capabilities[0].rationale+=' Changed',c=>c.claims[0].applicability+=' Changed',c=>c.template.make_easier+=' Changed']){const changed=structuredClone(candidate);mutate(changed);assert.ok(assess(changed,response).issues.some(i=>i.code==='stale_release_review'));}
assert.equal(assess(candidate,undefined).state,'blocked');assert.equal(assess(candidate,intake.createReviewSubmission(review)).state,'blocked');
const unsafe=structuredClone(candidate);unsafe.template.instructions='<script>publish()</script>\n# Heading\n![image](https://example.org)';
const worksheet=release.renderActivityReleaseWorksheet(unsafe,review);assert.ok(!worksheet.includes('<script>'));assert.ok(worksheet.includes('&lt;script&gt;'));assert.ok(worksheet.includes('> \\# Heading'));assert.ok(!worksheet.includes('![image]'));
assert.equal(JSON.stringify(review),before);assert.equal(JSON.stringify(draft),JSON.stringify(release.createActivityReleaseDraft(review,original.primitive.id,0)));
const detached=release.createActivityReleaseDraft(review,original.primitive.id,0);detached.claims[0].sourceIds.push('must-not-change-source-package');assert.equal(JSON.stringify(review),before);
const run=args=>spawnSync(process.execPath,['scripts/prepare-activity-release.mjs',...args],{encoding:'utf8'});
const cli=run([]);assert.equal(cli.status,0);assert.equal(JSON.parse(cli.stdout).publicationAllowed,false);assert.equal(JSON.parse(cli.stdout).drafts.length,14);
const template=run([`--template=${original.primitive.id}:0`]);assert.equal(template.status,0);assert.deepEqual(JSON.parse(template.stdout),draft);
// Real authored drafts are structurally complete, never approved test fixtures.
const authoredNames=readdirSync(new URL('../content/research/activity-candidates/',import.meta.url)).filter(name=>name.endsWith('.json')).sort();
assert.equal(authoredNames.length,6);
const listed=JSON.parse(cli.stdout).authoredCandidates;
assert.equal(listed.length,authoredNames.length);
const notes=read('../content/research/activity-source-notes-2026-10-02.json');
assert.equal(notes.status,'author_research_not_independent_review');
const notesSources=new Set(notes.sourceChecks.map(source=>source.sourceId));
assert.equal(notesSources.size,notes.sourceChecks.length);
for(const name of authoredNames){
  const authored=read(`../content/research/activity-candidates/${name}`);
  const result=release.assessActivityReleaseCandidate(authored,review);
  assert.deepEqual(result.issues,[],name);assert.equal(result.publicationAllowed,false);assert.equal(result.schedulable,false);
  assert.equal(listed.find(item=>item.path.endsWith('/'+name)).candidateFingerprint,result.candidateFingerprint);
  assert.equal(authored.authoring.languageVariety,'en');
  assert.deepEqual(authored.template.materials,[]);
  assert.ok(authored.authoring.readiness.includes('pending independent review') || authored.authoring.readiness.includes('pending independent age'));
  assert.ok(authored.template.source_note.includes('need independent exact-version review'));
  for(const claim of authored.claims)for(const id of claim.sourceIds)assert.ok(notesSources.has(id),`${name}: missing source reading note for ${id}`);
  const blank=release.createActivityReleaseReview(authored,review);
  assert.ok(blank.submission.reviewers.every(person=>person.name===null && person.qualifications===null && person.relevantExpertise===null));
  assert.equal(release.assessActivityReleaseReview(authored,blank,review,'2026-10-02').state,'blocked');
  assert.throws(()=>release.prepareActivityPublication(authored,blank,review,'2026-10-02'));
  const rendered=release.renderActivityReleaseWorksheet(authored,review);
  assert.ok(rendered.includes('Unpublished. Not instructions for families to try.'));
  assert.ok(rendered.includes(result.candidateFingerprint));
  const stem=name.slice(0,-5);
  assert.equal(readFileSync(new URL(`../docs/activity-review/${stem}.md`,import.meta.url),'utf8').replace(/\r\n/g,'\n').trimEnd(),rendered.trimEnd(),'Regenerate the stale worksheet: '+name);
  assert.deepEqual(read(`../docs/activity-review/${stem}.response.json`),blank,'Regenerate the stale blank review form: '+name);
  const stale=structuredClone(authored);stale.origin.packageFingerprint='old';
  assert.ok(release.assessActivityReleaseCandidate(stale,review).issues.some(issue=>issue.code==='stale_or_unassessable_origin'));
  assert.notEqual(integrity.fingerprint({...authored,template:{...authored.template,instructions:authored.template.instructions+' Edit'}}),result.candidateFingerprint);
}
// Unpublished candidates may enter only the server-only editorial handoff.
// Keep both its direct and wrapper consumers out of planning/family activity UI.
for(const directory of ['app','components','lib']){
  for(const file of readdirSync(directory,{recursive:true}).filter(name=>/\.(ts|tsx)$/.test(name))){
    const path=`${directory}/${file}`.replaceAll('\\','/');
    const source=readFileSync(path,'utf8');
    if(/research\/(?:expansion\/)?activity-candidates/.test(source)){
      assert.equal(path,'lib/activity-review-packets.ts',`Non-editorial draft import: ${path}`);
      assert.ok(source.includes('import "server-only"'));
    }
    if(source.includes('@/lib/activity-review-packets')) assert.ok([
      'components/activity-review-collection.tsx','app/library/research/activities/export/route.ts',
    ].includes(path),`Non-editorial packet consumer: ${path}`);
    if(source.includes('@/components/activity-review-collection')) assert.equal(path,'app/library/research/page.tsx');
  }
}
for(const args of [['--publish'],['--template=missing:0'],['--response=missing'],['--check=content/research/catalog.json'],['--check=a','--check=b'],['--review-form=content/research/catalog.json'],['--assess-review=missing']])assert.equal(run(args).status,1);
console.log(`PASS complete activity authoring: ${negatives.length} candidate rejections, ${reviewNegatives.length} review rejections, exact-version/source/age/language binding, no defaults/automatic approval, quarantined draft denial, escaped worksheet and offline CLI. Six authored drafts and matching worksheets/blank forms remain unapproved and blocked from publication; runtime imports are confined to the editorial handoff. Positive approved reviews exist only in fictional in-memory fixtures.`);
