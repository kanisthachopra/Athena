import assert from 'node:assert/strict';
import { calendarFixture } from './fixtures/family-calendar.mjs';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { evidenceFixture } from './fixtures/activity-evidence.mjs';
import { contextFixture } from './fixtures/activity-context-sql.mjs';
const require=createRequire(import.meta.url);
function load(path,deps={}) {
  deps = { '@/lib/family-calendar': calendarFixture, ...deps };
  const js=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const exports={};new Function('require','exports',js)(id=>id==='@/lib/activity-publication-context'?load('../lib/activity-publication-context.ts'):deps[id]??require(id),exports);return exports;
}
const grounding=load('../lib/guide-grounding.ts');
const evidence=load('../lib/activity-evidence.ts',{'@/lib/guide-grounding':grounding});
const lib=load('../lib/activity-content.ts',{'@/lib/activity-evidence':evidence,'@/lib/activity-context':load('../lib/activity-context.ts')}),view=load('../lib/library-view.ts');
const templateId='11111111-1111-4111-8111-111111111111',instanceId='22222222-2222-4222-8222-222222222222';
const template={id:templateId,content_version:2,title:'Saved synthetic title',instructions:'Saved synthetic instructions',summary:'Saved synthetic summary',domain:'language',duration_minutes:5,setup_minutes:1,cleanup_level:'low',parent_preparation:'Saved preparation',adult_role:'Saved role',conversation_prompt:'Saved prompt',look_for:'Saved noticing',child_choices:'Saved choices',make_easier:'Saved easier',extend_activity:'Saved extension',stop_signals:'Saved stop signal',avoid_prompt:'Saved avoid',safety_note:'Saved safety',supervision_level:'close',why_it_matters:'Saved purpose',source_note:'Synthetic fixture only',review_status:'expert_reviewed',materials:['Saved material'],observation_prompts:[],support_ladder:[],hazards:[]};
const snapshot={schema_version:1,selected_at:'2026-10-01T12:00:00Z',template,review:{content_version:2,reviewed_at:'2026-09-30T12:00:00Z',review_due_on:'2027-10-01'}};
assert.equal(lib.savedActivityContent(null,templateId).state,'legacy');
assert.equal(lib.savedActivityContent(undefined,templateId).state,'legacy');
assert.equal(lib.savedActivityContent(null,null).state,'open');
const parsed=lib.savedActivityContent(snapshot,templateId);assert.equal(parsed.state,'saved');assert.equal(parsed.template.instructions,template.instructions);
assert.deepEqual(parsed.template.activity_template_capabilities,[]);
assert.equal(parsed.template.sourceClaims,null);
const withEvidence={...snapshot,schema_version:2,evidence:evidenceFixture(templateId)};
assert.equal(lib.savedActivityContent(withEvidence,templateId).template.sourceClaims[0].applicability,'Fictional software example only.');
assert.equal(lib.savedActivityContent({...withEvidence,evidence:[]},templateId).state,'invalid');
assert.equal(lib.savedActivityContent({...withEvidence,schema_version:'2'},templateId).state,'invalid');
const withContext={...withEvidence,template:{...template,context_requirements:contextFixture},family_context:{template_id:templateId,content_version:2,contract:contextFixture,revision:1,valid_from:'2026-10-01',valid_until:'2026-10-02',answers:{adult:true,book:true}}};
assert.deepEqual(lib.savedActivityContent(withContext,templateId).template.familyContext.answers,{adult:true,book:true});
assert.equal(lib.savedActivityContent({...withContext,family_context:null},templateId).state,'invalid');
assert.equal(lib.savedActivityContent({...withContext,family_context:{...withContext.family_context,content_version:1}},templateId).state,'invalid');
for(const patch of [{contract:null},{contract:{...contextFixture,max_valid_days:6}},{contract:{...contextFixture,checks:contextFixture.checks.map((q,i)=>i? q:{...q,statement:'Changed question'})}},{contract:{...contextFixture,not_required:{...contextFixture.not_required,readiness:'Different rationale'}}},{valid_until:'2026-10-08'}])assert.equal(lib.savedActivityContent({...withContext,family_context:{...withContext.family_context,...patch}},templateId).state,'invalid');
const reorderedContract={not_required:{restrictions:contextFixture.not_required.restrictions,readiness:contextFixture.not_required.readiness,environment:contextFixture.not_required.environment},checks:contextFixture.checks.map(q=>({statement:q.statement,category:q.category,id:q.id})),max_valid_days:7,schema_version:1};
assert.equal(lib.savedActivityContent({...withContext,family_context:{...withContext.family_context,contract:reorderedContract}},templateId).state,'saved');
for(const broken of [{},[],{...snapshot,schema_version:2},{...snapshot,review:null},{...snapshot,review:{...snapshot.review,content_version:9}},{...snapshot,template:{...template,id:'wrong'}},{...snapshot,template:{...template,safety_note:null}},{...snapshot,template:{...template,materials:[{}]}},{...snapshot,template:{...template,duration_minutes:-1}}]) assert.equal(lib.savedActivityContent(broken,templateId).state,'invalid');
assert.equal(lib.activityUseMessage(null),null);assert.match(lib.activityUseMessage(null,true),/could not check/);
assert.match(lib.activityUseMessage('MIRA_SAVED_CONTENT_CHANGED'),/library entry changed/i);

