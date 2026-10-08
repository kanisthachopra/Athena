import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {renderToStaticMarkup} from 'react-dom/server';
import ts from 'typescript';
const require=createRequire(import.meta.url);
function load(path,deps={}){const js=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;const api={};new Function('require','exports',js)(id=>deps[id]??require(id),api);return api;}
const child='10000000-0000-4000-8000-000000000001',family='20000000-0000-4000-8000-000000000001';
const profileLib=load('../lib/learning-profile.ts'),version='a'.repeat(64),nextVersion='b'.repeat(64);
let role='owner',profile={data:{version:nextVersion,createdProfile:false},error:null},plan={error:null},calls=[],refresh=[],sessionFailure=false;
const redirectSignal=new Error('REDIRECT');
const actions=load('../app/setup/actions.ts',{
  '@/lib/learning-profile':profileLib,
  '@/lib/family-context':{requireFamilyContext:async()=>{if(sessionFailure)throw Error('private session');return {activeChild:{id:child},membership:{role,family_id:family},supabase:{rpc:async(name,args)=>{calls.push({name,args});if(profile instanceof Error)throw profile;return name==='configure_learning_profile_checked'?profile:plan;}}};}},
  'next/cache':{revalidatePath:path=>refresh.push(path)},'next/navigation':{redirect:()=>{throw redirectSignal;}}
});
const initial={error:null,success:null};
const values={childId:child,profileVersion:version,weekdayMinutes:'0',weekendMinutes:'20',screenPolicy:'minimal_child_screen',structureLevel:'light',preferEmbedded:'on',caregiverName:'किरण',relationship:'Parent',caregiverLanguages:'हिन्दी, English',languageGoals:'हिन्दी',aspirations:'Curiosity'};
const form=(overrides={})=>{const data=new FormData();for(const [key,value] of Object.entries({...values,...overrides}))if(value!==null)data.append(key,value);return data;};
assert.ok((await actions.saveLearningProfile(initial,form())).success);
assert.equal(calls.length,1);assert.equal(calls[0].args.p_child_id,child);assert.equal(calls[0].args.p_family_id,family);assert.equal(calls[0].args.p_weekday_minutes,0);assert.deepEqual(calls[0].args.p_caregiver_languages,['हिन्दी','English']);
assert.equal(calls[0].args.p_expected_version,version);assert.ok(refresh.includes('/family'));assert.ok(refresh.includes('/memory'));
const manyLanguages=Array.from({length:40},(_,i)=>`language ${i}`).join(', ');
assert.ok((await actions.saveLearningProfile(initial,form({languageGoals:manyLanguages}))).success);
for(const patch of [{languageGoals:manyLanguages+', extra'},{caregiverLanguages:Array.from({length:9},(_,i)=>`language ${i}`).join(',')}]){
  calls=[];assert.ok((await actions.saveLearningProfile(initial,form(patch))).error);assert.deepEqual(calls,[]);
}
for(const patch of [{profileVersion:null},{profileVersion:'bad'},{childId:null},{childId:'another'},{weekdayMinutes:null},{weekdayMinutes:''},{weekdayMinutes:'1.5'},{weekendMinutes:'241'},{screenPolicy:'bad'},{structureLevel:null},{caregiverName:''},{caregiverName:'x'.repeat(61)},{aspirations:null}]){
  calls=[];assert.ok((await actions.saveLearningProfile(initial,form(patch))).error);assert.deepEqual(calls,[]);
}
role='viewer';calls=[];assert.ok((await actions.saveLearningProfile(initial,form())).error);assert.deepEqual(calls,[]);role='owner';
sessionFailure=true;calls=[];assert.ok((await actions.saveLearningProfile(initial,form())).refreshRequired);assert.deepEqual(calls,[]);sessionFailure=false;
for(const data of [null,{}, {version:'bad',createdProfile:false},{version:nextVersion}]) {profile={data,error:null};assert.ok((await actions.saveLearningProfile(initial,form())).refreshRequired);}
for(const failed of [{error:{message:'private server detail'}},new Error('private transport')]){profile=failed;const result=await actions.saveLearningProfile(initial,form());assert.equal(result.success,null);assert.ok(result.error);assert.ok(!result.error.includes('private'));}
profile={error:{message:'Keep a name for this caregiver. Removing a caregiver requires a separate action.'}};assert.match((await actions.saveLearningProfile(initial,form())).error,/Clearing the name does not remove/);
profile={error:{message:'MIRA_PROFILE_STALE'}};const conflict=await actions.saveLearningProfile(initial,form());assert.ok(conflict.refreshRequired);assert.match(conflict.error,/Nothing was overwritten/);
profile={data:{version:nextVersion,createdProfile:true},error:null};plan={error:{message:'private plan error'}};refresh=[];const partial=await actions.saveLearningProfile(initial,form());assert.match(partial.error,/profile was saved/);assert.ok(partial.profileSaved);assert.equal(partial.version,nextVersion);assert.ok(refresh.includes('/setup'));
plan={data:null,error:null};assert.match((await actions.saveLearningProfile(initial,form())).error,/could not confirm/);
plan={data:family,error:null};await assert.rejects(actions.saveLearningProfile(initial,form()),error=>error===redirectSignal);

