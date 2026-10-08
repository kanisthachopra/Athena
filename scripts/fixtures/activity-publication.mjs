// Fictional reviews/content for isolated tests. Never import into a hosted DB.
import {readFileSync} from 'node:fs';import{createRequire}from'node:module';import ts from'typescript';
import {contextFixture} from './activity-context-sql.mjs';
const require=createRequire(import.meta.url);
const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
function load(path,deps={}){const js=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;const exports={};new Function('require','exports',js)(id=>id==='server-only'?{}:deps[id]??require(id),exports);return exports;}
export function publicationFixture(today=new Date().toISOString().slice(0,10)) {
  const core=load('../../lib/research-content.ts',{'@/content/research/catalog.json':read('../../content/research/catalog.json')});
  const integrity=load('../../lib/research-bundle.ts',{'@/lib/research-content':core});
  const reviews=load('../../lib/research-review.ts',{'@/lib/research-content':core,'@/lib/research-bundle':integrity,'@/content/research/preflight-review.json':read('../../content/research/preflight-review.json')});
  const intake=load('../../lib/research-review-intake.ts',{'@/lib/research-bundle':integrity});
  const release=load('../../lib/activity-release.ts',{'@/lib/research-bundle':integrity,'@/lib/research-review-intake':intake,'@/lib/activity-context':load('../../lib/activity-context.ts')});
  const review=reviews.buildResearchReviewPackage(read('../../content/research/review-checkpoint.json'));
  const original=review.primitives.find(p=>p.generation?.status==='unreviewed_ai_draft');
  const candidate=release.createActivityReleaseDraft(review,original.primitive.id,0);
  for(const key of Object.keys(candidate.template))candidate.template[key]='SYNTHETIC SOFTWARE FIXTURE — NOT FOR FAMILY USE';
  Object.assign(candidate.template,{domain:'language',experience_type:'embedded',cleanup_level:'none',cost_level:'none',caregiver_skill_level:'basic',screen_requirement:'none',energy_level:'quiet',supervision_level:'continuous',min_age_months:0,max_age_months:83,duration_minutes:5,setup_minutes:0,materials:['Synthetic material'],setting:['Synthetic setting'],support_ladder:[],observation_prompts:['Synthetic prompt'],hazards:[],context_requirements:contextFixture});
  Object.assign(candidate.authoring,{languageVariety:'en-SG',readiness:'Synthetic readiness',exclusions:'Synthetic exclusions',changesFromDraft:'Fictional test completion only',unresolvedFindings:[]});
  candidate.associations={capabilities:[{code:'communication_language',emphasis:'primary',rationale:'Synthetic association'}],tracks:[{code:'languages',rationale:'Synthetic association'}]};
  const response=release.createActivityReleaseReview(candidate,review);
  response.submission.reviewers=[{id:'synthetic-reviewer',name:'FICTIONAL',qualifications:'None; software test only',relevantExpertise:'Fictional',conflictsOfInterest:'Fictional'}];
  for(const s of response.submission.sources)Object.assign(s,{reviewerId:'synthetic-reviewer',checkedOn:today,reviewDueOn:'2200-01-01',access:'full_relevant_material_appraised',appraisal:'Fictional source appraisal',limitations:'Fictional limitations',rightsAssessment:'Fictional rights statement'});
  const p=response.submission.primitives[0];Object.assign(p,{decision:'ready_for_editorial_decision',decisionReviewerId:'synthetic-reviewer',reviewedOn:today,reviewDueOn:'2200-01-01',ageMonths:{minimum:0,maximum:83},readinessAndExclusions:'Fictional',languageVarieties:['en-SG']});
  for(const check of p.checks)Object.assign(check,{reviewerId:'synthetic-reviewer',outcome:'acceptable',evidence:'Fictional locator, not actual review',requiredChanges:null});
  const decision={outcome:'publish',authorizationReference:'FICTIONAL TEST ONLY',reviewerVerification:'FICTIONAL TEST ONLY',independenceAssessment:'FICTIONAL TEST ONLY',sourceContentAndRightsAssessment:'FICTIONAL TEST ONLY',rationale:'FICTIONAL TEST ONLY'};
  return {candidate,response,review,release,decision,bundle:release.prepareActivityPublication(candidate,response,review,today)};
}