let activity={id:instanceId,template_id:templateId,content_snapshot:snapshot,status:'planned',opportunity_type:'intentional',personalized_title:template.title,personalized_instructions:template.instructions,selection_reason:'Saved selection reason',estimated_parent_minutes:1,scheduled_date:'2026-10-01',activity_templates:{...template,title:'MUTABLE NEW TITLE',summary:'MUTABLE NEW SUMMARY',safety_note:'MUTABLE NEW SAFETY'}};
let useReason=null,useError=null;
const queryLog=[];
const client={from(table){const chain={select(selection){queryLog.push({table,selection});return chain;},eq(){return chain;},maybeSingle(){return chain;},order(){return chain;},limit(){return chain;},then(resolve,reject){return Promise.resolve({data:table==='activity_instances'?activity:table==='observations'?null:table==='plans'?[{id:'plan',week_start:'2026-09-28',generation_method:'reviewed_portfolio_v3',adaptation_summary:'Saved note'}]:{family_id:'family'},error:null}).then(resolve,reject);}};return chain;},async rpc(){return {data:useReason,error:useError};}};
const {SourceRecords}=load('../components/source-records.tsx');
const {ActivityPreparation}=load('../components/activity-preparation.tsx',{'@/lib/library-view':view,'@/components/source-records':{SourceRecords}});
const publicationContext={schema_version:1,language_variety:'en-SG',readiness:'Fictional readiness',exclusions:'Fictional exclusion',associations:{capabilities:[{code:'communication_language',emphasis:'primary',rationale:'Fictional opportunity'}],tracks:[]}};
const publicationSnapshot={...withContext,template:{...withContext.template,publication_context:publicationContext}};
const publicationParsed=lib.savedActivityContent(publicationSnapshot,templateId);assert.equal(publicationParsed.state,'saved');
const publicationHtml=renderToStaticMarkup(React.createElement(ActivityPreparation,{title:template.title,instructions:template.instructions,template:publicationParsed.template,savedVersion:true}));
for(const text of ['Instruction language: en-SG','Fictional readiness','Fictional exclusion','Fictional opportunity','not what your child must demonstrate'])assert.ok(publicationHtml.includes(text));
for(const patch of [{language_variety:null},{readiness:''},{exclusions:null},{associations:{capabilities:[],tracks:[]}}])assert.equal(lib.savedActivityContent({...publicationSnapshot,template:{...publicationSnapshot.template,publication_context:{...publicationContext,...patch}}},templateId).state,'invalid');
const contextHtml=renderToStaticMarkup(React.createElement(ActivityPreparation,{title:template.title,instructions:template.instructions,template:lib.savedActivityContent(withContext,templateId).template,savedVersion:true}));
assert.ok(contextHtml.includes('Family context when this was selected'));assert.ok(contextHtml.includes('not a safety certification'));assert.ok(contextHtml.includes('2026-10-02'));
const common={
  '@/lib/activity-content':lib,
  '@/lib/family-context':{requireFamilyContext:async()=>({supabase:client,membership:{role:'owner',family_id:'family'},family:{display_name:'Synthetic family'},activeChild:{id:'child',nickname:'Synthetic child'}})},
  '@/components/app-header':{AppHeader:()=>null},
  'next/link':{default:({children,...props})=>React.createElement('a',props,children)},
  'next/navigation':{notFound(){throw Error('not found');},redirect(){throw Error('redirect');}},
};
const activityPage=load('../app/activity/[id]/page.tsx',{
  ...common,'@/components/activity-preparation':{ActivityPreparation},
  '@/components/feedback-form':{FeedbackForm:()=>React.createElement('div',null,'Observation form preserved')},
  '@/lib/activity-observation':{challengeLabels:{},engagementLabels:{}},'../actions':{skipActivity(){}},
}).default;
const renderActivity=async()=>renderToStaticMarkup(await activityPage({params:Promise.resolve({id:instanceId})}));
let html=await renderActivity();
for(const text of ['Saved synthetic instructions','Saved safety','Saved template','Status when selected','Observation form preserved'])assert.ok(html.includes(text),text);
assert.ok(!html.includes('MUTABLE NEW'));assert.ok(!html.includes('Current template'));
assert.ok(html.includes('No versioned claim records'));
activity={...activity,content_snapshot:withEvidence};html=await renderActivity();
for(const text of ['Sources saved with this activity','Where this applies','Fictional software example only.','What this does not establish','Synthetic source'])assert.ok(html.includes(text),text);
assert.ok(html.includes('rel="noopener noreferrer"'));
useReason='MIRA_SAVED_CONTENT_CHANGED';html=await renderActivity();assert.ok(html.includes('library entry changed'));assert.ok(html.includes('Saved synthetic instructions'));
useError={message:'private failure'};html=await renderActivity();assert.ok(html.includes('could not check'));assert.ok(!html.includes('private failure'));useError=null;
activity={...activity,content_snapshot:null};html=await renderActivity();assert.ok(html.includes('no saved template version'));assert.ok(html.includes('Read the original saved text'));assert.ok(!html.includes('MUTABLE NEW'));assert.ok(!html.includes('Before you begin'));
activity={...activity,template_id:null,opportunity_type:'open'};html=await renderActivity();assert.ok(html.includes('An open day'));assert.ok(!html.includes('Choose something else'));

const todayPage=load('../app/today/page.tsx',common).default;
activity={...activity,template_id:templateId,opportunity_type:'intentional',content_snapshot:snapshot};useReason=null;
html=renderToStaticMarkup(await todayPage());assert.ok(html.includes('Read preparation'));assert.ok(html.includes('Saved safety'));assert.ok(!html.includes('MUTABLE NEW'));
useReason='MIRA_REVIEW_MISSING_OR_STALE';html=renderToStaticMarkup(await todayPage());assert.ok(html.includes('View saved record'));assert.ok(!html.includes('Before you begin'));
activity={...activity,content_snapshot:null};html=renderToStaticMarkup(await todayPage());assert.ok(html.includes('original template version was not saved'));assert.ok(!html.includes('Nothing planned'));
assert.ok(queryLog.filter(q=>q.table==='activity_instances').every(q=>!q.selection.includes('activity_templates')));
console.log('Saved-content checks pass: strict snapshot parsing, no mutable-library fallback, exact saved preparation, unknown legacy/open records, retired/failed use checks and observation controls retained. Synthetic server renders only; no live content or approval.');
