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
const calendar=load('../lib/family-calendar.ts',{'@/lib/activity-context':load('../lib/activity-context.ts')});
for(const zone of ['UTC','Asia/Kolkata','America/New_York','Pacific/Kiritimati'])assert.equal(calendar.isTimeZone(zone),true);
for(const zone of [null,'','IST','GMT+5','Not/Here','posix/Asia/Kolkata'])assert.equal(calendar.isTimeZone(zone),false);
assert.equal(calendar.shortCalendarDate('2026-10-05'),'Oct 5');
assert.throws(()=>calendar.shortCalendarDate('2026-02-30'));
for(const [instant,zone,day] of [
  ['2026-10-04T18:29:59Z','Asia/Kolkata','2026-10-04'],['2026-10-04T18:30:00Z','Asia/Kolkata','2026-10-05'],
  ['2026-12-31T18:30:00Z','Asia/Kolkata','2027-01-01'],['2026-10-05T03:59:59Z','America/New_York','2026-10-04'],
  ['2026-03-08T06:59:59Z','America/New_York','2026-03-08'],['2026-03-08T07:00:00Z','America/New_York','2026-03-08'],
])assert.equal(calendar.calendarDayOfInstant(instant,zone),day);
let response={data:{timeZone:null,revision:0,today:'2026-10-05'},error:null},calls=[];
const client={rpc:async(name,args)=>{calls.push({name,args});return response;}};
assert.deepEqual(await calendar.loadFamilyCalendar(client,'family'),response.data);
assert.deepEqual(calls[0],{name:'get_family_calendar',args:{p_family_id:'family'}});
for(const data of [null,{}, {timeZone:'unknown',revision:1,today:'2026-10-05'},{timeZone:'UTC',revision:0,today:'2026-10-05'}, {timeZone:null,revision:1,today:'2026-10-05'}, {timeZone:'UTC',revision:1,today:'2026-02-30'}]) {
  response={data,error:null};await assert.rejects(calendar.loadFamilyCalendar(client,'family'),/could not be loaded/);
}
response={data:{timeZone:'UTC',revision:1,today:'2026-10-05'},error:{message:'private provider'}};
await assert.rejects(calendar.loadFamilyCalendar(client,'family'),/could not be loaded/);

let role='owner',rpcResult={data:1,error:null};calls=[];
const actions=load('../app/settings/calendar-actions.ts',{
  '@/lib/family-calendar':calendar,
  '@/lib/family-context':{requireFamilyContext:async()=>({membership:{family_id:'family',role},supabase:{rpc:async(name,args)=>{calls.push({name,args});return rpcResult;}}})},
  'next/cache':{revalidatePath(){}},
});
const form=patch=>{const f=new FormData();for(const[k,v]of Object.entries({familyId:'family',revision:'0',timeZone:'Asia/Kolkata',...patch}))f.set(k,v);return f;};
for(const patch of [{familyId:'other'},{revision:''},{revision:'-1'},{revision:'2.5'},{timeZone:'IST'}])assert.ok((await actions.saveFamilyTimeZone({},form(patch))).error);
for(const r of ['viewer','caregiver']){role=r;assert.match((await actions.saveFamilyTimeZone({},form())).error,/owner/);}role='owner';assert.equal(calls.length,0);
assert.equal((await actions.saveFamilyTimeZone({},form())).saved.timeZone,'Asia/Kolkata');
assert.deepEqual(calls[0],{name:'set_family_time_zone',args:{p_family_id:'family',p_expected_revision:0,p_time_zone:'Asia/Kolkata'}});
rpcResult={data:null,error:{message:'MIRA_STALE_FAMILY_CALENDAR'}};assert.match((await actions.saveFamilyTimeZone({},form())).error,/another session/);
rpcResult={data:null,error:{message:'Private SQL'}};let failed=await actions.saveFamilyTimeZone({},form());assert.equal(failed.refreshRequired,true);assert.ok(!failed.error.includes('Private'));
rpcResult={data:0,error:null};assert.equal((await actions.saveFamilyTimeZone({},form())).success,null);

