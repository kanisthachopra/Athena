import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import{createRequire}from'node:module';import ts from'typescript';
const require=createRequire(import.meta.url);
function load(path,deps={}){const js=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const exports={};new Function('require','exports',js)(id=>id==='server-only'?{}:deps[id]??require(id),exports);return exports;}
const allowance=load('../lib/ai/extraction-budget.ts'),provider=load('../lib/ai/nebius.ts');
const prefs=load('../lib/ai-preferences.ts'),permission=load('../lib/ai/permission.ts',{'@/lib/ai-preferences':prefs});
const profile=load('../lib/ai/profile-extractor.ts',{'@/lib/ai/nebius':provider,'@/lib/profile-proposal':load('../lib/profile-proposal.ts')});
const journal=load('../lib/journal-entry.ts');
const observation=load('../lib/ai/observation-extractor.ts',{'@/lib/ai/nebius':provider,'@/lib/journal-entry':journal});
const id='11111111-1111-4111-8111-111111111111',child='22222222-2222-4222-8222-222222222222';
let role,enabled,checks,fetches,calls,attempts,reserveData,reserveError,attemptError,finishError,finishData,withdrawAfterResponse,responseContent,usage,replyStatus,withdrawBeforeRetry;
function reset(){role='owner';enabled=true;checks=0;fetches=0;calls=[];attempts=0;reserveData=id;reserveError=null;attemptError=null;finishError=null;finishData=true;withdrawAfterResponse=false;withdrawBeforeRetry=false;replyStatus=200;usage={prompt_tokens:10,completion_tokens:5};responseContent=null;}
reset();
const client={from(table){assert.equal(table,'family_ai_preferences','No old count/hash logging query');return{select(){return this;},eq(){return this;},async maybeSingle(){checks++;return{error:null,data:{guide_enabled:false,profile_enabled:enabled,journal_enabled:enabled,policy_version:prefs.AI_POLICY_VERSION,revision:1}};}};},async rpc(name,args){
  calls.push({name,args});
  if(name==='reserve_extraction_request')return{data:reserveData,error:reserveError};
  if(name==='begin_extraction_request_attempt')return{data:++attempts,error:attemptError};
  if(name==='finish_extraction_request')return{data:finishData,error:finishError};
  throw Error('Unexpected RPC');
}};
const common={'@/lib/ai/extraction-budget':allowance,'@/lib/ai/nebius':provider,'@/lib/ai/permission':permission,'@/lib/family-context':{requireFamilyContext:async()=>({supabase:client,membership:{family_id:'family',role},activeChild:{id:child}})}};
const profileAction=load('../app/setup/propose-actions.ts',{...common,'@/lib/ai/profile-extractor':profile});
const journalAction=load('../app/insights/actions.ts',{...common,'@/lib/ai/observation-extractor':observation,'@/lib/journal-entry':journal,'next/cache':{revalidatePath(){}}});
const form=values=>{const f=new FormData();for(const[k,v]of Object.entries(values))f.set(k,v);return f;};
const note='We have 10 minutes on weekdays. A synthetic family note.';
const profileForm=()=>form({familyNote:note,requestId:'ignored-client-id'});
const journalForm=()=>form({rawNote:'Original note: 再来一次. مرحبا. A sound repeated.',occurredOn:'2026-10-02',childId:child,allowAi:'on',requestId:'ignored-client-id'});
const previousFetch=globalThis.fetch,previousKey=process.env.NEBIUS_API_KEY;
try {
  process.env.NEBIUS_API_KEY='synthetic-only';
  globalThis.fetch=async(_url,options)=>{
    fetches++;
    if(withdrawBeforeRetry)attemptError={message:'MIRA_EXTRACTION_PERMISSION'};
    if(replyStatus!==200)return new Response('{}',{status:replyStatus});
    const body=JSON.parse(options.body);
    const content=responseContent??(body.response_format.json_schema.name==='mira_profile_proposal'?{suggestions:[{field:'weekdayMinutes',value:'10',evidence:'10 minutes on weekdays'}]}:{title:'A repeated sound',domain:'language'});
    if(withdrawAfterResponse)enabled=false;
    return Response.json({model:'synthetic',choices:[{finish_reason:'stop',message:{content:JSON.stringify(content)}}],usage});
  };
  const operations=[
    {feature:'profile',run:()=>profileAction.proposeProfile({},profileForm()),positive:r=>Array.isArray(r.suggestions),negative:r=>r.suggestions===null},
    {feature:'journal',run:()=>journalAction.proposeLearningMoment({},journalForm()),positive:r=>r.source==='ai',negative:r=>r.source!=='ai'},
  ];
  for(const op of operations){
    reset();let result=await op.run();assert.equal(result.error,null);assert.ok(op.positive(result));assert.equal(fetches,1);assert.equal(checks,2);
    assert.deepEqual(calls.map(c=>c.name),['reserve_extraction_request','begin_extraction_request_attempt','finish_extraction_request']);assert.equal(calls[0].args.p_feature,op.feature);assert.equal(calls[0].args.p_family_id,'family');assert.equal(calls.at(-1).args.p_prompt_tokens,10);assert.equal(calls.at(-1).args.p_request_id,id);
    assert.ok(!JSON.stringify(calls).includes('ignored-client-id'));assert.ok(!JSON.stringify(calls).includes('Original note'));assert.ok(!JSON.stringify(calls).includes(note));assert.ok(!JSON.stringify(calls).includes('input_hash'));
    for(const bad of [null,{},'not-a-uuid']){reset();reserveData=bad;result=await op.run();assert.ok(op.negative(result));assert.equal(fetches,0);assert.equal(calls.length,1);}
    reset();enabled=false;result=await op.run();assert.ok(op.negative(result));assert.equal(fetches,0);assert.equal(calls.length,0);
    reset();role='viewer';result=await op.run();assert.ok(op.negative(result));assert.equal(fetches,0);assert.equal(calls.length,0);
    for(const code of ['MIRA_EXTRACTION_ALLOWANCE_REACHED','MIRA_EXTRACTION_REPORTED_TOKEN_LIMIT','private database detail']){reset();reserveError={message:code};result=await op.run();assert.ok(op.negative(result));assert.equal(fetches,0);assert.ok(!JSON.stringify(result).includes('private database'));if(op.feature==='journal'&&code!=='private database detail'){assert.equal(result.source,'fallback');assert.equal(result.proposal.domain,'everyday');}}
    reset();withdrawBeforeRetry=true;replyStatus=503;result=await op.run();assert.ok(op.negative(result));assert.equal(fetches,1);assert.equal(attempts,2);assert.equal(calls.filter(c=>c.name==='reserve_extraction_request').length,1);assert.equal(calls.at(-1).args.p_outcome,'failed');
    reset();withdrawAfterResponse=true;result=await op.run();assert.ok(op.negative(result));assert.equal(fetches,1);assert.equal(calls.at(-1).args.p_outcome,'failed');assert.equal(calls.at(-1).args.p_prompt_tokens,10);
    reset();usage=undefined;result=await op.run();assert.ok(op.positive(result));assert.equal(calls.at(-1).args.p_prompt_tokens,null);assert.equal(calls.at(-1).args.p_completion_tokens,null);
    reset();responseContent={unrecognized:'invalid model result'};result=await op.run();assert.ok(op.negative(result));assert.equal(fetches,1);assert.equal(calls.at(-1).args.p_outcome,'failed');assert.equal(calls.at(-1).args.p_prompt_tokens,null);
    for(const error of [true,false]){reset();if(error)finishError={message:'private finalization error'};else finishData=false;result=await op.run();assert.ok(op.negative(result));assert.equal(fetches,1);assert.equal(calls.filter(c=>c.name==='finish_extraction_request').length,1);assert.ok(!JSON.stringify(result).includes('private finalization'));}
    reset();replyStatus=503;finishError={message:'private log failure'};result=await op.run();assert.ok(op.negative(result));assert.equal(fetches,2);assert.equal(attempts,2);assert.equal(calls.filter(c=>c.name==='reserve_extraction_request').length,1);assert.equal(calls.at(-1).args.p_prompt_tokens,null);
    reset();delete process.env.NEBIUS_API_KEY;result=await op.run();assert.ok(op.negative(result));assert.equal(fetches,0);assert.equal(calls.length,0);process.env.NEBIUS_API_KEY='synthetic-only';
  }
  reset();const wrongChild=journalForm();wrongChild.set('childId',id);assert.ok((await journalAction.proposeLearningMoment({},wrongChild)).error);assert.equal(fetches,0);assert.equal(calls.length,0);
  reset();const denied=journalForm();denied.delete('allowAi');assert.ok((await journalAction.proposeLearningMoment({},denied)).error);assert.equal(fetches,0);
  reset();const short=profileForm();short.set('familyNote','no');assert.ok((await profileAction.proposeProfile({},short)).error);assert.equal(calls.length,0);
  reset();const budget=allowance.extractionRequestBudget(client,'family','profile');await budget.finish('failed');assert.equal(calls.length,0);await budget.beforeRequest();await budget.beforeRequest();await assert.rejects(()=>budget.beforeRequest(),allowance.ExtractionBudgetError);assert.equal(calls.filter(c=>c.name==='reserve_extraction_request').length,1);
} finally {globalThis.fetch=previousFetch;if(previousKey===undefined)delete process.env.NEBIUS_API_KEY;else process.env.NEBIUS_API_KEY=previousKey;}
console.log('PASS actual profile/journal actions + extractors/provider adapter with mocked transport: pre-dispatch reservations, role/feature/child binding, withdrawal before retries/display, bounded attempts, unknown usage, finalization failure, local fallback and no original-text/hash logging. No real calls or credentials.');