// Client snapshot restoration runs after React's uncontrolled-form reset.
let callback,effect,state={error:'Failed',success:null},pending=false;
const inputClass=class {constructor(name,value,type='text'){Object.assign(this,{name,value,type,checked:false});}};
const selectClass=class {constructor(name,value){Object.assign(this,{name,value});}};
globalThis.HTMLInputElement=inputClass;globalThis.HTMLSelectElement=selectClass;
const controls=[new inputClass('caregiverName','old'),new inputClass('aspirations','Curiosity','checkbox'),new inputClass('aspirations','Kindness','checkbox'),new selectClass('structureLevel','balanced')];
let index=0;const refs=[{current:{elements:controls}},{current:null}];
const component=load('../components/learning-profile-form.tsx',{
  react:{...require('react'),useRef:()=>refs[index++],useEffect:fn=>{effect=fn;},useActionState:fn=>{callback=fn;return [state,()=>{},pending];}},
  'react-dom':{useFormStatus:()=>({pending})},
  '@/app/setup/actions':{saveLearningProfile:async()=>state},'@/components/profile-story-form':{ProfileStoryForm:()=>null}
});
const props={childId:child,childName:'Synthetic',configured:true,initialVersion:version,initial:{aspirations:['Kindness'],languageGoals:[],caregiverName:'old',relationship:'',caregiverLanguages:[]}};
const render=()=>{index=0;return renderToStaticMarkup(component.LearningProfileForm(props));};
let html=render();assert.match(html,new RegExp(`name="childId" value="${child}"`));assert.match(html,/role="alert"/);
await callback(initial,form());effect();assert.equal(controls[0].value,'किरण');assert.equal(controls[1].checked,true);assert.equal(controls[2].checked,false);assert.equal(controls[3].value,'light');
pending=true;html=render();assert.match(html,/fieldset disabled/);assert.match(html,/Saving changes/);
state={error:null,success:'Saved'};pending=false;render();await callback(initial,form());assert.equal(refs[1].current,null);
state={...conflict,version};html=render();assert.match(html,/Compare saved profile/);assert.match(html,/Discard edits and reload/);assert.match(html,/<input[^>]*readOnly=""[^>]*name="caregiverName"/);assert.match(html,/name="profileVersion" value="aaaaaaaa/);
assert.match(html,/<button[^>]*disabled[^>]*>Save profile changes/);
index=0;const tree=component.LearningProfileForm(props);let resetPrevented=false;tree.props.children.find(item=>item?.type==='form').props.onReset({preventDefault(){resetPrevented=true}});assert.ok(resetPrevented);

const raw={childId:child,familyId:family,version,configured:true,initial:{screen_policy:'minimal_child_screen',structure_level:'light',weekday_minutes:0,weekend_minutes:20,prefer_embedded_learning:false,aspirations:['Curiosity'],languageGoals:['hi'],caregiverName:'किरण',relationship:'Parent',caregiverLanguages:['हिन्दी']}};
assert.equal(profileLib.parseLearningProfileSnapshot(raw,child,family).initial.weekday_minutes,0);
for(const patch of [{childId:'other'},{familyId:'other'},{version:''},{configured:'true'},{initial:null},{initial:{...raw.initial,weekday_minutes:null}},{initial:{...raw.initial,aspirations:'Curiosity'}}])assert.equal(profileLib.parseLearningProfileSnapshot({...raw,...patch},child,family),null);
const blank={...raw,configured:false,initial:{...raw.initial,screen_policy:null,structure_level:null,weekday_minutes:null,weekend_minutes:null,prefer_embedded_learning:null}};
assert.equal(profileLib.parseLearningProfileSnapshot(blank,child,family).initial.weekday_minutes,undefined);
assert.equal(profileLib.parseLearningProfileSnapshot({...blank,initial:{...blank.initial,weekday_minutes:0}},child,family),null);

// The page obtains one coherent envelope, not separately timed profile reads.
let pageResult={data:raw,error:null},pageCalls=[],renderedProps;
const page=load('../app/setup/page.tsx',{
  '@/lib/learning-profile':profileLib,
  '@/lib/family-context':{requireFamilyContext:async()=>({activeChild:{id:child,nickname:'Synthetic'},membership:{role,family_id:family},family:{display_name:'Synthetic family'},supabase:{rpc:async(name,args)=>{pageCalls.push({name,args});return pageResult;}}})},
  '@/components/app-header':{AppHeader:()=>null},
  '@/components/learning-profile-form':{LearningProfileForm:p=>{renderedProps=p;return null;}}
});
role='owner';renderToStaticMarkup(await page.default());
assert.deepEqual(pageCalls,[{name:'get_learning_profile_snapshot',args:{p_child_id:child}}]);
assert.equal(renderedProps.initialVersion,version);assert.equal(renderedProps.initial.weekday_minutes,0);
role='viewer';renderedProps=null;html=renderToStaticMarkup(await page.default());
assert.equal(renderedProps,null);assert.match(html,/View-only family profile/);assert.match(html,/0<!-- --> minutes|0 minutes/);
for(const result of [{data:raw,error:{message:'private failure'}},{data:{...raw,childId:'other'},error:null},{data:null,error:null}]) {
  pageResult=result;await assert.rejects(page.default(),error=>/could not be loaded/.test(error.message)&&!error.message.includes('private failure'));
}
role='owner';
delete globalThis.HTMLInputElement;delete globalThis.HTMLSelectElement;
console.log('PASS checked profile action/form: coherent snapshot parser, version/child binding, zero/missing/invalid inputs, viewer denial, no raw errors, strict confirmation and partial-save recovery, redirect outside catch, retained Unicode/checkbox/select entries, selectable stale text, reset prevention and pending controls. Mocked transport/SSR, not hosted mutations or browser interaction evidence.');