let preference=null,opportunity=null,readError=null,eligible=false,pageCalls=[];
const template={duration_minutes:3,summary:'Saved synthetic summary',materials:['Book'],safety_note:'Synthetic safety',look_for:'Optional noticing'};
const pageClient={from:table=>{const q={select:()=>q,eq:(field,value)=>{pageCalls.push({table,field,value});return q;},maybeSingle:async()=>({data:table==='family_preferences'?preference:opportunity,error:readError})};return q;},rpc:async()=>eligible?{data:null,error:null}:{data:'MIRA_CONTEXT_REQUIRED',error:null}};
const page=load('../app/today/page.tsx',{
  '@/lib/family-calendar':{...calendar,loadFamilyCalendar:async()=>({timeZone:'Asia/Kolkata',revision:2,today:'2026-10-05'})},
  '@/lib/family-context':{requireFamilyContext:async()=>({supabase:pageClient,membership:{family_id:'family',role},family:{display_name:'Synthetic'},activeChild:{id:'child',nickname:'Synthetic child'}})},
  '@/lib/activity-content':{savedActivityContent:()=>({state:'saved',template})},
  '@/components/app-header':{AppHeader:()=>null},'next/link':{default:({children,...props})=>React.createElement('a',props,children)},
}).default;
const render=async()=>renderToStaticMarkup(await page());
assert.match(await render(),/Start with your family/);
assert.ok(pageCalls.some(c=>c.table==='activity_instances'&&c.field==='scheduled_date'&&c.value==='2026-10-05'));
opportunity={id:'activity',template_id:'template',opportunity_type:'embedded',status:'planned',personalized_title:'Saved idea',estimated_parent_minutes:1,selection_reason:'Saved reason'};
let html=await render();assert.match(html,/Saved idea/);assert.match(html,/View saved record/);assert.ok(!html.includes('Start with your family'));assert.ok(!html.includes('<strong>Bring:'));
eligible=true;html=await render();assert.match(html,/Read preparation/);assert.match(html,/Before you begin/);
for(const status of ['completed','skipped']){opportunity.status=status;assert.match(await render(),/View saved record/);}
opportunity.opportunity_type='open';assert.match(await render(),/An open day/);
role='viewer';opportunity=null;assert.ok(!(await render()).includes('Set up learning preferences'));
preference={family_id:'family'};assert.match(await render(),/Nothing planned/);
readError={message:'private'};await assert.rejects(render(),/could not be loaded/);

let formState={error:null,success:null,saved:{timeZone:null,revision:0},refreshRequired:false},pending=false;
const {FamilyCalendarForm}=load('../components/family-calendar-form.tsx',{
  react:{...React,useState:initial=>[typeof initial==='function'?initial():initial,()=>{}],useActionState:()=>[formState,()=>{},pending]},
  '@/app/settings/calendar-actions':{saveFamilyTimeZone:actions.saveFamilyTimeZone},
});
const draw=(canEdit=true)=>renderToStaticMarkup(React.createElement(FamilyCalendarForm,{familyId:'family',initial:{timeZone:null,revision:0,today:'2026-10-05'},canEdit,zones:['UTC','Asia/Kolkata']}));
html=draw();assert.match(html,/Not chosen — using UTC/);assert.match(html,/aria-describedby="family-calendar-help"/);assert.match(html,/button[^>]*disabled/);
html=draw(false);assert.match(html,/Only your family owner/);assert.ok(!html.includes('<select'));
pending=true;assert.match(draw(),/Saving…/);assert.match(draw(),/aria-busy="true"/);pending=false;
formState={...formState,error:'Reload to compare',refreshRequired:true};html=draw();assert.match(html,/role="alert"/);assert.match(html,/fieldset disabled/);assert.match(html,/Reload saved setting/);
console.log('PASS family calendar: strict scoped read, no silent fallback on failure, owner/family/revision-bound save, uncertain/stale states, family-day Today query, saved/open/recorded activity visibility without preferences, eligibility retained, keyboard-native labelled form and date-only/instant separation. Mocked transport/SSR; SQL and browser evidence separate.');
