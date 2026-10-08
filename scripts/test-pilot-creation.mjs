// Opt-in, scoped only to the owner's explicitly designated disposable family.
// Retains one synthetic child. Never creates a family, plan, activity or AI request.
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
if(!process.argv.includes('--live')||!process.argv.includes('--write-test-records')) {
  console.log('Dry run: --live --write-test-records required. Uses disposable owner only, retains one synthetic child, checks concurrent exact retries and restores its prior active-child choice.');
  process.exit(0);
}
let stage='configuration',client,priorActive=null,testChild=null;
try {
  process.loadEnvFile('.env.local');process.loadEnvFile('.env.test.local');
  client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(15000)})},
  });
  stage='disposable owner authentication';
  const signed=await client.auth.signInWithPassword({email:process.env.MIRA_TEST_OWNER_EMAIL,password:process.env.MIRA_TEST_OWNER_PASSWORD});
  assert.ok(!signed.error&&signed.data.user,'Disposable sign-in failed');
  const user=signed.data.user.id;
  stage='disposable family safeguards';
  const membership=await client.from('family_members').select('family_id,role').eq('user_id',user).single();
  assert.equal(membership.error,null);assert.equal(membership.data.role,'owner');
  const familyId=membership.data.family_id;
  const family=await client.from('families').select('display_name').eq('id',familyId).single();
  assert.equal(family.error,null);assert.equal(family.data.display_name,'MIRA disposable pilot test 0','Non-test family; refusing writes');
  const setting=await client.from('user_settings').select('active_child_id').eq('user_id',user).maybeSingle();
  assert.equal(setting.error,null);priorActive=setting.data?.active_child_id;
  assert.ok(priorActive,'A prior active disposable child is required');
  const snapshot=async()=>{
    const children=await client.from('children').select('id').eq('family_id',familyId);assert.equal(children.error,null);
    const ids=children.data.map(c=>c.id);
    const plans=await client.from('plans').select('*').in('child_id',ids).order('id');assert.equal(plans.error,null);
    const items=await client.from('activity_instances').select('*').in('child_id',ids).order('id');assert.equal(items.error,null);
    return {plans:plans.data,items:items.data};
  };
  const before=await snapshot();
  const args={p_request_id:'90000000-0000-4000-8000-000000002014',p_family_id:familyId,p_nickname:'Synthetic creation retry',p_birth_year:2024,p_birth_month:1};
  stage='simultaneous exact child creation';
  const results=await Promise.all([client.rpc('add_child_to_family_checked',args),client.rpc('add_child_to_family_checked',args)]);
  if(results.some(result=>result.error)) console.error('Creation failure codes (details withheld):',results.map(result=>result.error?.code??'none').join(', '));
  for(const result of results)assert.equal(result.error,null,'Checked creation failed');
  assert.equal(results[0].data,results[1].data);testChild=results[0].data;
  const children=await client.from('children').select('id,nickname,birth_year,birth_month').eq('family_id',familyId).eq('nickname',args.p_nickname);
  assert.equal(children.error,null);assert.equal(children.data.length,1);assert.equal(children.data[0].id,testChild);
  stage='changed-payload denial';
  const changed=await client.rpc('add_child_to_family_checked',{...args,p_nickname:'Must not create'});
  assert.ok(changed.error?.message.includes('MIRA_CREATION_REQUEST_CHANGED'),'Expected exact request-change denial');
  stage='active-child restoration';
  const current=await client.from('user_settings').select('active_child_id').eq('user_id',user).single();assert.equal(current.error,null);
  if(current.data.active_child_id===testChild) {
    const restored=await client.rpc('set_active_child',{p_child_id:priorActive});assert.equal(restored.error,null);
  }
  stage='retry preserves later selection';
  const replay=await client.rpc('add_child_to_family_checked',args);assert.equal(replay.error,null);assert.equal(replay.data,testChild);
  const afterSetting=await client.from('user_settings').select('active_child_id').eq('user_id',user).single();assert.equal(afterSetting.error,null);
  assert.equal(afterSetting.data.active_child_id,current.data.active_child_id===testChild?priorActive:current.data.active_child_id);
  assert.deepEqual(await snapshot(),before);
  console.log('PASS hosted disposable creation: two concurrent identical calls returned one retained synthetic child; changed payload rejected; retry preserved restored active child; existing plans/instances unchanged. First-family creation not tested live. No AI calls.');
} catch {
  // Do not dump provider errors, profile rows, emails or credentials.
  console.error(`FAIL at ${stage}. No destructive cleanup attempted; inspect the disposable account before retrying.`);
  process.exitCode=1;
}
