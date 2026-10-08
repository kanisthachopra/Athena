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
const childId='10000000-0000-4000-8000-000000000001',requestId='20000000-0000-4000-8000-000000000001';
const input={childId,requestId,note:'  再来一次\nمرحبا 🙂  ',title:'',domain:'everyday',occurredOn:'2026-10-02'};
const form=values=>{const data=new FormData();for(const [key,value] of Object.entries(values))data.set(key,value);return data;};
const initial={error:null,success:null};
let outcome={data:childId,error:null},writes=0;
const actions=load('../app/insights/actions.ts',{
  '@/lib/journal-entry':journal,
  '@/lib/ai/extraction-budget':{},'@/lib/ai/permission':{},'@/lib/ai/nebius':{},'@/lib/ai/observation-extractor':{},
  '@/lib/family-context':{requireFamilyContext:async()=>({activeChild:{id:childId},membership:{role:'owner'},supabase:{rpc:async(name,args)=>{writes++;assert.equal(name,'create_learning_moment_checked');assert.equal(args.p_request_id,requestId);assert.equal(args.p_note,input.note);return outcome;}}})},
  'next/cache':{revalidatePath:()=>{}}
});
assert.ok((await actions.saveLearningMoment(initial,form(input))).success);
for(const message of ['MIRA_MOMENT_REQUEST_CHANGED','MIRA_MOMENT_REMOVED']) {
  outcome={data:null,error:{message}};const result=await actions.saveLearningMoment(initial,form(input));assert.equal(result.retry,'review');assert.equal(result.success,null);
}
for(const value of [{data:null,error:null},{data:'not-an-id',error:null},{data:null,error:{message:'private details'}}]) {
  outcome=value;const result=await actions.saveLearningMoment(initial,form(input));assert.equal(result.retry,'same');assert.equal(result.success,null);assert.ok(!result.error.includes('private'));
}
const previousWrites=writes;
for(const patch of [{note:'bad\u0000character'},{title:'bad\u0000character'},{requestId:''},{requestId:'not-an-id'}])assert.ok((await actions.saveLearningMoment(initial,form({...input,...patch}))).error);
assert.equal(writes,previousWrites);

// Exercise the actual client action closure: retries must reuse the frozen
// submission even though disabled fields are absent from the second FormData.
let callback,state=initial,saveImpl,seen=[],aiCalls=0;
const react={...require('react'),useState:value=>[value,()=>{}],useRef:value=>({current:value}),useEffect:()=>{},useTransition:()=>[false,fn=>fn()],useActionState:fn=>{callback=fn;return [state,()=>{},false];}};
const component=load('../components/learning-moment-form.tsx',{
  react,
  '@/app/insights/actions':{saveLearningMoment:async(previous,data)=>{seen.push(Object.fromEntries(data));return saveImpl(previous,data);},proposeLearningMoment:()=>{aiCalls++;throw Error('Unexpected AI call');}}
});
const props={childId,childName:'Synthetic child',today:input.occurredOn,initialRequestId:requestId};
function render(){return renderToStaticMarkup(component.LearningMomentForm(props));}
for(const failure of ['throw','same']) {
  state=initial;seen=[];render();saveImpl=()=>{if(failure==='throw')throw Error('network');return {error:'Unconfirmed',success:null,retry:'same'};};
  const first=await callback(initial,form(input));assert.equal(first.retry,'same');
  saveImpl=()=>({error:null,success:'Saved'});
  assert.equal((await callback(first,form({requestId,note:'Changed after timeout'}))).success,'Saved');
  assert.deepEqual(seen[1],seen[0]);assert.equal(seen[1].note,input.note);
}
state={error:'Unconfirmed',success:null,retry:'same'};
let html=render();assert.match(html,/fieldset disabled/);assert.match(html,/Retry this observation/);assert.match(html,/role="alert"/);assert.match(html,/#observation-journal/);
state={error:'Removed',success:null,retry:'review'};
html=render();assert.match(html,/Start a new draft with these words/);assert.doesNotMatch(html,/Save my observation/);
state={error:null,success:'Saved'};html=render();assert.match(html,/role="status"/);assert.match(html,/Notice another moment/);assert.doesNotMatch(html,/<form/);
assert.equal(aiCalls,0);
console.log('PASS journal retry: checked action identity, unknown-result handling, changed/removed review, hidden-character rejection, actual client frozen-payload replay after thrown/returned failures, accessible retry/review/success markup and no AI. Mocked transport/SSR, not browser interaction evidence.');
