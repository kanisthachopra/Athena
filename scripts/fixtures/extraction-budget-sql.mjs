// Fictional in-memory accounts/requests only. No provider calls or real writes.
import assert from 'node:assert/strict';
export async function checkExtractionBudgetSql(db,{owner,other,viewer,family}) {
  const one=async(sql,args=[])=>(await db.query(sql,args)).rows[0];
  const login=id=>db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);
  const reserve=async(feature='profile',fid=family)=>(await one('select public.reserve_extraction_request($1,$2) id',[fid,feature])).id;
  const attempt=id=>one('select public.begin_extraction_request_attempt($1) n',[id]);
  const finish=(id,outcome='failed',prompt=null,completion=null)=>one('select public.finish_extraction_request($1,$2,$3,$4,$5,1,null) ok',[id,outcome,outcome==='succeeded'?'synthetic':null,prompt,completion]);
  const prefs=async(profile,journal)=>{const revision=(await one('select revision from public.family_ai_preferences where family_id=$1',[family])).revision;await db.query("select public.set_family_ai_preferences($1,$2,false,$3,$4,'2026-10-01-v2')",[family,revision,profile,journal]);};
  await db.exec('reset role; set role authenticated');await login(owner);await prefs(false,false);
  await assert.rejects(reserve,/MIRA_EXTRACTION_PERMISSION/);await assert.rejects(()=>reserve('journal'),/MIRA_EXTRACTION_PERMISSION/);
  await prefs(true,false);await assert.rejects(()=>reserve('journal'),/MIRA_EXTRACTION_PERMISSION/);
  await assert.rejects(()=>reserve('guide'),/MIRA_EXTRACTION_PERMISSION/);await assert.rejects(()=>reserve(null),/MIRA_EXTRACTION_PERMISSION/);
  const first=await reserve();await assert.rejects(()=>finish(first,'succeeded'),/MIRA_EXTRACTION_INVALID_METADATA/);
  assert.equal((await attempt(first)).n,1);assert.equal((await attempt(first)).n,2);await assert.rejects(()=>attempt(first),/MIRA_EXTRACTION_REQUEST_CLOSED/);
  await assert.rejects(()=>finish(first,'succeeded',1,null),/MIRA_EXTRACTION_INVALID_METADATA/);
  await assert.rejects(()=>finish(first,'failed',-1,0),/MIRA_EXTRACTION_INVALID_METADATA/);
  assert.equal((await finish(first,'succeeded',5,3)).ok,true);assert.equal((await finish(first)).ok,false);
  await assert.rejects(()=>attempt(first),/MIRA_EXTRACTION_REQUEST_CLOSED/);
  const row=await one('select * from public.extraction_request_reservations where id=$1',[first]);assert.equal(row.reported_prompt_tokens,5);assert.equal(row.attempts,2);
  for(const sql of ["insert into public.extraction_request_reservations(user_id,family_id,feature) values($1,$2,'journal')",'update public.extraction_request_reservations set attempts=0 where user_id=$1 and family_id=$2','delete from public.extraction_request_reservations where user_id=$1 and family_id=$2'])await assert.rejects(db.query(sql,[owner,family]),e=>e.code==='42501');
  await assert.rejects(db.query('select public.extraction_permission_internal($1,$2)',[family,'profile']),e=>e.code==='42501');
  for(const actor of [other,viewer]){await login(actor);await assert.rejects(reserve,/MIRA_EXTRACTION_PERMISSION/);await assert.rejects(()=>attempt(first),/MIRA_EXTRACTION_PERMISSION/);await assert.rejects(()=>finish(first),/MIRA_EXTRACTION_PERMISSION/);assert.equal((await db.query('select id from public.extraction_request_reservations')).rows.length,0);}
  await login(owner);const withdrawn=await reserve();await prefs(false,false);await assert.rejects(()=>attempt(withdrawn),/MIRA_EXTRACTION_PERMISSION/);assert.equal((await finish(withdrawn)).ok,true);
  await prefs(true,true);const unknown=await reserve('journal');await attempt(unknown);await finish(unknown,'succeeded');assert.equal((await one('select reported_prompt_tokens n from public.extraction_request_reservations where id=$1',[unknown])).n,null);
  const expired=await reserve();await db.exec('reset role');await db.query("update public.extraction_request_reservations set created_at=clock_timestamp()-interval '6 minutes' where id=$1",[expired]);await db.exec('set role authenticated');await assert.rejects(()=>attempt(expired),/MIRA_EXTRACTION_REQUEST_CLOSED/);
  // Role and policy changes after reservation must prevent dispatch as well.
  const roleChanged=await reserve();await db.exec('reset role');await db.query("update public.family_members set role='viewer' where user_id=$1 and family_id=$2",[owner,family]);await db.exec('set role authenticated');await assert.rejects(()=>attempt(roleChanged),/MIRA_EXTRACTION_PERMISSION/);
  await db.exec('reset role');await db.query("update public.family_members set role='owner' where user_id=$1 and family_id=$2",[owner,family]);await db.query("update public.family_ai_preferences set policy_version='old' where family_id=$1",[family]);await db.exec('set role authenticated');await assert.rejects(()=>attempt(roleChanged),/MIRA_EXTRACTION_PERMISSION/);await prefs(true,true);
  for(let n=4;n<10;n++)await reserve();await assert.rejects(reserve,/MIRA_EXTRACTION_ALLOWANCE_REACHED/);
  await finish(expired);await assert.rejects(reserve,/MIRA_EXTRACTION_ALLOWANCE_REACHED/);
  // Another feature's reserved slots never consume or replenish profile slots.
  for(let n=1;n<30;n++)await reserve('journal');await assert.rejects(()=>reserve('journal'),/MIRA_EXTRACTION_ALLOWANCE_REACHED/);
  await db.exec('reset role');await db.query("update public.extraction_request_reservations set created_at=clock_timestamp()-interval '25 hours' where id=$1",[first]);await db.exec('set role authenticated');await reserve();await assert.rejects(reserve,/MIRA_EXTRACTION_ALLOWANCE_REACHED/);
  await db.exec('reset role');await db.query("update public.extraction_request_reservations set created_at=clock_timestamp()-interval '25 hours' where id=$1",[expired]);await db.query("insert into public.ai_runs(user_id,family_id,feature,model,status,input_hash) values($1,$2,'onboarding_extraction','synthetic','failed','synthetic')",[owner,family]);await db.exec('set role authenticated');await assert.rejects(reserve,/MIRA_EXTRACTION_ALLOWANCE_REACHED/);
  // Retain the existing observed-usage stop after request-count slots expire.
  await db.exec('reset role');await db.query("update public.extraction_request_reservations set created_at=clock_timestamp()-interval '25 hours' where user_id=$1 and feature='journal'",[owner]);
  await db.query("insert into public.ai_runs(user_id,family_id,feature,model,status,input_hash,prompt_tokens) values($1,$2,'observation_extraction','synthetic','succeeded','synthetic',60000)",[owner,family]);await db.exec('set role authenticated');await assert.rejects(()=>reserve('journal'),/MIRA_EXTRACTION_REPORTED_TOKEN_LIMIT/);
  await db.exec('reset role');await db.query("update public.ai_runs set created_at=clock_timestamp()-interval '25 hours' where user_id=$1 and feature='observation_extraction'",[owner]);await db.exec('set role authenticated');const measured=await reserve('journal');await attempt(measured);await finish(measured,'succeeded',60000,1);await assert.rejects(()=>reserve('journal'),/MIRA_EXTRACTION_REPORTED_TOKEN_LIMIT/);
  // Empty synthetic family deletion cannot reset its user's allowance.
  await db.exec('reset role');const temporary=(await one("insert into public.families(display_name) values('Synthetic extraction retention fixture') returning id")).id;
  await db.query("insert into public.family_members(family_id,user_id,role) values($1,$2,'owner')",[temporary,other]);await login(other);await db.exec('set role authenticated');await db.query("select public.set_family_ai_preferences($1,0,false,true,true,'2026-10-01-v2')",[temporary]);const retained=await reserve('profile',temporary);
  await db.exec('reset role');await db.query('delete from public.families where id=$1',[temporary]);assert.equal((await one('select family_id from public.extraction_request_reservations where id=$1',[retained])).family_id,null);await db.exec('set role authenticated');await assert.rejects(()=>attempt(retained),/MIRA_EXTRACTION_PERMISSION/);assert.equal((await finish(retained)).ok,true);
  await db.exec('reset role; set role anon');for(const op of [reserve,()=>attempt(first),()=>finish(first),()=>db.query('select * from public.extraction_request_reservations'),()=>db.query('select public.extraction_permission_internal($1,$2)',[family,'profile'])])await assert.rejects(op,e=>e.code==='42501');
  console.log('PASS extraction SQL: feature-specific 10/30 rolling limits, legacy counts/reported-token stop, current editor role/policy, bounded retries, expiry/withdrawal, retained failed/unknown usage, direct/anonymous/other/viewer denial and family-deletion retention. Single-session fixtures, not hosted concurrency proof.');
}
