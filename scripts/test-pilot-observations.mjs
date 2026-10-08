import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
if (!process.argv.includes("--live") || !process.argv.includes("--write-test-records")) {
  console.log("Dry run. --live --write-test-records creates a new future observation fixture in the named disposable family. Existing plans untouched; fixtures retained."); process.exit(0);
}
let stage = "configuration";
try {
  process.loadEnvFile(".env.local"); process.loadEnvFile(".env.test.local");
  const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (i, o) => fetch(i, { ...o, signal: AbortSignal.timeout(12000) }) },
  });
  stage = "disposable owner safeguards";
  const auth = await c.auth.signInWithPassword({ email: process.env.MIRA_TEST_OWNER_EMAIL, password: process.env.MIRA_TEST_OWNER_PASSWORD });
  assert.ok(!auth.error && auth.data.user);
  const member = await c.from("family_members").select("family_id,role").eq("user_id", auth.data.user.id).single();
  assert.ok(!member.error && member.data?.role === "owner");
  const familyId = member.data.family_id;
  const family = await c.from("families").select("display_name").eq("id", familyId).single();
  assert.ok(!family.error && family.data?.display_name === "MIRA disposable pilot test 0");

  const child = await c.from("children").select("id").eq("family_id",familyId).eq("nickname","Synthetic test child").is("archived_at",null).single();
  assert.equal(child.error,null);
  stage="new future fixture";
  const date=new Date(); date.setUTCHours(12,0,0,0); date.setUTCDate(date.getUTCDate()-((date.getUTCDay()+6)%7)+350);
  let week;
  for(let i=0;i<20;i++){
    const candidate=date.toISOString().slice(0,10);
    const found=await c.from("plans").select("id").eq("child_id",child.data.id).eq("week_start",candidate);
    assert.equal(found.error,null);
    if(!found.data.length){week=candidate;break;}
    date.setUTCDate(date.getUTCDate()+7);
  }
  assert.ok(week);
  const plan=await c.from("plans").insert({child_id:child.data.id,week_start:week,generation_method:"synthetic_observation_test"}).select("id").single();
  assert.equal(plan.error,null);
  const item=await c.from("activity_instances").insert({child_id:child.data.id,plan_id:plan.data.id,scheduled_date:week,template_id:null,opportunity_type:"open",personalized_title:"Synthetic observation fixture",personalized_instructions:"Test fixture only. Not a recommendation."}).select("id").single();
  assert.equal(item.error,null);
  const note="  Synthetic note: 再一次.\n Then مرحبا.  ";
  const args={p_instance_id:item.data.id,p_expected_revision:0,p_expected_template_id:null,p_engagement:null,p_challenge_level:null,p_repeated:null,p_parent_note:note};
  const read=async()=>{const r=await c.from("observations").select("revision,engagement,challenge_level,repeated,parent_note").eq("activity_instance_id",item.data.id).single();assert.equal(r.error,null);return r.data;};
  stage="note-only save";
  const saved=await c.rpc("record_activity_observation_checked",args);
  assert.equal(saved.error,null);assert.equal(saved.data,1);
  const row=await read();assert.equal(row.engagement,null);assert.equal(row.challenge_level,null);assert.equal(row.repeated,null);assert.equal(row.parent_note,note);
  stage="stale save rejection";
  const stale=await c.rpc("record_activity_observation_checked",{...args,p_parent_note:"stale replacement"});
  assert.ok(stale.error?.message.includes("MIRA_STALE_OBSERVATION"));
  assert.equal((await read()).parent_note,note);
  stage="explicit no and concurrent revision checks";
  const racing=await Promise.all([c.rpc("record_activity_observation_checked",{...args,p_expected_revision:1,p_repeated:false}),c.rpc("record_activity_observation_checked",{...args,p_expected_revision:1,p_repeated:false})]);
  assert.equal(racing.filter(r=>!r.error).length,1);
  assert.equal(racing.filter(r=>r.error?.message.includes("MIRA_STALE_OBSERVATION")).length,1);
  assert.equal((await read()).repeated,false);
  stage="invalid/empty/stale template rejection";
  for(const patch of [{p_engagement:"invented"},{p_parent_note:" "},{p_parent_note:"x".repeat(1001)}]){
    const rejected=await c.rpc("record_activity_observation_checked",{...args,p_expected_revision:2,...patch});
    assert.ok(rejected.error?.message.match(/Invalid observation|Add a note/));
  }
  const replaced=await c.rpc("record_activity_observation_checked",{...args,p_expected_revision:2,p_expected_template_id:"11111111-1111-4111-8111-111111111111"});
  assert.ok(replaced.error?.message.includes("MIRA_ACTIVITY_CHANGED"));
  stage="legacy bypass denied";
  const legacy=await c.rpc("record_activity_feedback",{p_instance_id:item.data.id,p_engagement:"high",p_challenge_level:"easy",p_repeated:true,p_parent_note:"legacy"});
  assert.equal(legacy.error?.code,"42501");
  stage="anonymous access denied";
  const anon=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(i,o)=>fetch(i,{...o,signal:AbortSignal.timeout(12000)})}});
  const blocked=await anon.rpc("record_activity_observation_checked",args);
  assert.equal(blocked.error?.code,"42501");
  const final=await read();assert.equal(final.revision,2);assert.equal(final.parent_note,note);
  console.log("PASS: note-only/null answers, exact multilingual text, explicit no, stale/concurrent saves, invalid input, changed template, legacy and anonymous denial. Only new synthetic fixtures changed and retained; cross-family/viewer remain separate.");
} catch { console.error("Observation checks stopped at "+stage+". Fixtures retained; no private values logged.");process.exitCode=1; }

