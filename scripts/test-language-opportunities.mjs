import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url);
const load=(file,deps={})=>{const code=ts.transpileModule(readFileSync(new URL(file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;const exports={};new Function('require','exports',code)(id=>id==='server-only'?{}:deps[id]??require(id),exports);return exports;};
const planning=load('../lib/language-planning.ts');
const projection=load('../lib/language-opportunities.ts',{'@/lib/language-planning':planning});
const loader=load('../lib/load-language-opportunities.ts',{'@/lib/language-opportunities':projection});
const caregiver='10000000-0000-4000-8000-000000000001';
const person={caregiverId:caregiver,label:'  Synthetic aunt — خالہ  ',comfort:'comfortable',contact:'occasional',contexts:['  وقت القصة  ','घर की बातें']};
const environment={...planning.emptyLanguageEnvironment(),role:'heritage',state:'active',support:[person]};
const row={id:'goal',child_id:'child',language_code:'hi',environment};
const project=patch=>projection.projectLanguageOpportunities([{...row,environment:{...environment,...patch}}],[caregiver],'child');
const expected={goalId:'goal',language:'Hindi',variety:null,state:'active',people:[{name:person.label,contact:'occasional',moments:person.contexts}]};
assert.deepEqual(project({}).opportunities,[expected]);
assert.equal(project({}).hasSavedLanguages,true);
assert.deepEqual(project({state:'maintenance'}).opportunities,[{...expected,state:'maintenance'}]);
for(const patch of [{state:null},{state:'future'},{state:'paused'},{role:'future'},{support:null},{support:[]},...['learning','not_comfortable',null].map(comfort=>({support:[{...person,comfort}]})),...['unavailable',null].map(contact=>({support:[{...person,contact}]})),{support:[{...person,contexts:[]}]}]){
  const result=project(patch);assert.equal(result.status,'available');assert.deepEqual(result.opportunities,[]);
}
assert.deepEqual(project({support:[person,{...person,caregiverId:null,label:'Unknown comfort',comfort:null}]}).opportunities,[expected]);
assert.equal(project({support:[{...person,caregiverId:null}]}).opportunities.length,1);
assert.equal(project({support:[{...person,caregiverId:'10000000-0000-4000-8000-000000000002'}]}).status,'unavailable');
assert.equal(project({variety:'  Family variety  '}).opportunities[0].variety,'  Family variety  ');
for(const rows of [null,{},[null],[{...row,child_id:'other'}],[row,row],[{...row,environment:{}}],[{...row,language_code:''}]])assert.equal(projection.projectLanguageOpportunities(rows,[caregiver],'child').status,'unavailable');
assert.deepEqual(projection.projectLanguageOpportunities([],[caregiver],'child'),{status:'available',opportunities:[],hasSavedLanguages:false});
assert.deepEqual(projection.projectLanguageOpportunities([{...row,environment:null}],[caregiver],'child'),{status:'available',opportunities:[],hasSavedLanguages:true});
const forty=planning.planningLanguages.map(([code],index)=>({...row,id:String(index),language_code:code}));assert.equal(projection.projectLanguageOpportunities(forty,[caregiver],'child').opportunities.length,40);
assert.equal(projection.projectLanguageOpportunities([...forty,{...row,id:'extra'}],[caregiver],'child').status,'unavailable');
const original=JSON.stringify(row);project({});assert.equal(JSON.stringify(row),original);
let result={child_language_goals:{data:[row],error:null},caregivers:{data:[{id:caregiver}],error:null}},calls=[];
const client={from:table=>{calls.push(['from',table]);const chain={select:fields=>{calls.push(['select',table,fields]);return chain;},eq:(key,value)=>{calls.push(['eq',table,key,value]);return chain;},order:()=>chain,limit:()=>chain,then:resolve=>Promise.resolve(result[table]).then(resolve)};return chain;}};
assert.deepEqual((await loader.loadLanguageOpportunities(client,'child','family')).opportunities,[expected]);
assert.ok(calls.some(c=>JSON.stringify(c)===JSON.stringify(['eq','child_language_goals','child_id','child'])));
assert.ok(calls.some(c=>JSON.stringify(c)===JSON.stringify(['eq','caregivers','family_id','family'])));
for(const table of ['child_language_goals','caregivers']){const saved=result[table];result[table]={data:null,error:{message:'private provider detail'}};assert.deepEqual(await loader.loadLanguageOpportunities(client,'child','family'),{status:'unavailable',opportunities:[],hasSavedLanguages:false});result[table]=saved;}
assert.equal((await loader.loadLanguageOpportunities({from:()=>{throw new Error('private');}},'child','family')).status,'unavailable');
console.log('PASS language opportunities: explicit current reports only, unknown/future/paused/unsupported contexts excluded, no inferred proficiency or schedule, unchanged Unicode, exact child/caregiver scope and unavailable versus empty. Mocked reads; no AI or live writes.');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const {WeekLanguageContexts}=load('../components/week-language-contexts.tsx',{'next/link':{default:({href,children,...props})=>React.createElement('a',{href,...props},children)}});
const render=(context,readOnly=false)=>renderToStaticMarkup(React.createElement(WeekLanguageContexts,{context,readOnly}));
const markup=render(project({}));assert.match(markup,/Your current Family notes, separate from this saved week/);assert.match(markup,/Occasional contact reported/);assert.match(markup,/Hindi/);assert.match(markup,/Edit in Family/);assert.match(markup,/dir="auto"/);assert.ok(!markup.includes('<form'));assert.ok(!markup.includes(' open=""'));
assert.match(render(project({}),true),/View in Family/);assert.ok(!render(project({}),true).includes('Edit in Family'));
assert.match(render({status:'unavailable',opportunities:[],hasSavedLanguages:false}),/could not be loaded/);
assert.match(render({status:'available',opportunities:[],hasSavedLanguages:false}),/No language details yet/);
assert.match(render(project({state:'paused'})),/Future and paused languages stay in Family/);
const unsafe=project({support:[{...person,label:'<img src=x onerror=alert(1)>',contexts:['<script>private()</script>']}]});
const escaped=render(unsafe);assert.ok(!escaped.includes('<script>'));assert.match(escaped,/&lt;script&gt;/);assert.match(escaped,/&lt;img/);
console.log('PASS Week language view: compact native disclosures, current-versus-saved provenance, empty/error/read-only states, multilingual direction, escaped original notes and no scheduling controls. Static render, not browser proof.');
// Saved Week is readable even when setup preferences are absent. Optional
// language failure must never replace the day board with setup/error navigation.
let preference=null,languageRead=project({}),pageRole='owner';
const pageClient={from:table=>{const data=table==='family_preferences'?preference:table==='plans'?[{id:'plan',week_start:'2026-10-05',generation_method:'reviewed_portfolio_v4',adaptation_summary:'Saved explanation'}]:[];const chain={select:()=>chain,eq:()=>chain,order:()=>chain,limit:()=>chain,maybeSingle:()=>chain,then:resolve=>Promise.resolve({data,error:null}).then(resolve)};return chain;}};
const {default:WeekPage}=load('../app/week/page.tsx',{
  '@/components/app-header':{AppHeader:()=>null},
  '@/components/week-workspace':{WeekWorkspace:()=>React.createElement('p',null,'Saved day board')},
  '@/components/week-language-contexts':{WeekLanguageContexts},
  '@/lib/load-language-opportunities':{loadLanguageOpportunities:async()=>languageRead},
  '@/lib/family-context':{requireFamilyContext:async()=>({supabase:pageClient,membership:{family_id:'family',role:pageRole},family:{display_name:'Synthetic'},activeChild:{id:'child',nickname:'Fictional child'}})},
  '@/lib/activity-content':{savedActivityContent:()=>{throw new Error('No instance fixture');}},
  '@/lib/week-workspace':{weekSelectionSummary:()=> 'Saved explanation'},
  'next/link':{default:({href,children,...props})=>React.createElement('a',{href,...props},children)},
  'next/navigation':{redirect:()=>{throw new Error('Unexpected setup redirect');}},
  './actions':{buildNextWeek:async()=>{}},
});
const renderPage=async()=>renderToStaticMarkup(await WeekPage({searchParams:Promise.resolve({})}));
let pageMarkup=await renderPage();assert.match(pageMarkup,/Saved day board/);assert.match(pageMarkup,/Finish planning setup/);assert.ok(!pageMarkup.includes('Plan next week'));assert.match(pageMarkup,/How this week was selected/);
languageRead={status:'unavailable',opportunities:[],hasSavedLanguages:false};pageMarkup=await renderPage();assert.match(pageMarkup,/could not be loaded/);assert.match(pageMarkup,/Saved day board/);
preference={family_id:'family'};assert.match(await renderPage(),/Plan next week/);
pageRole='viewer';pageMarkup=await renderPage();assert.ok(!pageMarkup.includes('Plan next week'));assert.match(pageMarkup,/View in Family/);
console.log('PASS Week route: saved plans without preferences, setup before next-plan button, optional context failure isolation, v4 explanation label and read-only controls. Mocked server render.');
