// Writes only newly created, labelled children in the designated disposable family.
// Never switches the active child, edits an existing profile/plan or calls AI.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
if(!process.argv.includes('--live')||!process.argv.includes('--write-test-records')){
  console.log('Dry run. --live --write-test-records tests language add/save/reload/retry on two new synthetic children in the named disposable family. Fixtures retained.');process.exit(0);
}
let stage='configuration';
try{
  process.loadEnvFile('.env.local');process.loadEnvFile('.env.test.local');
  const options={auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(i,o)=>fetch(i,{...o,signal:AbortSignal.timeout(12000)})}};
  const client=()=>createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);
  const c=client(),anon=client();
  stage='disposable owner safeguards';
  const signed=await c.auth.signInWithPassword({email:process.env.MIRA_TEST_OWNER_EMAIL,password:process.env.MIRA_TEST_OWNER_PASSWORD});assert.ok(!signed.error&&signed.data.user);
  const member=await c.from('family_members').select('family_id,role').eq('user_id',signed.data.user.id).single();assert.ok(!member.error&&member.data?.role==='owner');
  const family=await c.from('families').select('display_name').eq('id',member.data.family_id).single();assert.ok(!family.error&&family.data?.display_name==='MIRA disposable pilot test 0');
  const kids=await c.from('children').select('id').eq('family_id',member.data.family_id);assert.equal(kids.error,null);const ids=kids.data.map(x=>x.id);
  const snapshot=async()=>{
    const result={};
    for(const table of ['plans','activity_instances','child_language_goals']){
      const read=ids.length?await c.from(table).select('*').in('child_id',ids).order('id'):{data:[],error:null};assert.equal(read.error,null);result[table]=read.data;
    }
    for(const table of ['family_preferences','caregivers']){const read=await c.from(table).select('*').eq('family_id',member.data.family_id);assert.equal(read.error,null);result[table]=read.data;}
    const settings=await c.from('user_settings').select('*').eq('user_id',signed.data.user.id);assert.equal(settings.error,null);result.settings=settings.data;
    return result;
  };
  const before=await snapshot(),missing='00000000-0000-4000-8000-000000000000';
  stage='008 preflight before mutation';
  const args={p_child_id:missing,p_request_id:randomUUID(),p_language_code:'hi'};
  assert.equal((await c.rpc('add_family_language',args)).error?.message,'MIRA_LANGUAGE_ACCESS');
  assert.equal((await anon.rpc('add_family_language',args)).error?.code,'42501');
  for(const actor of [c,anon])assert.equal((await actor.from('language_add_requests').select('*').limit(0)).error?.code,'42501');
  const create=async name=>{const r=await c.from('children').insert({family_id:member.data.family_id,nickname:name,birth_year:2024,birth_month:1}).select('id').single();assert.equal(r.error,null);return r.data.id;};
  stage='new synthetic children';const child=await create('Synthetic language persistence'),sibling=await create('Synthetic language boundary');
  const request=randomUUID();const addArgs={p_child_id:child,p_request_id:request,p_language_code:'hi'};
  stage='simultaneous identical add requests';
  const additions=await Promise.all([c.rpc('add_family_language',addArgs),c.rpc('add_family_language',addArgs)]);
  for(const result of additions)assert.equal(result.error,null);assert.equal(additions[0].data,additions[1].data);const goal=additions[0].data;
  const read=async()=>{const r=await c.from('child_language_goals').select('*').eq('child_id',child).single();assert.equal(r.error,null);return r.data;};
  const initial=await read();const empty={schemaVersion:1,role:null,state:null,variety:null,oralGoal:null,literacyGoal:null,support:null};assert.deepEqual(initial.environment,empty);
  assert.equal((await c.rpc('add_family_language',{...addArgs,p_request_id:randomUUID()})).error?.message,'MIRA_LANGUAGE_EXISTS');
  assert.equal((await c.rpc('add_family_language',{...addArgs,p_language_code:'fr'})).error?.message,'MIRA_LANGUAGE_REQUEST_CHANGED');
  const environment={...empty,role:'family',state:'active',oralGoal:'  घर की बातें  ',support:[{caregiverId:null,label:'Synthetic aunt',comfort:'comfortable',contact:'occasional',contexts:['  وقت القصة  ']}]};
  const save=(revision,context,target=child)=>c.rpc('save_language_environment',{p_child_id:target,p_goal_id:goal,p_expected_revision:revision,p_environment:context});
  stage='save/reload/exact retry';assert.equal((await save(0,environment)).data,1);const stored=await read();assert.deepEqual(stored.environment,environment);
  assert.equal((await save(0,environment)).data,1);assert.deepEqual(await read(),stored);
  assert.equal((await save(1,empty,sibling)).error?.message,'MIRA_LANGUAGE_NOT_FOUND');
  assert.equal((await save(1,{...environment,support:[{...environment.support[0],caregiverId:missing}]})).error?.message,'MIRA_LANGUAGE_CAREGIVER_LINK');
  assert.deepEqual(await read(),stored);
  stage='conflicting simultaneous saves';
  const outcomes=await Promise.all([save(1,{...environment,state:'future'}),save(1,{...environment,state:'paused'})]);
  assert.equal(outcomes.filter(x=>x.error===null&&x.data===2).length,1);assert.equal(outcomes.filter(x=>x.error?.message==='MIRA_LANGUAGE_STALE').length,1);
  assert.ok(['future','paused'].includes((await read()).environment.state));
  stage='clear and stale restore';assert.equal((await save(2,null)).data,3);const cleared=await read();assert.equal(cleared.environment,null);
  assert.equal((await save(2,null)).data,3);assert.deepEqual(await read(),cleared);assert.equal((await save(2,environment)).error?.message,'MIRA_LANGUAGE_STALE');
  stage='existing records unchanged';assert.deepEqual(await snapshot(),before);
  console.log('PASS hosted languages: 008 access preflight, private receipts, concurrent identical add (one goal), changed/duplicate requests denied, exact Unicode save/reload/retry, wrong-child/missing-caregiver denial, conflicting saves (one winner), clear/retry/stale restore. Existing plans, goals, caregivers, preferences and active-child setting unchanged. Two new synthetic children retained; no AI or browser-save claim.');
}catch{console.error('Language check stopped at '+stage+'. New synthetic fixtures, if any, are retained. No private values logged.');process.exitCode=1;}
