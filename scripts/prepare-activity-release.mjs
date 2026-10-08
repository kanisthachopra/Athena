// Offline complete-template authoring/review. No environment, network, database
// writes, AI calls, reviewer verification, SQL generation or publication.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { selectResearchBatch, loadResearchBatch } from './research-batches.mjs';
const require=createRequire(import.meta.url);
function load(path,deps={}) {
  const js=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  const exports={};new Function('require','exports',js)(id=>id==='server-only'?{}:deps[id]??require(id),exports);return exports;
}
const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
function readInput(path) {
  if(!path || !statSync(path).isFile() || statSync(path).size>1024*1024)throw Error('Invalid input file');
  return JSON.parse(readFileSync(path,'utf8').replace(/^\uFEFF/,''));
}
try {
  const batch=selectResearchBatch(process.argv.slice(2));
  const args=batch.args;
  const allowed=['template','check','review-form','worksheet','assess-review','publication-package','response'];
  const options=new Map();
  for(const arg of args){const match=/^--([^=]+)=(.+)$/.exec(arg);if(!match || !allowed.includes(match[1]) || options.has(match[1]))throw Error('Invalid options');options.set(match[1],match[2]);}
  const mode=[...options.keys()].filter(key=>key!=='response');
  if(mode.length>1 || (options.has('response')!==(options.has('assess-review')||options.has('publication-package'))))throw Error('Invalid option combination');
  const {core,integrity}=loadResearchBatch(batch);
  const reviews=load('../lib/research-review.ts',{'@/lib/research-content':core,'@/lib/research-bundle':integrity,'@/content/research/preflight-review.json':read(`${batch.directory}preflight-review.json`)});
  const intake=load('../lib/research-review-intake.ts',{'@/lib/research-bundle':integrity});
  const release=load('../lib/activity-release.ts',{'@/lib/research-bundle':integrity,'@/lib/research-review-intake':intake,'@/lib/activity-context':load('../lib/activity-context.ts')});
  let review=reviews.buildResearchReviewPackage(read(`${batch.directory}review-checkpoint.json`));
  const supplementalPath=`${batch.directory}authoring-sources.json`;
  if (existsSync(new URL(supplementalPath,import.meta.url))) {
    const supplement=load('../lib/research-authoring-sources.ts',{'@/lib/research-bundle':integrity});
    review=supplement.addAuthoringSources(review,read(supplementalPath));
  }
  let result;
  if(mode[0]==='template') {
    const match=/^([a-z0-9-]+):(0|[1-9][0-9]*)$/.exec(options.get('template'));
    if(!match)throw Error('Invalid draft selection');
    result=release.createActivityReleaseDraft(review,match[1],Number(match[2]));
  } else if(mode.length) {
    const candidate=readInput(options.get(mode[0]));
    if(mode[0]==='check') {result=release.assessActivityReleaseCandidate(candidate,review);if(result.issues.length)process.exitCode=1;}
    if(mode[0]==='review-form')result=release.createActivityReleaseReview(candidate,review);
    if(mode[0]==='worksheet')result=release.renderActivityReleaseWorksheet(candidate,review);
    if(mode[0]==='assess-review') {result=release.assessActivityReleaseReview(candidate,readInput(options.get('response')),review);if(result.issues.length)process.exitCode=1;}
    if(mode[0]==='publication-package')result=release.prepareActivityPublication(candidate,readInput(options.get('response')),review);
  } else result={mode:'read-only',publicationAllowed:false,commands:['--template=primitive-id:zero-based-draft-index','--check=candidate.json','--worksheet=candidate.json','--review-form=candidate.json','--assess-review=candidate.json --response=completed-release-review.json','--publication-package=candidate.json --response=completed-release-review.json'],drafts:review.primitives.filter(p=>p.generation?.status==='unreviewed_ai_draft').flatMap(p=>p.generation.drafts.map((draft,index)=>({primitiveId:p.primitive.id,draftIndex:index,title:draft.title})))};
  if (!mode.length) {
    // Offline authoring only. These files are never imported by the planner.
    const candidatesDirectory = `${batch.directory}activity-candidates/`;
    result.authoredCandidates = (existsSync(new URL(candidatesDirectory, import.meta.url)) ? readdirSync(new URL(candidatesDirectory, import.meta.url)) : [])
      .filter(name => /^[a-z0-9-]+\.json$/.test(name)).sort().map(name => {
        const candidate = read(`${candidatesDirectory}${name}`);
        const assessment = release.assessActivityReleaseCandidate(candidate, review);
        return { path: `${candidatesDirectory.slice(3)}${name}`, title: candidate.template?.title,
          proposedAgeMonths: [candidate.template?.min_age_months, candidate.template?.max_age_months],
          language: candidate.authoring?.languageVariety, ...assessment };
      });
  }
  console.log(typeof result==='string'?result:JSON.stringify(result,null,2));
} catch {
  console.error(JSON.stringify({state:'blocked',message:'The candidate or exact-version review could not be validated. No files, family records, approvals or provider settings were changed.'}));
  process.exitCode=1;
}
