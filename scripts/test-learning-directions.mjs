import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {renderToStaticMarkup} from 'react-dom/server';
import ts from 'typescript';
const require=createRequire(import.meta.url);
function load(path,deps={}){const js=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;const api={};new Function('require','exports',js)(id=>deps[id]??require(id),api);return api;}
const lib=load('../lib/learning-directions.ts');
const child='10000000-0000-4000-8000-000000000001',hope='20000000-0000-4000-8000-000000000001',version='a'.repeat(64);
const direction={horizon:'now',capabilities:['curiosity_play_creativity'],tracks:['music']};
const snapshot={childId:child,version,hopes:[{id:hope,title:'Our own words <script> — हिंदी العربية',direction}]};
assert.deepEqual(lib.parseLearningDirection(direction),direction);
assert.equal(lib.capabilityOptions.length,9);assert.equal(lib.trackOptions.length,14);
assert.deepEqual(lib.directionLabels(direction),['Curiosity, play, and creativity','Music']);
for(const invalid of [null,[],{...direction,extra:1},{...direction,horizon:'daily'},{...direction,capabilities:['invented']},{...direction,tracks:['music','music']},{horizon:'now',capabilities:[],tracks:[]}])assert.equal(lib.parseLearningDirection(invalid),null);
assert.ok(lib.parseLearningDirection({horizon:'future',capabilities:[],tracks:[]}));
assert.deepEqual(lib.parseDirectionsSnapshot(snapshot,child),snapshot);
for(const invalid of [{...snapshot,childId:hope},{...snapshot,version:''},{...snapshot,hopes:[...snapshot.hopes,...snapshot.hopes]},{...snapshot,hopes:[{id:hope,title:'Hope'}]}])assert.equal(lib.parseDirectionsSnapshot(invalid,child),null);
let role='owner',result={data:snapshot,error:null},calls=[],sessionFailure=false;
const action=load('../app/family/directions/actions.ts',{
  '@/lib/learning-directions':lib,
  '@/lib/family-context':{requireFamilyContext:async()=>{if(sessionFailure)throw Error('private');return{membership:{role},activeChild:{id:child},supabase:{rpc:async(name,args)=>{calls.push({name,args});if(result instanceof Error)throw result;return result;}}};}},
  'next/cache':{revalidatePath:()=>{}}
}).saveLearningDirection;
const form=(patch={})=>{const f=new FormData();for(const [key,value] of Object.entries({childId:child,hopeId:hope,version,operation:'save',direction:JSON.stringify(direction),...patch}))f.set(key,value);return f;};
assert.equal((await action({},form())).status,'saved');assert.equal(calls[0].name,'save_aspiration_direction');assert.deepEqual(calls[0].args.p_direction,direction);
assert.match((await action({},form())).message,/saved for new weeks/i);
for(const horizon of ['future','paused']) assert.match((await action({},form({direction:JSON.stringify({...direction,horizon})}))).message,/will not influence new weeks/);
await action({},form({operation:'clear',direction:'broken'}));assert.equal(calls.at(-1).args.p_direction,null);
for(const patch of [{hopeId:'bad'},{version:'bad'},{childId:hope},{operation:'delete'},{direction:'bad'},{direction:JSON.stringify({horizon:'now',capabilities:[],tracks:[]})}]){calls=[];assert.notEqual((await action({},form(patch))).status,'saved');assert.deepEqual(calls,[]);}
role='viewer';calls=[];assert.equal((await action({},form())).status,'stale');assert.deepEqual(calls,[]);role='owner';
result={error:{message:'MIRA_DIRECTION_STALE'}};assert.equal((await action({},form())).status,'stale');
for(const bad of [{data:null,error:null},{data:{...snapshot,childId:hope},error:null},{error:{message:'private backend'}},new Error('private transport')]){result=bad;const r=await action({},form());assert.equal(r.status,'error');assert.ok(!r.message.includes('private'));}
sessionFailure=true;assert.equal((await action({},form())).status,'error');sessionFailure=false;
const component=load('../components/family-learning-directions.tsx',{'@/lib/learning-directions':lib,'@/app/family/directions/actions':{saveLearningDirection:action}});
let html=renderToStaticMarkup(require('react').createElement(component.FamilyLearningDirections,{initial:snapshot,readOnly:false,unavailable:false}));
assert.match(html,/Hopes and directions/);assert.match(html,/For now/);assert.match(html,/&lt;script&gt;/);assert.ok(!html.includes('<script>'));
assert.ok(!html.includes('Save direction'),'Editors are collapsed initially');
html=renderToStaticMarkup(require('react').createElement(component.FamilyLearningDirections,{initial:null,readOnly:false,unavailable:true}));assert.match(html,/could not be loaded/);assert.ok(!html.includes('No hopes saved'));assert.match(html,/<form action="\/family#family-directions" method="get">/);assert.match(html,/<button type="submit"[^>]*>Reload Family/);
html=renderToStaticMarkup(require('react').createElement(component.FamilyLearningDirections,{initial:{...snapshot,hopes:[]},readOnly:true,unavailable:false}));assert.match(html,/No hopes saved yet/);assert.ok(!html.includes('href="/setup"'));
console.log('PASS learning directions: canonical choices, unknown/no-default validation, now/later/paused, child/version/role binding, confirmed-only saves, clear semantics, safe errors, escaped compact rows, distinct empty/unavailable and viewer states. Mocked transport/SSR; SQL ranking tested separately.');
