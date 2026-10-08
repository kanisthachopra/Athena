import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {renderToStaticMarkup} from 'react-dom/server';
import ts from 'typescript';
const require=createRequire(import.meta.url);
function load(path,deps={}) {
  const js=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const exports={};new Function('require','exports',js)(id=>id==='server-only'?{}:deps[id]??require(id),exports);return exports;
}
const journal=load('../lib/journal-entry.ts');
const childId='10000000-0000-4000-8000-000000000001',momentId='20000000-0000-4000-8000-000000000001';
const updatedAt='2026-10-02T01:02:03.123456+00:00',newVersion='2026-10-02T01:03:04.234567+00:00';
const initial={...journal.emptyJournalCorrection,updatedAt};
const input={childId,momentId,updatedAt,intent:'save',title:'',note:'  再来一次\nمرحبا 🙂  ',domain:'everyday',occurredOn:'2026-10-02'};
const form=values=>{const data=new FormData();for(const [key,value] of Object.entries(values))data.set(key,value);return data;};
let outcome={data:{updatedAt:newVersion},error:null},role='owner',active=childId,calls=[],revalidated=[],authFailure=false;
const actions=load('../app/insights/actions.ts',{
  '@/lib/journal-entry':journal,
  '@/lib/ai/extraction-budget':{},'@/lib/ai/permission':{},'@/lib/ai/nebius':{},'@/lib/ai/observation-extractor':{},
  '@/lib/family-context':{requireFamilyContext:async()=>{
    if(authFailure)throw Error('private authentication detail');
    return {activeChild:{id:active},membership:{role},supabase:{rpc:async(name,args)=>{calls.push({name,args});if(outcome instanceof Error)throw outcome;return outcome;}}};
  }},'next/cache':{revalidatePath:path=>revalidated.push(path)}
});
assert.equal(journal.isJournalVersion(updatedAt),true);
for(const bad of ['', 'not a date', '2026-10-02', '2026-10-02T12:00:00.1234567Z'])assert.equal(journal.isJournalVersion(bad),false);
const saved=await actions.correctLearningMoment(initial,form(input));
assert.equal(saved.updatedAt,newVersion);assert.ok(saved.success);assert.equal(saved.removed,false);
assert.deepEqual(calls.pop(),{name:'update_learning_moment_checked',args:{p_moment_id:momentId,p_child_id:childId,p_expected_updated_at:updatedAt,p_occurred_on:input.occurredOn,p_domain:input.domain,p_title:journal.journalTitle(input.note),p_note:input.note}});
assert.deepEqual(revalidated,['/insights']);revalidated=[];
for(const patch of [{momentId:''},{childId:'invalid'},{updatedAt:''},{intent:'other'},{note:''},{note:'bad\u0000text'},{title:'x'.repeat(101)},{domain:'other'},{occurredOn:'2026-02-30'}]) {
  assert.ok((await actions.correctLearningMoment(initial,form({...input,...patch}))).error);
}
assert.equal(calls.length,0);
role='viewer';assert.ok((await actions.correctLearningMoment(initial,form(input))).refreshRequired);
role='caregiver';active=momentId;assert.ok((await actions.correctLearningMoment(initial,form(input))).refreshRequired);
active=childId;authFailure=true;assert.ok(!(await actions.correctLearningMoment(initial,form(input))).error.includes('private'));authFailure=false;
assert.equal(calls.length,0);assert.equal(revalidated.length,0);
for(const [message,refreshRequired] of [['MIRA_STALE_MOMENT',true],['MIRA_MOMENT_NOT_FOUND',true],['Caregiver access required',true],['MIRA_MOMENT_DATE_INVALID',false],['private provider details',true]]) {
  outcome={data:null,error:{message}};const result=await actions.correctLearningMoment(initial,form(input));
  assert.equal(result.success,null);assert.equal(result.refreshRequired,refreshRequired);assert.ok(!result.error.includes('private'));
}
for(const data of [null,false,true,{}, {updatedAt:'bad'}]) {
  outcome={data,error:null};assert.equal((await actions.correctLearningMoment(initial,form(input))).success,null);
}
outcome=new Error('private transport detail');assert.equal((await actions.correctLearningMoment(initial,form(input))).success,null);
for(const data of [null,false,'true',{}]) {
  outcome={data,error:null};assert.equal((await actions.correctLearningMoment(initial,form({...input,intent:'remove'}))).success,null);
}
assert.equal(revalidated.length,0);
// Removal is of the saved version, not the possibly incomplete edit draft.
outcome={data:true,error:null};const removed=await actions.correctLearningMoment(initial,form({...input,intent:'remove',note:'',domain:'',occurredOn:''}));
assert.equal(removed.removed,true);assert.ok(removed.success);
assert.deepEqual(calls.at(-1),{name:'delete_learning_moment_checked',args:{p_moment_id:momentId,p_child_id:childId,p_expected_updated_at:updatedAt}});
assert.deepEqual(revalidated,['/insights']);

