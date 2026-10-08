import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
function load(path) {
  const js = ts.transpileModule(readFileSync(new URL(path, import.meta.url),'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const exports={}; new Function('require','exports',js)(id=>id==='server-only'?{}:require(id),exports); return exports;
}
const {guideRequestBudget,GuideBudgetError}=load('../lib/ai/guide-budget.ts');
const id='11111111-1111-4111-8111-111111111111';
let calls=[],attempts=0,reserveError=null,attemptError=null,finishError=null,reserveData=id;
const client={async rpc(name,args){
  calls.push({name,args});
  if(name==='reserve_guide_request')return {data:reserveData,error:reserveError};
  if(name==='begin_guide_request_attempt')return {data:++attempts,error:attemptError};
  return {data:!finishError,error:finishError};
}};
const newBudget=()=>guideRequestBudget(client,'synthetic-family');
await newBudget().finish('failed'); assert.equal(calls.length,0,'No provider authorization means no reservation/finalization');
for(const data of [null,{},'bad-id']) { reserveData=data; await assert.rejects(newBudget().beforeRequest(),GuideBudgetError); }
reserveData=id;reserveError={message:'MIRA_GUIDE_ALLOWANCE_REACHED'};
await assert.rejects(newBudget().beforeRequest(),/past 24 hours/);
reserveError={message:'private SQL error'};
await assert.rejects(newBudget().beforeRequest(),e=>e instanceof GuideBudgetError&&!e.message.includes('private'));
reserveError=null;calls=[];attempts=0;
const budget=newBudget();await budget.beforeRequest();await budget.beforeRequest();
assert.equal(calls.filter(x=>x.name==='reserve_guide_request').length,1);
assert.equal(calls.filter(x=>x.name==='begin_guide_request_attempt').length,2);
await assert.rejects(budget.beforeRequest(),GuideBudgetError);
await budget.finish('failed');
const report=calls.at(-1).args;assert.equal(report.p_prompt_tokens,null);assert.equal(report.p_completion_tokens,null);
assert.equal(report.p_request_id,id);
await budget.finish('succeeded',{model:'synthetic',promptTokens:0,completionTokens:0,latencyMs:1,usageKnown:false});
assert.equal(calls.at(-1).args.p_prompt_tokens,null);
await budget.finish('succeeded',{model:'synthetic',promptTokens:3,completionTokens:2,latencyMs:1,usageKnown:true});
assert.equal(calls.at(-1).args.p_prompt_tokens,3);
finishError={message:'unknown transaction outcome'};
await assert.rejects(budget.finish('succeeded',{model:'synthetic',promptTokens:3,completionTokens:2,latencyMs:1}),/request record/);
finishError=null;
const provider=load('../lib/ai/nebius.ts');const priorFetch=globalThis.fetch,priorKey=process.env.NEBIUS_API_KEY;
try {
  process.env.NEBIUS_API_KEY='synthetic';let fetches=0;attempts=0;calls=[];
  globalThis.fetch=async()=>{fetches++;attemptError={message:'MIRA_GUIDE_PERMISSION'};return new Response('{}',{status:503});};
  const retryBudget=newBudget();
  await assert.rejects(provider.createStructuredCompletion({system:'fixture',user:'fixture',schemaName:'fixture',schema:{type:'object'},beforeRequest:retryBudget.beforeRequest}),GuideBudgetError);
  assert.equal(fetches,1);assert.equal(attempts,2);assert.equal(calls.filter(x=>x.name==='reserve_guide_request').length,1);
} finally {globalThis.fetch=priorFetch;if(priorKey===undefined)delete process.env.NEBIUS_API_KEY;else process.env.NEBIUS_API_KEY=priorKey;}
console.log('PASS Guide reservation/attempt/finalization boundaries and retry denial. Mock transport only; no credits used.');
