// Only creates a new labelled child/plans in the designated disposable family.
// Never switches the active child, changes a prior plan or imports content.
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
if (!process.argv.includes('--live') || !process.argv.includes('--write-test-records')) {
  console.log('Dry run. --live --write-test-records verifies v4 open fallback and concurrent generation on a NEW synthetic child. Existing family records are compared, not edited. Fixtures retained.');
  process.exit(0);
}
let stage='configuration';
try {
  process.loadEnvFile('.env.local');process.loadEnvFile('.env.test.local');
  const c=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{
    auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(i,o)=>fetch(i,{...o,signal:AbortSignal.timeout(12000)})},
  });
  stage='disposable owner safeguards';
  const signed=await c.auth.signInWithPassword({email:process.env.MIRA_TEST_OWNER_EMAIL,password:process.env.MIRA_TEST_OWNER_PASSWORD});assert.ok(!signed.error&&signed.data.user);
  const member=await c.from('family_members').select('family_id,role').eq('user_id',signed.data.user.id).single();assert.ok(!member.error&&member.data?.role==='owner');
  const family=await c.from('families').select('display_name').eq('id',member.data.family_id).single();assert.ok(!family.error&&family.data?.display_name==='MIRA disposable pilot test 0');
  const kids=await c.from('children').select('id,nickname').eq('family_id',member.data.family_id);assert.equal(kids.error,null);
  assert.ok(!kids.data.some(k=>k.nickname==='Synthetic portfolio v4'));const ids=kids.data.map(k=>k.id);
  const snapshot=async()=>{
    const result={};
    for(const table of ['plans','activity_instances','child_language_goals']){
      const read=ids.length?await c.from(table).select('*').in('child_id',ids).order('id'):{data:[],error:null};assert.equal(read.error,null);result[table]=read.data;
    }
    for(const table of ['family_preferences','caregivers']){const read=await c.from(table).select('*').eq('family_id',member.data.family_id);assert.equal(read.error,null);result[table]=read.data;}
    const settings=await c.from('user_settings').select('*').eq('user_id',signed.data.user.id);assert.equal(settings.error,null);result.settings=settings.data;
    return result;
  };
  const before=await snapshot();
  stage='new synthetic child';
  const created=await c.from('children').insert({family_id:member.data.family_id,nickname:'Synthetic portfolio v4',birth_year:2024,birth_month:1}).select('id').single();assert.equal(created.error,null);const child=created.data.id;
  for(const rpc of ['generate_weekly_plan','generate_next_week_plan']) {
    stage=rpc+' concurrent creation';
    const results=await Promise.all([c.rpc(rpc,{p_child_id:child}),c.rpc(rpc,{p_child_id:child})]);
    for(const r of results)assert.equal(r.error,null);assert.equal(results[0].data,results[1].data);
    const planId=results[0].data;
    const read=async()=>{
      const plan=await c.from('plans').select('*').eq('id',planId).single();assert.equal(plan.error,null);
      const items=await c.from('activity_instances').select('*').eq('plan_id',planId).order('scheduled_date');assert.equal(items.error,null);
      return {plan:plan.data,items:items.data};
    };
    const saved=await read();assert.equal(saved.plan.child_id,child);assert.equal(saved.plan.generation_method,'reviewed_portfolio_v4');
    assert.equal(saved.items.length,7);assert.ok(saved.items.every(i=>i.child_id===child&&i.template_id===null&&i.opportunity_type==='open'&&i.is_optional));
    assert.equal(saved.items.filter(i=>i.selection_reason==='Time deliberately left open, not an activity to complete.').length,2);
    assert.match(saved.plan.adaptation_summary,/No reviewed activity/);
    stage=rpc+' exact retry';
    const retry=await c.rpc(rpc,{p_child_id:child});assert.equal(retry.error,null);assert.equal(retry.data,planId);assert.deepEqual(await read(),saved);
  }
  stage='existing records unchanged';assert.deepEqual(await snapshot(),before);
  console.log('PASS hosted v4: current/next-week wrappers, simultaneous same-child creation returns one plan, seven open rows with two protected days, faithful no-candidate summary, exact retry and unchanged existing plans/preferences/goals/caregivers/selected child. One new synthetic child and two plans retained. Positive reviewed selection remains a local fictional test, not live content approval.');
} catch {
  console.error('Portfolio check stopped at '+stage+'. New synthetic fixtures, if any, are retained. No private values logged.');process.exitCode=1;
}
