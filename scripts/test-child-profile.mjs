import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const require=createRequire(import.meta.url);
function load(path,deps={}) {
  const code=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const exports={};new Function('require','exports',code)(id=>deps[id]??require(id),exports);return exports;
}
const profile=load('../lib/child-profile.ts');
assert.equal(profile.birthMonthLabel(2024,1),'January 2024');
assert.equal(profile.birthContextError(2026,10,'2026-10-01'),null);
assert.match(profile.birthContextError(2026,11,'2026-10-31'),/future/);
assert.equal(profile.birthContextError(2027,1,'2027-01-01'),null);
for(const args of [[2027,1,'2026-12-31'],[2000,1,'2026-01-01'],[2024,0,'2026-01-01'],[2024,1.5,'2026-01-01']])assert.ok(profile.birthContextError(...args));
const version='2026-10-02T02:03:04.123456+00:00',next='2026-10-02T02:03:04.123457+00:00';
assert.equal(profile.isProfileVersion(version),true);
for(const v of ['','2026-10-02','infinity',null,'2026-10-02T02:03:04.1234567Z'])assert.equal(profile.isProfileVersion(v),false);
let role='owner',calendarFail=false,rpcResult={data:{updatedAt:next},error:null},calls=[],invalidated=[];
const actions=load('../app/family/actions.ts',{
  '@/lib/child-profile':profile,
  '@/lib/profile-creation':load('../lib/profile-creation.ts'),
  '@/lib/family-calendar':{loadFamilyCalendar:async()=>{if(calendarFail)throw Error('private');return {today:'2026-10-02'};}},
  '@/lib/family-context':{requireFamilyContext:async()=>({membership:{family_id:'family',role},children:[{id:'child'}],supabase:{rpc:async(name,args)=>{calls.push({name,args});return rpcResult;}}})},
  'next/cache':{revalidatePath:(...args)=>invalidated.push(args)},'next/navigation':{redirect:()=>{throw Error('redirect');}},
});
const form=patch=>{const f=new FormData();for(const[k,v]of Object.entries({childId:'child',updatedAt:version,nickname:'Synthetic',birthYear:'2024',birthMonth:'1',...patch}))f.set(k,v);return f;};
for(const patch of [{childId:'other'},{updatedAt:''},{nickname:' '},{nickname:'x'.repeat(61)},{birthYear:'2026',birthMonth:'12'},{birthYear:'2027'},{birthMonth:'0'}])assert.ok((await actions.updateChildProfile({},form(patch))).error);
role='viewer';assert.match((await actions.updateChildProfile({},form())).error,/Caregiver/);role='owner';
calendarFail=true;assert.match((await actions.updateChildProfile({},form())).error,/calendar/);calendarFail=false;
assert.equal(calls.length,0);
assert.equal((await actions.updateChildProfile({},form())).updatedAt,next);
assert.deepEqual(calls[0],{name:'update_child_profile_checked',args:{p_child_id:'child',p_expected_updated_at:version,p_nickname:'Synthetic',p_birth_year:2024,p_birth_month:1}});
assert.equal(invalidated.length,1);
for(const message of ['MIRA_STALE_CHILD_PROFILE','private SQL detail']) {
  rpcResult={data:null,error:{message}};
  const failed=await actions.updateChildProfile({},form());assert.equal(failed.refreshRequired,true);assert.equal(failed.success,null);assert.ok(!failed.error.includes('private'));
}
rpcResult={data:{updatedAt:'invalid'},error:null};assert.equal((await actions.updateChildProfile({},form())).success,null);
let state={error:null,success:null,updatedAt:version,refreshRequired:false},pending=false,handler;
const {ChildProfileForm}=load('../components/child-profile-form.tsx',{
  '@/lib/child-profile':profile,'@/app/family/actions':actions,
  react:{...React,useState:initial=>[initial,()=>{}],useActionState:fn=>{handler=fn;return [state,()=>{},pending];}},
});
const draw=()=>renderToStaticMarkup(React.createElement(ChildProfileForm,{child:{id:'child',nickname:'طفل / बच्चा',birth_year:2024,birth_month:1,updated_at:version},today:'2026-10-02'}));
let html=draw();assert.match(html,/dir="auto"/);assert.match(html,/value="طفل \/ बच्चा"/);assert.match(html,/123456\+00:00/);
let resetPrevented=false;
ChildProfileForm({child:{id:'child',nickname:'Synthetic',birth_year:2024,birth_month:1,updated_at:version},today:'2026-10-02'}).props.onReset({preventDefault(){resetPrevented=true;}});
assert.equal(resetPrevented,true);
pending=true;html=draw();assert.match(html,/fieldset disabled/);assert.match(html,/aria-busy="true"/);assert.match(html,/Saving/);pending=false;
state={...state,refreshRequired:true,error:'Stale profile'};html=draw();assert.match(html,/role="alert"/);assert.match(html,/Compare saved profile \(new tab\)/);assert.match(html,/Discard these edits and reload/);assert.match(html,/fieldset disabled/);
state={...state,refreshRequired:false,error:null,success:'Profile saved.'};assert.match(draw(),/role="status"/);
rpcResult={data:null,error:{message:'MIRA_FUTURE_BIRTH_MONTH'}};
const failed=await handler({...state,updatedAt:next},form());assert.equal(failed.updatedAt,next);assert.equal(failed.success,null);
console.log('PASS profile helpers/actions/form: family-date boundaries, exact microseconds, role/child/version binding, no write on invalid/calendar failure, redacted uncertain errors, preserved version on validation failure, controlled multilingual fields and pending/stale/success states. Mocked transport/SSR.');

let authError=null,membershipError=null,signedIn=true,membership=null,queries=[];
const onboarding=load('../app/onboarding/page.tsx',{
  '@/lib/supabase/server':{createClient:async()=>({auth:{getClaims:async()=>({data:{claims:signedIn?{sub:'user'}:null},error:authError})},from:table=>{const q={select:()=>q,eq:(key,value)=>{queries.push({table,key,value});return q;},maybeSingle:async()=>({data:membership,error:membershipError})};return q;}})},
  '@/components/profile-creation-form':{ProfileCreationForm:()=>React.createElement('form',{'aria-label':'Create family'})},
  'next/link':{default:({children,...props})=>React.createElement('a',props,children)},
  'next/navigation':{redirect:path=>{throw Error('redirect:'+path);}},
}).default;
assert.match(renderToStaticMarkup(await onboarding()),/Create family/);
assert.deepEqual(queries,[{table:'family_members',key:'user_id',value:'user'}]);
membership={family_id:'family'};await assert.rejects(onboarding(),/redirect:\/today/);
membershipError={message:'private'};await assert.rejects(onboarding(),/family access could not be loaded/);
authError={message:'private'};await assert.rejects(onboarding(),/session could not be checked/);
authError=null;signedIn=false;await assert.rejects(onboarding(),/redirect:\/auth\/login/);
console.log('PASS onboarding read: current-user membership binding, existing-family redirect, upstream/multiple-membership errors cannot become false new-family forms, signed-out redirect. Mocked transport.');
