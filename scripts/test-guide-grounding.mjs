import assert from 'node:assert/strict';
import { calendarFixture } from './fixtures/family-calendar.mjs';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { evidenceFixture } from './fixtures/activity-evidence.mjs';
const require=createRequire(import.meta.url);
function load(path,deps={}) { deps={'@/lib/family-calendar':calendarFixture,...deps};const js=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;const exports={};new Function('require','exports',js)(id=>id==='server-only'?{}:deps[id]??require(id),exports);return exports; }
const grounding=load('../lib/guide-grounding.ts');
for(const bad of ['javascript:alert(1)','http://example.org','https://user:pass@example.org','https://localhost','https://127.0.0.1','https://[::1]','https://site.internal','https://example.org:444'])assert.equal(grounding.publicSourceUrl(bad),null);
assert.equal(grounding.publicSourceUrl('https://www.who.int/publications'),'https://www.who.int/publications');
const option={id:'11111111-1111-4111-8111-111111111111',title:'Synthetic book',summary:'Synthetic summary',instructions:'Synthetic instructions',adult_role:'Synthetic role',safety_note:'Synthetic safety',stop_signals:'Synthetic stop',materials:['Synthetic book']};
const evidence=load('../lib/activity-evidence.ts',{'@/lib/guide-grounding':grounding});
const claim=evidenceFixture()[0].claim;
const evidenceByTemplate={[option.id]:evidence.parseActivityEvidence(evidenceFixture(),option.id)};
let candidates={ids:[option.id],snapshots:[option],evidenceByTemplate,error:null};
const contextModule=load('../lib/guide-context.ts',{'@/lib/activity-publication-context':load('../lib/activity-publication-context.ts'),'@/lib/library-candidates':{loadLibraryCandidates:async()=>candidates},'@/lib/guide-grounding':grounding});
const client={from(){throw Error('Guide must not re-read mutable evidence joins');}};
const retrieve=()=>contextModule.loadGuideContext(client,'synthetic-child','A question about books','2026-10-01');
const valid=await retrieve();assert.equal(valid.error,null);assert.equal(valid.context.options[0].id,option.id);assert.equal(valid.context.claims[0].id,claim.id);
const publicationContext={schema_version:1,language_variety:'en-SG',readiness:'Fictional readiness',exclusions:'Fictional exclusion',associations:{capabilities:[{code:'communication_language',emphasis:'primary',rationale:'Fictional opportunity'}],tracks:[]}};
candidates={...candidates,snapshots:[{...option,publication_context:publicationContext}]};
const withPublication=await retrieve();assert.match(withPublication.context.options[0].safety,/Fictional readiness/);assert.match(withPublication.context.options[0].safety,/Fictional exclusion/);
candidates={...candidates,snapshots:[option]};
assert.equal((await retrieve()).fingerprint,valid.fingerprint);
candidates={...candidates,evidenceByTemplate:{[option.id]:[{...evidenceByTemplate[option.id][0],editorialNotes:'Changed source note'}]}};assert.notEqual((await retrieve()).fingerprint,valid.fingerprint);
candidates={...candidates,evidenceByTemplate:{}};assert.ok((await retrieve()).error);
candidates={...candidates,evidenceByTemplate,error:'private SQL'};const failed=await retrieve();assert.ok(failed.error);assert.ok(!failed.error.includes('private'));
candidates={ids:[],snapshots:[],evidenceByTemplate,error:null};assert.match((await retrieve()).error,/no reviewed activity/);
candidates={ids:[option.id],snapshots:[{...option,safety_note:undefined}],error:null};assert.ok((await retrieve()).error);
for(const field of ['summary','instructions','adult_role','safety_note','stop_signals']) {
  candidates={ids:[option.id],snapshots:[{...option,[field]:'  '}],error:null};assert.ok((await retrieve()).error);
}
candidates={ids:[option.id],snapshots:[option],evidenceByTemplate,error:null};
const answer={kind:'grounded',answer:'These are synthetic options for a test only.',activity_ids:[option.id],claim_ids:[claim.id],next_steps:['leave_open']};
const result=grounding.guideReferenceSelection(answer,valid.context);assert.equal(result.sources[0].url,claim.source_url);assert.equal(result.activities[0].title,option.title);
assert.deepEqual(grounding.guideReferenceSelection({...answer,next_steps:[]},valid.context).tryNext,[]);
assert.throws(()=>grounding.guideReferenceSelection({...answer,next_steps:['leave_open','leave_open']},valid.context));
for(const patch of [{activity_ids:['invented']},{claim_ids:['invented']},{claim_ids:[]},{activity_ids:[]},{next_steps:['invent steps']},{answer:'Cut off mid'},{answer:'Use https://evil.example.'},{answer:'<script>text</script>.'},{extra:'unknown'},{kind:'unknown'}])assert.throws(()=>grounding.guideReferenceSelection({...answer,...patch},valid.context));
const unsupported={kind:'not_supported',answer:'',activity_ids:[],claim_ids:[],next_steps:[]};assert.match(grounding.guideReferenceSelection(unsupported,valid.context).answer,/not covered/);
assert.throws(()=>grounding.guideReferenceSelection({...unsupported,answer:'Unreviewed advice.'},valid.context));

