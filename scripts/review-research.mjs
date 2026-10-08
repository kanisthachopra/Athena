// Offline editorial intake. Never loads env, calls a model, writes files,
// approves database content or reads family records.
import { readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { selectResearchBatch, loadResearchBatch } from './research-batches.mjs';
const require = createRequire(import.meta.url);
function load(path, dependencies={}) {
  const js=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  const exports={}; new Function('require','exports',js)(id=>id==='server-only'?{}:dependencies[id]??require(id),exports);return exports;
}
const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
try {
  const batch=selectResearchBatch(process.argv.slice(2));
  const args=batch.args;
  if(args.length>1 || (args.length===1 && !['--template','--worksheet','--package'].includes(args[0]) && !args[0].startsWith('--check=')))throw Error('Invalid options');
  const {core,integrity}=loadResearchBatch(batch);
  const review=load('../lib/research-review.ts',{'@/lib/research-content':core,'@/lib/research-bundle':integrity,'@/content/research/preflight-review.json':read(`${batch.directory}preflight-review.json`)});
  const intake=load('../lib/research-review-intake.ts',{'@/lib/research-bundle':integrity});
  const current=review.buildResearchReviewPackage(read(`${batch.directory}review-checkpoint.json`));
  if(args[0]==='--template')console.log(JSON.stringify(intake.createReviewSubmission(current),null,2));
  else if(args[0]==='--worksheet')console.log(review.renderResearchReviewWorksheet(current));
  else if(args[0]==='--package')console.log(JSON.stringify(current,null,2));
  else if(args[0]?.startsWith('--check=')) {
    const path=args[0].slice(8);
    if(!path || statSync(path).size>1024*1024)throw Error('Invalid input');
    const input=JSON.parse(readFileSync(path,'utf8').replace(/^\uFEFF/,''));
    const result=intake.assessReviewSubmission(input,current);
    console.log(JSON.stringify(result,null,2));
    if(result.state!=='ready_for_editorial_decision')process.exitCode=1;
  } else console.log(JSON.stringify({mode:'read-only',packageFingerprint:integrity.fingerprint(current),primitiveCount:current.primitives.length,publicationAllowed:false,commands:['--template','--check=path-to-completed-response.json']},null,2));
} catch {
  console.error(JSON.stringify({state:'blocked',message:'The input or current review package could not be validated. No publication, provider request, file write or family change occurred.'}));
  process.exitCode=1;
}
