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
const profile=load('../lib/child-profile.ts'),creation=load('../lib/profile-creation.ts');
const id='11111111-1111-4111-8111-111111111111',saved='22222222-2222-4222-8222-222222222222';
for(const v of [null,[],{},'not-a-uuid',''])assert.equal(creation.isCreationId(v),false);
assert.equal(creation.isCreationId(id),true);
for(const message of ['MIRA_CREATION_REQUEST_CHANGED','MIRA_CREATION_REMOVED','MIRA_FAMILY_ALREADY_EXISTS','private SQL']) {
  const s=creation.creationFailure(message);assert.equal(s.checkSaved,true);assert.equal(s.createdId,null);assert.ok(!s.error.includes('private'));
}
let authError=null,user='user',role='owner',calendarFail=false,result={data:saved,error:null},calls=[],invalidations=[],transportFail=false;
const client={auth:{getClaims:async()=>({data:{claims:{sub:user}},error:authError})},rpc:async(name,args)=>{calls.push({name,args});if(transportFail)throw Error('private transport');return result;}};
const deps={
  '@/lib/child-profile':profile,'@/lib/profile-creation':creation,
  '@/lib/supabase/server':{createClient:async()=>client},
  '@/lib/family-calendar':{loadFamilyCalendar:async()=>{if(calendarFail)throw Error('private calendar');return {today:'2026-10-02'};}},
  '@/lib/family-context':{requireFamilyContext:async()=>({supabase:client,membership:{family_id:'family',role}})},
  'next/cache':{revalidatePath:(...args)=>invalidations.push(args)},
  'next/navigation':{redirect:path=>{throw Error('redirect:'+path);}},
};
const initial=creation.emptyCreationState;
const onboarding=load('../app/onboarding/actions.ts',deps),family=load('../app/family/actions.ts',deps);
const form=patch=>{const f=new FormData();for(const[k,v]of Object.entries({requestId:id,userId:'user',familyId:'family',familyName:'Synthetic family',nickname:'طفل / बच्चा',birthMonth:'1',birthYear:String(new Date().getUTCFullYear()-1),...patch}))f.set(k,v);return f;};
for(const patch of [{requestId:''},{userId:'other'},{familyName:' '},{nickname:'x'.repeat(61)},{birthMonth:'13'},{birthYear:'2200'}])assert.ok((await onboarding.createFamilyAndChild(initial,form(patch))).error);
authError={message:'private'};assert.match((await onboarding.createFamilyAndChild(initial,form())).error,/session/);authError=null;
user=null;assert.ok((await onboarding.createFamilyAndChild(initial,form())).error);user='user';
assert.equal(calls.length,0);
assert.equal((await onboarding.createFamilyAndChild(initial,form())).createdId,saved);
assert.equal(calls[0].name,'create_family_with_child_checked');assert.equal(calls[0].args.p_request_id,id);
assert.equal(calls[0].args.p_child_nickname,'طفل / बच्चा');
calls=[];
for(const patch of [{requestId:''},{familyId:'other'},{nickname:' '},{birthYear:'2026',birthMonth:'12'}])assert.ok((await family.addChild(initial,form(patch))).error);
role='viewer';assert.match((await family.addChild(initial,form())).error,/Caregiver/);role='owner';
calendarFail=true;assert.match((await family.addChild(initial,form())).error,/calendar/);calendarFail=false;
assert.equal(calls.length,0);
assert.equal((await family.addChild(initial,form())).createdId,saved);
assert.equal(calls[0].name,'add_child_to_family_checked');assert.equal(calls[0].args.p_request_id,id);assert.equal(calls[0].args.p_family_id,'family');
result={data:null,error:{message:'private upstream'}};assert.equal((await family.addChild(initial,form())).checkSaved,true);
result={data:'malformed',error:null};assert.equal((await onboarding.createFamilyAndChild(initial,form())).createdId,null);
result={data:saved,error:null};
for(const path of ['//evil.example','/\\evil.example','https://evil.example','/today?next=evil'])await assert.rejects(family.switchChild(form({returnTo:path,childId:id})),/^Error: redirect:\/today$/);
await assert.rejects(family.switchChild(form({returnTo:'/setup',childId:id})),/^Error: redirect:\/setup$/);

let state=initial,pending=false,handler,stateIndex=0;
const {ProfileCreationForm}=load('../components/profile-creation-form.tsx',{
  '@/lib/child-profile':profile,'@/lib/profile-creation':creation,
  '@/app/family/actions':family,'@/app/onboarding/actions':onboarding,
  react:{...React,useActionState:fn=>{handler=fn;return [state,()=>{},pending];},useState:value=>{const fields=[id,'Synthetic family','طفل / बच्चा','1','2026'];return [fields[stateIndex++]??value,()=>{}];}},
});
const draw=(mode='child')=>{stateIndex=0;return renderToStaticMarkup(React.createElement(ProfileCreationForm,{mode,requestId:id,userId:'user',familyId:'family',today:'2026-10-02'}));};
let html=draw();assert.match(html,/name="requestId" value="11111111/);assert.match(html,/value="طفل \/ बच्चा"/);assert.match(html,/value="11" disabled/);assert.ok(!html.includes('name="familyName"'));
stateIndex=0;let resetPrevented=false;
ProfileCreationForm({mode:'child',requestId:id,familyId:'family',today:'2026-10-02'}).props.onReset({preventDefault(){resetPrevented=true;}});
assert.equal(resetPrevented,true,'Action-result form resets must not discard controlled select values');
html=draw('family');assert.match(html,/name="familyName"/);assert.match(html,/dates use UTC/);assert.match(html,/Optional AI starts off/);
pending=true;assert.match(draw(),/fieldset disabled/);assert.match(draw(),/aria-busy="true"/);pending=false;
state=creation.creationFailure(undefined);html=draw();assert.match(html,/Retry same save/);assert.match(html,/Check saved family \(new tab\)/);assert.match(html,/role="alert"/);
transportFail=true;const failure=await handler(initial,form());assert.equal(failure.createdId,null);assert.equal(failure.checkSaved,true);assert.ok(!failure.error.includes('private'));transportFail=false;
state={...initial,createdId:saved};html=draw();assert.match(html,/role="status"/);assert.match(html,/Continue to learning preferences/);assert.match(html,/name="childId" value="22222222/);assert.ok(!html.includes('name="nickname"'));
assert.match(draw('family'),/Continue to MIRA/);
console.log('PASS creation action/form: request/user/family/role/date binding, confirmed IDs only, redacted recovery, retained controlled fields and request identity, future options, pending/success/error paths, explicit continue to saved child and safe switching destinations. Mocked transport/SSR; no hosted writes.');
