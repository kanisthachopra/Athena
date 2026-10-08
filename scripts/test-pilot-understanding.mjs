// Read-only probes, scoped to the authorized synthetic family. Never log payloads.
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {assertPermissionDenied} from './pilot-test-assertions.mjs';
if(!process.argv.includes('--live')) { console.log('Dry run. --live reads the disposable owner overview, compares existing snapshots, and probes anonymous/missing-child denial. No application records are written.'); process.exit(0); }
let stage='configuration';
try {
  process.loadEnvFile('.env.local');process.loadEnvFile('.env.test.local');
  const options={auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(12000)})}};
  const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);
  const anonymous=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);
  stage='disposable owner safeguards';
  const auth=await client.auth.signInWithPassword({email:process.env.MIRA_TEST_OWNER_EMAIL,password:process.env.MIRA_TEST_OWNER_PASSWORD});assert.ok(!auth.error&&auth.data.user);
  const member=await client.from('family_members').select('family_id,role').eq('user_id',auth.data.user.id).single();assert.ok(!member.error&&member.data?.role==='owner');
  const family=await client.from('families').select('display_name').eq('id',member.data.family_id).single();assert.ok(!family.error&&family.data?.display_name==='MIRA disposable pilot test 0');
  const children=await client.from('children').select('id').eq('family_id',member.data.family_id).eq('nickname','Synthetic portfolio v4').is('archived_at',null);assert.ok(!children.error&&children.data?.length===1);
  const child=children.data[0].id;
  stage='authorized overview and existing snapshot comparison';
  const overview=await client.rpc('get_family_understanding',{p_child_id:child});assert.equal(overview.error,null);
  assert.equal(overview.data.childId,child);assert.equal(overview.data.familyId,member.data.family_id);assert.equal(overview.data.schemaVersion,1);
  for(const [key,name] of [['profile','get_learning_profile_snapshot'],['directions','get_aspiration_directions']]) {
    const result=await client.rpc(name,{p_child_id:child});assert.equal(result.error,null);assert.deepEqual(result.data,overview.data[key]);
  }
  assert.ok(overview.data.languages.every(row=>row.childId===child));
  assert.ok(!Object.hasOwn(overview.data,'observations')&&!Object.hasOwn(overview.data,'inferences'));
  stage='anonymous execute denial';assertPermissionDenied(await anonymous.rpc('get_family_understanding',{p_child_id:child}));
  stage='missing-child denial';assertPermissionDenied(await client.rpc('get_family_understanding',{p_child_id:'00000000-0000-4000-8000-000000000000'}),'MIRA_UNDERSTANDING_ACCESS');
  console.log('PASS hosted read-only overview: disposable-owner binding, exact existing profile/direction snapshots, scoped language rows, anonymous execute denial and missing-child denial. No family data, plans or AI changed. Unrelated-family/viewer cases remain local SQL evidence.');
} catch {console.error(`Overview probe stopped at ${stage}; no private values logged. Network/schema errors are not passes.`);process.exitCode=1;}
