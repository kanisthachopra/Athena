import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {renderToStaticMarkup} from 'react-dom/server';
import ts from 'typescript';
const require=createRequire(import.meta.url),React=require('react');
const cache={};
function load(path,deps={}) {
  const js=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const api={};new Function('require','exports',js)(id=>deps[id]??(id.startsWith('@/lib/')?(cache[id]??=load(`../${id.slice(2)}.ts`)):require(id)),api);return api;
}
const lib=load('../lib/family-understanding.ts');
const child='10000000-0000-4000-8000-000000000001',family='20000000-0000-4000-8000-000000000001',hope='30000000-0000-4000-8000-000000000001',person='40000000-0000-4000-8000-000000000001',language='50000000-0000-4000-8000-000000000001';
const date='2026-10-02T00:30:00.123456+00:00',words='Stories <script> — हिंदी العربية';
const environment={schemaVersion:1,role:'heritage',state:'paused',variety:null,oralGoal:'Speak together',literacyGoal:null,support:[{caregiverId:person,label:'अम्मा <img>',comfort:null,contact:'occasional',contexts:['  Stories\nthen play  ']}]};
const data={schemaVersion:1,childId:child,familyId:family,
  profile:{childId:child,familyId:family,version:'a'.repeat(64),configured:true,initial:{screen_policy:'minimal_child_screen',structure_level:'balanced',weekday_minutes:0,weekend_minutes:30,prefer_embedded_learning:false,aspirations:[words],languageGoals:['hi'],caregiverName:'Synthetic',relationship:'Family friend',caregiverLanguages:[]}},
  directions:{childId:child,version:'b'.repeat(64),hopes:[{id:hope,title:words,direction:{horizon:'future',capabilities:[],tracks:['music']}}]},
  childUpdatedAt:date,preferencesUpdatedAt:date,calendar:{timeZone:'Asia/Kolkata',updatedAt:date},
  hopeDates:[{id:hope,createdAt:date,directionUpdatedAt:date}],people:[{id:person,name:'Synthetic',relationship:'Family friend',createdAt:date}],
  languages:[{id:language,childId:child,language:'hi',environment,createdAt:date,updatedAt:date}]};
const clone=()=>structuredClone(data);
assert.ok(lib.parseFamilyUnderstanding(data,child,family));
assert.deepEqual(lib.parseFamilyUnderstanding(data,child,family).languages[0].environment,environment);
for(const corrupt of [d=>{d.childId=hope},d=>{d.familyId=hope},d=>{d.schemaVersion=2},d=>{delete d.profile},d=>{d.preferencesUpdatedAt=null},d=>{d.childUpdatedAt='yesterday'},d=>{d.calendar.timeZone='invalid'},d=>{d.calendar.updatedAt=null},d=>{d.hopeDates=[]},d=>{d.hopeDates[0].id=person},d=>{d.directions.hopes[0].title='mismatched'},d=>{d.people.push(d.people[0])},d=>{d.people=[]},d=>{d.languages[0].childId=hope},d=>{d.languages[0].environment={}},d=>{d.languages[0].updatedAt=null},d=>{d.languages[0].language='en'},d=>{d.languages.push(d.languages[0])}]){
  const bad=clone();corrupt(bad);assert.equal(lib.parseFamilyUnderstanding(bad,child,family),null);
}
let unknown=clone();unknown.profile.configured=false;for(const key of ['screen_policy','structure_level','weekday_minutes','weekend_minutes','prefer_embedded_learning'])unknown.profile.initial[key]=null;
unknown.preferencesUpdatedAt=null;unknown.calendar={timeZone:null,updatedAt:null};unknown.languages[0].environment=null;unknown.languages[0].updatedAt=null;
assert.ok(lib.parseFamilyUnderstanding(unknown,child,family));
assert.match(lib.understandingDate(date,'Asia/Kolkata'),/6:00/);
assert.match(lib.understandingDate(date,null),/12:30/);
const Link=({href,children,...props})=>React.createElement('a',{href,...props},children);
const component=load('../components/family-understanding.tsx',{'@/lib/family-understanding':lib,'next/link':{default:Link}});
const render=(value,readOnly=false)=>renderToStaticMarkup(React.createElement(component.FamilyUnderstandingView,{value,childId:child,readOnly,owner:!readOnly}));
let html=render(lib.parseFamilyUnderstanding(data,child,family));
for(const text of ['0 minutes','Not marked as a preference','For later','Music','Hindi','Paused','Comfort not provided','No goal provided.','What affects a new week','Observations are separate','do not yet change','without an AI call','Stories &lt;script&gt;','अम्मा &lt;img&gt;'])assert.ok(html.includes(text),text);
assert.ok(!html.includes('<script>'));assert.ok(html.includes('  Stories\nthen play  '));assert.match(html,/href="\/family#family-languages"/);
html=render(lib.parseFamilyUnderstanding(unknown,child,family));assert.match(html,/have not been saved yet/);assert.match(html,/UTC \(no family time zone chosen\)/);assert.match(html,/have not been described/);assert.ok(!html.includes('0 minutes'));
html=render(null);assert.match(html,/role="alert"/);assert.match(html,/method="get"/);assert.ok(!html.includes('No hopes saved'));
html=render(lib.parseFamilyUnderstanding(data,child,family),true);assert.match(html,/Your access is read-only/);assert.ok(!html.includes('Correct learning preferences'));
let calls=[],response={data,error:null};
const page=load('../app/memory/page.tsx',{'@/components/app-header':{AppHeader:()=>null},'@/components/family-understanding':component,'@/lib/family-understanding':lib,
 '@/lib/family-context':{requireFamilyContext:async()=>({family:{display_name:'Synthetic'},activeChild:{id:child,nickname:'Synthetic <img>'},membership:{family_id:family,role:'owner'},supabase:{rpc:async(name,args)=>{calls.push([name,args]);if(response instanceof Error)throw response;return response;}}})}}).default;
html=renderToStaticMarkup(await page());assert.deepEqual(calls,[['get_family_understanding',{p_child_id:child}]]);assert.match(html,/Synthetic &lt;img&gt;/);
for(const bad of [{data:null,error:null},{data:{...data,childId:hope},error:null},{data,error:{message:'private details'}},new Error('private transport')]){response=bad;html=renderToStaticMarkup(await page());assert.match(html,/could not be loaded/);assert.ok(!html.includes('private'));assert.ok(!html.includes('No hopes saved'));}
console.log('PASS understanding: coherent bound parser, dates/UTC fallback, no assumed values, preserved multilingual text, explicit future/paused context, scoped correction links, truthful planner/AI limits, read-only and failed-read recovery. One mocked RPC, no AI or writes.');
