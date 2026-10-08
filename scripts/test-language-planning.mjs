import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const js=ts.transpileModule(readFileSync(new URL('../lib/language-planning.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const api={};new Function('exports',js)(api);
assert.equal(api.planningLanguages.length,40);
assert.equal(new Set(api.planningLanguages.map(([code])=>code)).size,40);
const names=new Intl.DisplayNames(['en'],{type:'language',fallback:'none'});
for(const [code,label] of api.planningLanguages){assert.ok(names.of(code));assert.equal(api.planningLanguageLabel(code),label);}
assert.equal(api.planningLanguageLabel('My family variety'),'My family variety');
assert.equal(api.hasPlanningLanguage([' English '], 'en'),true);
assert.equal(api.hasPlanningLanguage(['HI'], 'hi'),true);
assert.equal(api.hasPlanningLanguage(['हिन्दी'], 'hi'),false);
assert.equal(api.hasPlanningLanguage(['English variety'], 'en'),false);
const empty=api.emptyLanguageEnvironment();
assert.equal(api.summarizeLanguageEnvironment(empty).status,'unknown');
assert.equal(empty.support,null);
const context={...empty,role:'heritage',state:'active',oralGoal:'Talk with family',support:[{caregiverId:null,label:'अम्मा',comfort:'comfortable',contact:'occasional',contexts:['घर की बातचीत','  وقت القصة  ']}]};
const before=JSON.stringify(context);
assert.deepEqual(api.parseLanguageEnvironment(context),context);
const summary=api.summarizeLanguageEnvironment(context);
assert.equal(summary.status,'contexts_reported');assert.equal(summary.createsActivities,false);
assert.equal(summary.reportedContexts.length,2);assert.equal(summary.reportedContexts[1].context,'  وقت القصة  ');
assert.equal(summary.reportedContexts[0].contact,'occasional');
assert.equal(JSON.stringify(context),before);
for(const state of ['paused','future']){const result=api.summarizeLanguageEnvironment({...context,state});assert.equal(result.status,state);assert.deepEqual(result.reportedContexts,[]);}
assert.equal(api.summarizeLanguageEnvironment({...context,role:'future'}).status,'clarify');
assert.equal(api.summarizeLanguageEnvironment({...context,support:null}).status,'unknown');
assert.equal(api.summarizeLanguageEnvironment({...context,support:[]}).status,'support_needed');
for(const comfort of [null,'learning','not_comfortable']){
  const result=api.summarizeLanguageEnvironment({...context,support:[{...context.support[0],comfort}]});
  assert.deepEqual(result.reportedContexts,[]);assert.equal(result.createsActivities,false);
}
for(const contact of [null,'unavailable'])assert.deepEqual(api.summarizeLanguageEnvironment({...context,support:[{...context.support[0],contact}]}).reportedContexts,[]);
const negatives=[x=>x.state='fluent',x=>x.role='native',x=>x.proficiency='advanced',x=>x.support[0].caregiverId='other',x=>x.support[0].contexts=['Same',' same '],x=>x.support[0].comfort='fluent',x=>x.support[0].label='',x=>x.support[0].contexts=['x'.repeat(121)],x=>x.oralGoal='x'.repeat(401),x=>x.schemaVersion=2,x=>x.support=Array(13).fill(context.support[0])];
for(const mutate of negatives){const invalid=structuredClone(context);mutate(invalid);assert.equal(api.parseLanguageEnvironment(invalid),null);assert.equal(api.summarizeLanguageEnvironment(invalid).status,'invalid');}
const id='10000000-0000-4000-8000-000000000001';
assert.equal(api.parseLanguageEnvironment({...context,support:[{...context.support[0],caregiverId:id},{...context.support[0],caregiverId:id}]}),null);
for(const unknown of [null,[],42,'Hindi',{}])assert.equal(api.summarizeLanguageEnvironment(unknown).createsActivities,false);
assert.ok(api.parseLanguageEnvironment({...context,oralGoal:'🌱'.repeat(400)}));
assert.equal(api.parseLanguageEnvironment({...context,oralGoal:'🌱'.repeat(401)}),null);
assert.deepEqual(api.languageEnvironmentFieldErrors({...context,oralGoal:'🌱'.repeat(400)}),{});
assert.match(api.languageEnvironmentFieldErrors({...context,oralGoal:'🌱'.repeat(401)}).oralGoal,/400 characters/);
assert.match(api.languageEnvironmentFieldErrors({...context,variety:' '.repeat(4)}).variety,/spaces alone/);
assert.match(api.languageEnvironmentFieldErrors({...context,literacyGoal:'x'.repeat(401)}).literacyGoal,/400 characters/);
for(const [patch,key,pattern] of [[{label:' '},'label',/name or description/],[{label:'x'.repeat(101)},'label',/100 characters/],[{contexts:['same',' Same ']},'contexts',/repeated/],[{contexts:['x'.repeat(121)]},'contexts',/120 characters/],[{contexts:Array.from({length:9},(_,i)=>String(i))},'contexts',/eight moments/]]){
  assert.match(api.languageEnvironmentFieldErrors({...context,support:[{...context.support[0],...patch}]})[`support.0.${key}`],pattern);
}
assert.match(api.languageEnvironmentFieldErrors({...context,support:[{...context.support[0],caregiverId:id},{...context.support[0],caregiverId:id} ]})['support.1.caregiverId'],/already linked/);

// Exercise the real server action with transport mocks; no provider or live data.
const child='10000000-0000-4000-8000-000000000001',goal='10000000-0000-4000-8000-000000000002';
let role='owner',reply={data:1,error:null},calls=[],refresh=[],cacheFails=false;
const deps={
  '@/lib/language-planning':api,
  '@/lib/family-context':{requireFamilyContext:async()=>({activeChild:{id:child},membership:{role},supabase:{rpc:async(name,args)=>{calls.push({name,args});if(reply instanceof Error)throw reply;return reply;}}})},
  'next/cache':{revalidatePath:path=>{if(cacheFails)throw new Error('cache');refresh.push(path);}},
};
const actions={};
new Function('require','exports',ts.transpileModule(readFileSync(new URL('../app/family/languages/actions.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(name=>deps[name]??require(name),actions);
const form=(patch={})=>{const result=new FormData();for(const [key,value] of Object.entries({childId:child,goalId:goal,revision:'0',operation:'save',environment:JSON.stringify(context),...patch}))if(value!==null)result.append(key,value);return result;};
const run=(patch={})=>actions.saveLanguageEnvironment({status:'idle'},form(patch));
assert.equal((await run()).status,'saved');assert.equal(calls.length,1);
assert.deepEqual(calls[0],{name:'save_language_environment',args:{p_child_id:child,p_goal_id:goal,p_expected_revision:0,p_environment:context}});
assert.deepEqual(refresh,['/family','/family/languages','/week']);
for(const patch of [{childId:null},{childId:goal},{goalId:'bad'},{revision:null},{revision:'1.5'},{revision:'-1'},{revision:'2147483647'},{operation:null},{operation:'delete'},{environment:'null'},{environment:'{'},{environment:'x'.repeat(50001)}]){
  calls=[];assert.equal((await run(patch)).status,Object.hasOwn(patch,'environment')?'invalid':'error');assert.deepEqual(calls,[]);
}
calls=[];const longAnswer=await run({environment:JSON.stringify({...context,oralGoal:'x'.repeat(401)})});assert.equal(longAnswer.status,'invalid');assert.match(longAnswer.fieldErrors.oralGoal,/400 characters/);assert.deepEqual(calls,[]);
role='viewer';calls=[];assert.equal((await run()).status,'error');assert.deepEqual(calls,[]);role='owner';
calls=[];assert.equal((await run({operation:'clear',environment:null})).status,'saved');assert.equal(calls[0].args.p_environment,null);
for(const message of ['MIRA_LANGUAGE_ACCESS','MIRA_LANGUAGE_NOT_FOUND','MIRA_LANGUAGE_CAREGIVER_LINK','private details']){reply={error:{message}};const result=await run();assert.equal(result.status,'error');assert.ok(!result.message.includes('private'));}
reply={error:{message:'MIRA_LANGUAGE_STALE'}};assert.equal((await run()).status,'stale');
for(const data of [null,'1',-1,2,{},NaN]){reply={data,error:null};assert.equal((await run()).status,'error');}
reply=new Error('private transport');assert.equal((await run()).status,'error');
reply={data:1,error:null};cacheFails=true;assert.equal((await run()).status,'saved');
const addForm=(patch={})=>{const result=new FormData();for(const [key,value] of Object.entries({childId:child,requestId:goal,languageCode:'hi',...patch}))if(value!==null)result.set(key,value);return result;};
const addRun=(patch={})=>actions.addFamilyLanguage({status:'idle'},addForm(patch));
reply={data:goal,error:null};calls=[];assert.equal((await addRun()).status,'saved');
assert.deepEqual(calls,[{name:'add_family_language',args:{p_child_id:child,p_request_id:goal,p_language_code:'hi'}}]);
for(const patch of [{childId:null},{childId:goal},{requestId:null},{requestId:'bad'},{languageCode:'Hindi'},{languageCode:'xx'},{languageCode:null}]){calls=[];assert.equal((await addRun(patch)).status,'error');assert.deepEqual(calls,[]);}
role='viewer';calls=[];assert.equal((await addRun()).status,'error');assert.deepEqual(calls,[]);role='owner';
for(const message of ['MIRA_LANGUAGE_LIST_FULL','MIRA_LANGUAGE_EXISTS','MIRA_LANGUAGE_REQUEST_RETIRED','MIRA_LANGUAGE_REQUEST_CHANGED','MIRA_LANGUAGE_ACCESS','private raw error']){reply={error:{message}};const result=await addRun();assert.equal(result.status,'error');assert.ok(!result.message.includes('private'));}
for(const data of [null,1,{},'bad']){reply={data,error:null};assert.equal((await addRun()).status,'error');}
reply=new Error('transport');assert.equal((await addRun()).status,'error');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const componentSource=ts.transpileModule(readFileSync(new URL('../components/family-language-contexts.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const componentDeps={
  '@/lib/language-planning':api,
  'next/navigation':{useRouter:()=>({refresh:()=>refresh.push('router')})},
  'next/link':{default:({children,...props})=>React.createElement('a',props,children)},
  '@/app/family/languages/actions':{saveLanguageEnvironment:async(_previous,payload)=>{calls.push(Object.fromEntries(payload));if(reply instanceof Error)throw reply;return reply;},addFamilyLanguage:async(_previous,payload)=>{calls.push(Object.fromEntries(payload));if(reply instanceof Error)throw reply;return reply;}},
};
function component(extra={}){const result={};new Function('require','exports',componentSource)(name=>extra[name]??componentDeps[name]??require(name),result);return result;}
const props={childId:child,childName:'Synthetic',goals:[{id:goal,language_code:'hi',environment:context,environment_revision:0}],caregivers:[],readOnly:false,unavailable:false};
const markup=options=>renderToStaticMarkup(React.createElement(component().FamilyLanguageContexts,{...props,...options}));
let html=markup({});assert.match(html,/name="family-language-contexts"/);assert.match(html,/name="childId"/);assert.match(html,/Save language details/);assert.match(html,/mira-input/);
html=markup({readOnly:true});assert.match(html,/read-only/);assert.doesNotMatch(html,/<form|Save language details/);
html=markup({goals:[]});assert.match(html,/No language goals yet/);assert.match(html,/Add language/);assert.equal((html.match(/<option value=/g)||[]).length,41);
html=markup({unavailable:true});assert.match(html,/role="alert"/);assert.doesNotMatch(html,/<form|No language goals yet/);
html=markup({goals:[{...props.goals[0],environment:{bad:true}}]});assert.match(html,/could not be read/);assert.doesNotMatch(html,/Save language details/);
function find(node,predicate){if(!node||typeof node!=='object')return null;if(predicate(node))return node;for(const child of [node.props?.children].flat(Infinity)){const found=find(child,predicate);if(found)return found;}return null;}
let stateSlots=[],cursor=0,callback,pending=false;const retryRef={current:null};
const mocked=component({react:{...React,useState:initial=>{const index=cursor++;if(!(index in stateSlots))stateSlots[index]=typeof initial==='function'?initial():initial;return[stateSlots[index],value=>{stateSlots[index]=typeof value==='function'?value(stateSlots[index]):value;}];},useRef:()=>retryRef,useActionState:fn=>{callback=fn;return[{status:'idle'},()=>{},pending];}}});
const editor=find(mocked.FamilyLanguageContexts(props),node=>node.type?.name==='LanguageEditor');
const renderEditor=(override={})=>{cursor=0;return editor.type({...editor.props,...override});};
const editorForm=tree=>{const result=new FormData();for(const name of ['childId','goalId','revision','environment','operation']){const input=find(tree,node=>node.type==='input'&&node.props.name===name);result.set(name,input.props.value);}return result;};
let tree=renderEditor(),first=editorForm(tree);calls=[];reply=new Error('network');await callback({status:'idle'},first);
tree=renderEditor();assert.equal(find(tree,node=>node.type==='fieldset').props.disabled,true);assert.match(renderToStaticMarkup(tree),/Retry the same save/);
reply={status:'error',message:'Unknown save'};await callback({status:'idle'},new FormData());assert.deepEqual(calls[1],calls[0],'retry uses the exact first payload even with disabled/absent fields');
tree=renderEditor();find(tree,node=>node.type==='button'&&node.props.children==='Edit this draft').props.onClick();
tree=renderEditor();assert.equal(find(tree,node=>node.type==='fieldset').props.disabled,false);
reply={status:'stale',message:'Changed elsewhere'};await callback({status:'idle'},editorForm(tree));
tree=renderEditor({goal:{...props.goals[0],environment:{...context,state:'paused'},environment_revision:1}});
assert.equal(JSON.parse(editorForm(tree).get('environment')).state,'active','refresh must not replace the draft');
assert.match(renderToStaticMarkup(tree),/Your draft is still above/);
find(tree,node=>node.type==='button'&&node.props.children==='Discard draft and use saved details').props.onClick();
tree=renderEditor({goal:{...props.goals[0],environment:{...context,state:'paused'},environment_revision:1}});
assert.equal(JSON.parse(editorForm(tree).get('environment')).state,'paused');assert.equal(editorForm(tree).get('revision'),'1');
find(tree,node=>node.type==='button'&&node.props.children==='Clear saved details…').props.onClick();tree=renderEditor();assert.equal(editorForm(tree).get('operation'),'clear');
assert.match(renderToStaticMarkup(tree),/Keep details/);reply={status:'saved',revision:2,message:'Cleared'};await callback({status:'idle'},editorForm(tree));
tree=renderEditor();assert.equal(JSON.parse(editorForm(tree).get('environment')).support,null);assert.equal(editorForm(tree).get('revision'),'2');assert.equal(retryRef.current,null);
pending=true;tree=renderEditor();assert.equal(find(tree,node=>node.type==='fieldset').props.disabled,true);
pending=false;reply={status:'invalid',message:'Check the marked fields.',fieldErrors:{oralGoal:'Keep this to 400 characters or fewer.'}};
await callback({status:'idle'},editorForm(tree));tree=renderEditor();
assert.equal(retryRef.current,null);assert.equal(find(tree,node=>node.type==='fieldset').props.disabled,false);
const invalidField=find(tree,node=>node.type==='textarea'&&node.props.id.endsWith('-oral'));
assert.equal(invalidField.props['aria-invalid'],true);assert.ok(invalidField.props['aria-describedby'].endsWith('-oralGoal-error'));
assert.match(renderToStaticMarkup(tree),/Keep this to 400 characters/);assert.doesNotMatch(renderToStaticMarkup(tree),/Retry the same save/);
stateSlots=[];cursor=0;retryRef.current=null;pending=false;
const addComponent=find(mocked.FamilyLanguageContexts(props),node=>node.type?.name==='AddLanguage');
const renderAdd=()=>{cursor=0;return addComponent.type(addComponent.props);};
tree=renderAdd();assert.equal(find(tree,node=>node.type==='button'&&node.props.type==='submit').props.disabled,true);
find(tree,node=>node.type==='select').props.onChange({target:{value:'fr'}});tree=renderAdd();
assert.equal(find(tree,node=>node.type==='button'&&node.props.type==='submit').props.disabled,false);
calls=[];reply=new Error('transport');await callback({status:'idle'},addForm({languageCode:'fr',requestId:null}));
tree=renderAdd();assert.equal(find(tree,node=>node.type==='select').props.disabled,true);assert.match(renderToStaticMarkup(tree),/Retry adding this language/);
reply={status:'error',message:'Unknown'};await callback({status:'idle'},new FormData());assert.deepEqual(calls[1],calls[0]);assert.match(calls[0].requestId,/^[a-f0-9-]{36}$/);
reply={status:'saved',goalId:goal,message:'French added'};await callback({status:'idle'},new FormData());tree=renderAdd();
assert.equal(find(tree,node=>node.type==='select').props.value,'');assert.equal(retryRef.current,null);
assert.equal(find(tree,node=>node.type==='option'&&node.props.value==='fr').props.disabled,true,'confirmed addition is disabled even before refreshed props arrive');
console.log('PASS language helpers/action/editor: strict reports, nullable support, child/role boundaries, exact retry after thrown/returned failure, draft retention across refreshed props, explicit stale reconciliation and confirmed clear, read-only/empty/unavailable/invalid rendering, export boundaries and no AI. Transport/hooks are mocked, not browser save evidence.');