// Test the real server action with mocked context/provider/database transport.
let aiCalls=0,permission=true,retrievals=0,contextFailure=false,changeAt=0,allowance=0,logs=[],childChanged=false,childReads=0,changeChildAt=0,finishFails=false;
class PermissionError extends Error {}
let calendarReads=0,calendarChangeAt=0,calendarFails=false;
const actions=load('../app/ask/actions.ts',{
  '@/lib/family-calendar':{loadFamilyCalendar:async()=>{calendarReads++;if(calendarFails)throw Error('Private clock failure');return {today:'2026-10-02',timeZone:'Asia/Kolkata',revision:calendarChangeAt&&calendarReads>=calendarChangeAt?2:1};}},
  '@/lib/age-context':{ageContext:()=>({scope:'within_target',minimumMonths:35,maximumMonths:36})},
  '@/lib/ai/guide-budget':load('../lib/ai/guide-budget.ts'),
  '@/lib/family-context':{requireFamilyContext:async()=>({membership:{family_id:'family'},userId:'user',activeChild:{id:'child',birth_year:2023,birth_month:10},supabase:{
    async rpc(name,args){
      if(name==='reserve_guide_request')return allowance===null?{error:{message:'private error'}}:allowance>=20?{error:{message:'MIRA_GUIDE_ALLOWANCE_REACHED'}}:{data:'11111111-1111-4111-8111-111111111111',error:null};
      if(name==='begin_guide_request_attempt')return {data:1,error:null};
      assert.equal(name,'finish_guide_request');logs.push(args);return {data:!finishFails,error:null};
    },
    from(table){assert.equal(table,'children');return {select(){return this;},eq(){return this;},async maybeSingle(){childReads++;return {data:{birth_year:childChanged||(changeChildAt&&childReads>=changeChildAt)?2022:2023,birth_month:10},error:null};}};}}})},
  '@/lib/ai/permission':{AiPermissionError:PermissionError,familyAiAuthorizer:()=>async()=>{if(!permission)throw new PermissionError('Feature off');}},
  '@/lib/guide-context':{loadGuideContext:async()=>{retrievals++;return contextFailure?{error:'No reviewed context',context:null,fingerprint:null}:{...valid,fingerprint:changeAt&&retrievals>=changeAt?'changed':valid.fingerprint};}},
  '@/lib/ai/ask-copilot':{askCopilot:async args=>{await args.beforeRequest();aiCalls++;return {answer:result,model:'synthetic',promptTokens:1,completionTokens:1,latencyMs:1};}},
  '@/lib/ai/nebius':{AiProviderError:class extends Error{}},
});
const form=new FormData();form.set('question','A synthetic question about books');
const ask=()=>actions.askMira({},form);
permission=false;assert.match((await ask()).error,/off/);assert.equal(aiCalls,0);assert.equal(retrievals,0);
permission=true;contextFailure=true;assert.match((await ask()).error,/No reviewed/);assert.equal(aiCalls,0);assert.equal(logs.length,0);
contextFailure=false;retrievals=0;changeAt=2;assert.match((await ask()).error,/changed/);assert.equal(aiCalls,0);
retrievals=0;changeAt=3;assert.match((await ask()).error,/changed/);assert.equal(aiCalls,1);
retrievals=0;changeAt=0;assert.deepEqual((await ask()).answer,result);assert.equal(aiCalls,2);
assert.ok(logs.every(row=>!Object.hasOwn(row,'question')&&!Object.hasOwn(row,'answer')));
allowance=null;assert.match((await ask()).error,/allowance/);assert.equal(aiCalls,2);
allowance=20;assert.match((await ask()).error,/24 hours/);assert.equal(aiCalls,2);
allowance=0;childChanged=true;assert.match((await ask()).error,/changed/);assert.equal(aiCalls,2);
childChanged=false;childReads=0;changeChildAt=2;assert.match((await ask()).error,/changed/);assert.equal(aiCalls,3);
changeChildAt=0;
finishFails=true;assert.match((await ask()).error,/request record/);assert.equal(aiCalls,4);finishFails=false;
assert.ok(logs.every(row=>!Object.hasOwn(row,'p_question')&&!Object.hasOwn(row,'p_input_hash')));
calendarFails=true;assert.match((await ask()).error,/No AI request was sent/);assert.equal(aiCalls,4);calendarFails=false;
calendarReads=0;calendarChangeAt=2;assert.match((await ask()).error,/changed/);assert.equal(aiCalls,4);
calendarReads=0;calendarChangeAt=3;assert.match((await ask()).error,/changed/);assert.equal(aiCalls,5);calendarChangeAt=0;
let stateIndex=0;
const {AskMiraForm}=load('../components/ask-mira-form.tsx',{
  '@/components/source-records':load('../components/source-records.tsx'),
  react:{...React,useRef:()=>({current:null}),useState:initial=>{stateIndex++;return [stateIndex===2?[{question:'Synthetic question',answer:result}]:initial,()=>{}];}},
  '@/app/ask/actions':{askMira(){}},
  'next/link':{default:({children,...props})=>React.createElement('a',props,children)},
});
const html=renderToStaticMarkup(React.createElement(AskMiraForm,{availability:'enabled'}));
for(const text of ['Sources behind this response','Synthetic source','Synthetic mechanism only','Synthetic scope note','Read preparation','Where this applies','What this does not establish'])assert.ok(html.includes(text),text);
assert.ok(html.includes(`href="/library/${option.id}"`));assert.ok(html.includes('href="https://example.org/study"'));
assert.ok(html.includes('rel="noopener noreferrer"'));
console.log('Guide grounding checks pass: scoped and bounded eligible context, current approved source records, invalid/unknown/unrelated reference denial, controlled abstention/actions, no-AI empty context, permission/allowance failure, pre/post-answer revalidation and metadata-only logging. Synthetic responses only; not semantic or clinical certification.');