let callback,state=initial,pending=false,implementation,notices=[];
const react={...require('react'),useState:value=>[value,()=>{}],useActionState:fn=>{callback=fn;return [state,()=>{},pending];}};
const component=load('../components/journal-moment-controls.tsx',{
  react,'@/lib/journal-entry':journal,
  '@/components/journal-notice':{useJournalNotice:()=> (...args)=>notices.push(args)},
  '@/app/insights/actions':{correctLearningMoment:async(previous,data)=>implementation(previous,data)}
});
const props={childId,today:input.occurredOn,moment:{id:momentId,title:'Synthetic <script>safe</script>',note:input.note,domain:input.domain,occurred_on:input.occurredOn,updated_at:updatedAt}};
const render=()=>renderToStaticMarkup(component.JournalMomentControls(props));
let html=render();assert.match(html,/Your words/);assert.match(html,/dir="auto"/);assert.match(html,/formNoValidate=""/i);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>safe<\/script>/);
assert.match(html,/No AI is used/);assert.match(html,/does not promise immediate deletion/);
implementation=()=>saved;let result=await callback(initial,form(input));assert.equal(result.updatedAt,newVersion);assert.deepEqual(notices.pop(),[saved.success,false]);
implementation=()=>removed;result=await callback(initial,form({...input,intent:'remove'}));assert.equal(result.updatedAt,updatedAt);assert.deepEqual(notices.pop(),[removed.success,true]);
implementation=()=>{throw Error('private')};result=await callback(initial,form(input));assert.equal(result.updatedAt,updatedAt);assert.ok(result.refreshRequired);assert.equal(result.success,null);
state=result;html=render();assert.doesNotMatch(html,/fieldset disabled/);assert.match(html,/<textarea[^>]*readOnly/);assert.match(html,/<input[^>]*readOnly[^>]*name="title"/);assert.match(html,/<button[^>]*disabled[^>]*>Save changes/);assert.match(html,/<button[^>]*disabled[^>]*>Remove saved note/);assert.match(html,/role="alert"/);assert.match(html,/Compare saved journal/);assert.match(html,/Discard edits and reload/);assert.ok(html.includes(input.note));
state=initial;pending=true;html=render();assert.match(html,/aria-busy="true"/);assert.match(html,/fieldset disabled/);assert.match(html,/Saving change/);
pending=false;state=saved;html=render();assert.match(html,/role="status"/);
// A server-action form reset must not erase controlled drafts after failure.
const tree=component.JournalMomentControls(props);const formNode=tree.props.children.find(child=>child?.type==='form');
let prevented=false;formNode.props.onReset({preventDefault(){prevented=true}});assert.equal(prevented,true);
console.log('PASS journal corrections: exact-version action/child/role binding, strict confirmed results, validation, redacted failures, retained multilingual draft/version, guarded removal and accessible states. Mock transport/SSR, not a browser or database test.');
