import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const require=createRequire(import.meta.url);
function load(path,deps={}) {
  const js=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const exports={};new Function('require','exports',js)(id=>deps[id]??require(id),exports);return exports;
}
const lib=load('../lib/activity-replacement.ts'), view=load('../lib/library-view.ts');
const instance='11111111-1111-4111-8111-111111111111', template='22222222-2222-4222-8222-222222222222';
const snapshot={id:template,instructions:'Synthetic <script> text only',content_version:1};
const form=()=>{const f=new FormData();Object.entries({instanceId:instance,templateId:template,revision:'4',templateSnapshot:JSON.stringify(snapshot)}).forEach(([k,v])=>f.set(k,v));return f;};
assert.deepEqual(lib.parseReplacement(form()),{instanceId:instance,templateId:template,revision:4,templateSnapshot:snapshot});
for(const [key,values] of Object.entries({instanceId:['bad'],templateId:['bad'],revision:['','0','-1','1.5','1e3','2147483648'],templateSnapshot:['null','[]','{',JSON.stringify({id:instance}),'x'.repeat(100001)]})) {
  for(const value of values){const f=form();f.set(key,value);assert.equal(lib.parseReplacement(f),null);}
}
let role='owner',contextError=null,hasTarget=true,rpcError=null,throwRpc=false,calls=[],invalidations=[];
const client={from(){const q={select(){return q;},eq(k,v){calls.push({filter:[k,v]});return q;},async maybeSingle(){return {data:hasTarget?{id:instance}:null,error:contextError};}};return q;},async rpc(name,args){calls.push({name,args});if(throwRpc)throw Error('secret provider text');return {error:rpcError};}};
const actions=load('../app/library/actions.ts',{
  '@/lib/family-context':{requireFamilyContext:async()=>({supabase:client,membership:{role},activeChild:{id:'selected-child'}})},
  '@/lib/activity-replacement':lib,'@/lib/library-view':view,
  'next/cache':{revalidatePath:path=>invalidations.push(path)},
  'next/navigation':{redirect:path=>{throw Object.assign(new Error('redirect'),{location:path});}},
});
const submit=()=>actions.replaceActivity(lib.initialReplacementState,form());
role='viewer';assert.match((await submit()).error,/caregiver/);assert.equal(calls.length,0);
role='owner';hasTarget=false;assert.match((await submit()).error,/selected child/);assert.ok(!calls.some(x=>x.name));
hasTarget=true;contextError={message:'private'};assert.ok((await submit()).error);assert.ok(!calls.some(x=>x.name));contextError=null;
for(const message of ['MIRA_STALE_ACTIVITY','MIRA_STALE_REPLACEMENT','MIRA_ACTIVITY_HAS_OBSERVATION','MIRA_ACTIVITY_NOT_REPLACEABLE','MIRA_REPLACEMENT_UNCHANGED','MIRA_TIME_BUDGET_EXCEEDED','private SQL failure']) {
  rpcError={message};const result=await submit();assert.ok(result.error);assert.ok(result.refreshRequired);assert.ok(!result.error.includes('private SQL failure'));assert.equal(invalidations.length,0);
}
rpcError={code:'PGRST202'};assert.match((await submit()).error,/database update/);
rpcError=null;throwRpc=true;assert.match((await submit()).error,/whether the replacement was saved/);throwRpc=false;
calls=[];await assert.rejects(submit(),e=>e.location===`/activity/${instance}`);
assert.deepEqual(calls.find(x=>x.name),{name:'replace_planned_activity_checked',args:{p_instance_id:instance,p_template_id:template,p_expected_revision:4,p_expected_template:snapshot}});
assert.ok(calls.some(x=>x.filter?.[0]==='child_id'&&x.filter[1]==='selected-child'));
assert.deepEqual(invalidations,['/today','/week',`/activity/${instance}`]);

// Synthetic server renders of the form's states (not browser interaction proof).
for(const [state,pending,label] of [[lib.initialReplacementState,false,'Use this instead'],[lib.initialReplacementState,true,'Checking and replacing…'],[lib.replacementFailure('MIRA_STALE_ACTIVITY'),false,'Refresh alternatives']]) {
  const {ReplaceActivityForm}=load('../components/replace-activity-form.tsx',{
    react:{...React,useActionState:()=>[state,()=>{},pending]},
    '@/app/library/actions':{replaceActivity(){}},'@/lib/activity-replacement':lib,
  });
  const html=renderToStaticMarkup(React.createElement(ReplaceActivityForm,{instanceId:instance,revision:4,templateSnapshot:snapshot,returnTo:`/library?replace=${instance}`}));
  assert.ok(html.includes(label));assert.ok(html.includes('Synthetic &lt;script&gt; text only'));
  assert.equal(html.includes('disabled=""'),pending||state.refreshRequired);
  assert.equal(html.includes('role="alert"'),Boolean(state.error));
}
console.log('Replacement checks pass: bounded inputs, selected-child/role binding, exact checked RPC payload, specific stale errors, uncertain transport failure, confirmed-only redirect, pending and retained inline-error renders. No live data or provider calls.');
