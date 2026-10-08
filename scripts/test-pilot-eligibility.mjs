import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
if (!process.argv.includes("--live") || (!process.argv.includes("--write-test-records") && !process.argv.includes("--read-only"))) {
  console.log("Dry run. --live --write-test-records creates a new labelled child/plan only in the named disposable family. Existing plans are compared, never reused for mutation. No reviews or content approvals are created."); process.exit(0);
}
let stage="configuration";
try {
  process.loadEnvFile('.env.local');process.loadEnvFile('.env.test.local');
  const options={auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(i,o)=>fetch(i,{...o,signal:AbortSignal.timeout(12000)})}};
  const c=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);
  stage="disposable owner safeguards";
  const signed=await c.auth.signInWithPassword({email:process.env.MIRA_TEST_OWNER_EMAIL,password:process.env.MIRA_TEST_OWNER_PASSWORD});
  assert.ok(!signed.error&&signed.data.user);
  const member=await c.from('family_members').select('family_id,role').eq('user_id',signed.data.user.id).single();assert.ok(!member.error&&member.data?.role==='owner');
  const family=await c.from('families').select('display_name').eq('id',member.data.family_id).single();assert.ok(!family.error&&family.data?.display_name==='MIRA disposable pilot test 0');
  const children=await c.from('children').select('id').eq('family_id',member.data.family_id);assert.equal(children.error,null);
  const ids=children.data.map(row=>row.id);
  const readExisting=async()=>{
    if(!ids.length)return {plans:[],items:[]};
    const p=await c.from('plans').select('*').in('child_id',ids).order('id');const i=await c.from('activity_instances').select('*').in('child_id',ids).order('id');
    assert.equal(p.error,null);assert.equal(i.error,null);return{plans:p.data,items:i.data};
  };
  const before=await readExisting();
  stage="migration and editorial access check";
  const preflight=await c.rpc('get_library_candidate_ids',{p_child_id:ids[0]}).select('template_id,template_snapshot');assert.equal(preflight.error,null);
  const reviewAccess=await c.from('activity_template_reviews').select('template_id').limit(1);assert.equal(reviewAccess.error?.code,'42501');
  if(process.argv.includes('--evidence-binding')) {
    stage="versioned evidence read-only preflight";
    const context=await c.rpc('get_reviewed_library_context',{p_child_id:ids[0]}).select('template_id,template_snapshot,evidence_snapshot');assert.equal(context.error,null);
    assert.deepEqual(context.data,[]);
    const claimColumns=await c.from('evidence_claims').select('applicability,not_supported').limit(0);assert.equal(claimColumns.error,null);
    const anonEvidence=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);
    for(const name of ['activity_evidence_snapshot_internal','activity_evidence_block_reason_internal']) {
      const args=name==='activity_evidence_snapshot_internal'?{p_template_id:'00000000-0000-4000-8000-000000000000'}:{p_template_id:'00000000-0000-4000-8000-000000000000',p_on_date:'2026-10-02'};
      for(const actor of [c,anonEvidence]){const denied=await actor.rpc(name,args);assert.equal(denied.error?.code,'42501');}
    }
    const denied=await anonEvidence.rpc('get_reviewed_library_context',{p_child_id:ids[0]});assert.equal(denied.error?.code,'42501');
    assert.deepEqual(await readExisting(),before);
    console.log('PASS read-only 011: atomic reviewed-context schema, no prototype evidence, source scope columns and private/anonymous RPC denial; existing plans unchanged. Positive reviewed evidence remains local-only.');
  }
  if(process.argv.includes('--content-history')) {
    stage="content-history schema preflight";
    const columns=await c.from('activity_instances').select('id,revision,content_snapshot').limit(0);assert.equal(columns.error,null);
    const historySchema=await c.from('activity_content_versions').select('activity_instance_id,instance_revision,content_snapshot').limit(0);assert.equal(historySchema.error,null);
  }
  if(process.argv.includes('--guide-budget')) {
    stage="Guide reservation read-only preflight";
    const columns=await c.from('guide_request_reservations').select('id,attempts,outcome,reported_prompt_tokens,reported_completion_tokens').limit(0);assert.equal(columns.error,null);
    const preference=await c.from('family_ai_preferences').select('guide_enabled,policy_version').eq('family_id',member.data.family_id).maybeSingle();assert.equal(preference.error,null);
    // Never allocate real allowance or enable AI in a read-only check.
    assert.ok(!preference.data?.guide_enabled || preference.data.policy_version!=='2026-10-01-v2');
    const disabled=await c.rpc('reserve_guide_request',{p_family_id:member.data.family_id});assert.ok(disabled.error?.message.includes('MIRA_GUIDE_PERMISSION'));
    const anonBudget=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);
    const missing='00000000-0000-4000-8000-000000000000';
    const operations=[['reserve_guide_request',{p_family_id:member.data.family_id}],['begin_guide_request_attempt',{p_request_id:missing}],['finish_guide_request',{p_request_id:missing,p_outcome:'failed',p_model:null,p_prompt_tokens:null,p_completion_tokens:null,p_latency_ms:null,p_error_code:null}]];
    for(const [name,args] of operations){const denial=await anonBudget.rpc(name,args);assert.equal(denial.error?.code,'42501');}
    for(const [name,args] of operations.slice(1)){const denial=await c.rpc(name,args);assert.ok(denial.error?.message.includes('MIRA_GUIDE_PERMISSION'));}
    const anonRows=await anonBudget.from('guide_request_reservations').select('id').limit(0);assert.equal(anonRows.error?.code,'42501');
    assert.deepEqual(await readExisting(),before);
    console.log('PASS read-only 012: reservation columns, disabled Guide and anonymous/missing-request denial; no allowance allocated and existing plans unchanged. Concurrent/positive checks remain local-only.');
  }
  if(process.argv.includes('--activity-context')) {
    stage="activity context read-only preflight";
    const questions=await c.rpc('get_activity_context_options',{p_child_id:ids[0]}).select('template_id,title,content_version,contract,confirmation');assert.equal(questions.error,null);assert.deepEqual(questions.data,[]);
    const columns=await c.from('activity_context_confirmations').select('child_id,template_id,content_version,contract,answers,valid_from,valid_until,revision').limit(0);assert.equal(columns.error,null);
    const templateColumn=await c.from('activity_templates').select('context_requirements').limit(0);assert.equal(templateColumn.error,null);
    const anonContext=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);
    const blocked=await anonContext.rpc('get_activity_context_options',{p_child_id:ids[0]});assert.equal(blocked.error?.code,'42501');
    for(const actor of [c,anonContext]) {
      const helper=await actor.rpc('activity_context_contract_valid_internal',{c:null});assert.equal(helper.error?.code,'42501');
      const reason=await actor.rpc('activity_context_block_reason_internal',{p_child_id:ids[0],p_template_id:'00000000-0000-4000-8000-000000000000',p_on_date:'2026-10-02'});assert.equal(reason.error?.code,'42501');
    }
    assert.deepEqual(await readExisting(),before);
    console.log('PASS read-only activity context: schema, no invented reviewed questions, private/anonymous RPC denial and unchanged plans. Positive confirmation and selection remain synthetic local tests.');
  }
  if(process.argv.includes('--extraction-budget')) {
    stage="extraction reservation read-only preflight";
    const columns=await c.from('extraction_request_reservations').select('id,feature,attempts,outcome,reported_prompt_tokens,reported_completion_tokens').limit(0);assert.equal(columns.error,null);
    const preference=await c.from('family_ai_preferences').select('profile_enabled,journal_enabled,policy_version').eq('family_id',member.data.family_id).maybeSingle();assert.equal(preference.error,null);
    const anonExtraction=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);
    for(const feature of ['profile','journal']) {
      // Refuse to allocate allowance or change an enabled feature in this check.
      assert.ok(!preference.data?.[feature+'_enabled'] || preference.data.policy_version!=='2026-10-01-v2');
      const blocked=await c.rpc('reserve_extraction_request',{p_family_id:member.data.family_id,p_feature:feature});assert.ok(blocked.error?.message.includes('MIRA_EXTRACTION_PERMISSION'));
      const anonymous=await anonExtraction.rpc('reserve_extraction_request',{p_family_id:member.data.family_id,p_feature:feature});assert.equal(anonymous.error?.code,'42501');
    }
    const missing='00000000-0000-4000-8000-000000000000';
    for(const [name,args] of [['begin_extraction_request_attempt',{p_request_id:missing}],['finish_extraction_request',{p_request_id:missing,p_outcome:'failed',p_model:null,p_prompt_tokens:null,p_completion_tokens:null,p_latency_ms:null,p_error_code:null}]]) {
      const blocked=await c.rpc(name,args);assert.ok(blocked.error?.message.includes('MIRA_EXTRACTION_PERMISSION'));
      const anonymous=await anonExtraction.rpc(name,args);assert.equal(anonymous.error?.code,'42501');
    }
    for(const actor of [c,anonExtraction]){const helper=await actor.rpc('extraction_permission_internal',{p_family_id:member.data.family_id,p_feature:'profile'});assert.equal(helper.error?.code,'42501');}
    const denied=await anonExtraction.from('extraction_request_reservations').select('id').limit(0);assert.equal(denied.error?.code,'42501');
    assert.deepEqual(await readExisting(),before);
    console.log('PASS read-only extraction budget: schema, disabled profile/journal and missing/anonymous/private-helper denial. No requests allocated, AI enabled or plans changed. Positive limits/roles remain local fixtures.');
  }
  if(process.argv.includes('--profile-identities')) {
    stage='profile identity read-only preflight';
    const columns=await c.from('caregiver_languages').select('id,proficiency,proficiency_reported').limit(0);assert.equal(columns.error,null);
    const anonymous=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);
    const missing='00000000-0000-4000-8000-000000000000';
    // Missing identities cannot reach any write even if grants regress.
    const args={p_family_id:missing,p_child_id:missing,p_screen_policy:'minimal_child_screen',p_structure_level:'light',p_weekday_minutes:0,p_weekend_minutes:0,p_prefer_embedded:true,p_caregiver_name:null,p_relationship:null,p_caregiver_languages:[],p_aspirations:['Synthetic missing-target probe'],p_language_goals:[]};
    const denied=await anonymous.rpc('configure_learning_profile',args);assert.equal(denied.error?.code,'42501');
    const legacy=await c.rpc('configure_learning_profile',args);assert.equal(legacy.error?.code,'42501');
    const checkedArgs={...args,p_expected_version:'0'.repeat(64)};
    const anonymousChecked=await anonymous.rpc('configure_learning_profile_checked',checkedArgs);assert.equal(anonymousChecked.error?.code,'42501');
    const missingTarget=await c.rpc('configure_learning_profile_checked',checkedArgs);assert.ok(missingTarget.error?.message.includes('Caregiver access required'));
    assert.deepEqual(await readExisting(),before);
    console.log('PASS read-only profile foundation: unknown-proficiency metadata present, anonymous execution and missing-family save denied, existing plans unchanged. No profiles saved; positive identity preservation remains local SQL evidence.');
  }
  if(process.argv.includes('--language-list-compatibility')) {
    stage='009 read-only validation order';
    // Both calls fail BEFORE any DML: the count bound or the oversized name.
    // This verifies the live 40-entry validation path without saving a profile.
    const args={p_family_id:member.data.family_id,p_child_id:ids[0],p_screen_policy:'minimal_child_screen',p_structure_level:'light',p_weekday_minutes:0,p_weekend_minutes:0,p_prefer_embedded:true,p_caregiver_name:'x'.repeat(61),p_relationship:null,p_caregiver_languages:[],p_aspirations:['Synthetic validation probe'],p_language_goals:Array.from({length:40},(_,i)=>'synthetic '+i)};
    const snapshot=await c.rpc('get_learning_profile_snapshot',{p_child_id:ids[0]});assert.equal(snapshot.error,null);assert.match(snapshot.data.version,/^[a-f0-9]{64}$/);
    const checkedArgs={...args,p_expected_version:snapshot.data.version};
    const acceptedCount=await c.rpc('configure_learning_profile_checked',checkedArgs);assert.equal(acceptedCount.error?.message,'Caregiver name is too long');
    const overflow=await c.rpc('configure_learning_profile_checked',{...checkedArgs,p_language_goals:[...args.p_language_goals,'extra']});assert.equal(overflow.error?.message,'Use no more than forty child languages');
    const after=await c.rpc('get_learning_profile_snapshot',{p_child_id:ids[0]});assert.equal(after.error,null);assert.deepEqual(after.data,snapshot.data);
    assert.deepEqual(await readExisting(),before);
    console.log('PASS read-only 009: 40 child entries reach the pre-write invalid-name guard, 41 hit the count guard. Neither request can write. Existing plans unchanged; positive 40-entry profile save remains local SQL evidence.');
  }
    if(process.argv.includes('--language-environments')) {
      stage='language environment read-only preflight';
      const columns=await c.from('child_language_goals').select('id,environment,environment_revision,environment_updated_at').limit(0);assert.equal(columns.error,null);
      const anonymous=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);
      const missing='00000000-0000-4000-8000-000000000000';
      const args={p_child_id:missing,p_goal_id:missing,p_expected_revision:0,p_environment:null};
      const denied=await anonymous.rpc('save_language_environment',args);assert.equal(denied.error?.code,'42501');
      const missingTarget=await c.rpc('save_language_environment',args);assert.equal(missingTarget.error?.message,'MIRA_LANGUAGE_ACCESS');
      for(const actor of [c,anonymous]) {
        const privateRead=await actor.from('language_environment_caregivers').select('goal_id').limit(0);assert.equal(privateRead.error?.code,'42501');
        const helper=await actor.rpc('valid_language_environment_internal',{p_value:null});assert.equal(helper.error?.code,'42501');
      }
      assert.deepEqual(await readExisting(),before);
      console.log('PASS read-only language environment: schema, missing-target/anonymous save denial, private references/helper denial and unchanged plans. No language context saved; positive save/retry/clear remains local SQL evidence.');
    }
    if(process.argv.includes('--publication')) {
    stage='editorial publication read-only preflight';
    const columns=await c.from('activity_templates').select('publication_context').limit(0);assert.equal(columns.error,null);
    const anonPublication=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);
    const missing='00000000-0000-4000-8000-000000000000';
    // Even an unexpectedly enrolled account cannot publish this invalid package
    // or retire an existing item. No content or editorial permission is written.
    for(const [name,args] of [['publish_activity_release',{p_release_id:missing,p_package:{},p_decision:{}}],['retire_activity_release',{p_template_id:missing,p_reason:'Read-only permission probe; missing target'}]]) {
      const blocked=await c.rpc(name,args);assert.equal(blocked.error?.code,'P0001');assert.equal(blocked.error?.message,'MIRA_EDITOR_REQUIRED');
      const anonymous=await anonPublication.rpc(name,args);assert.equal(anonymous.error?.code,'42501');
    }
    for(const actor of [c,anonPublication])for(const table of ['content_publishers','activity_publications']){const privateRead=await actor.from(table).select('*').limit(0);assert.equal(privateRead.error?.code,'42501');}
    assert.deepEqual(await readExisting(),before);
    console.log('PASS read-only publication: schema present; disposable family owner/anonymous cannot publish, retire or read editorial permissions/packages; existing plans unchanged. No editor enrollment or content publication performed.');
  }
  if(process.argv.includes('--read-only')) { console.log('PASS read-only: candidate RPC exposes both checked ID and template snapshot columns; family owner cannot read editorial review records. No data changed.'); } else {
  stage="new labelled fixture child";
  const now=new Date();
  const child=await c.from('children').insert({family_id:member.data.family_id,nickname:'Synthetic eligibility fixture',birth_year:now.getUTCFullYear()-3,birth_month:now.getUTCMonth()+1}).select('id').single();assert.equal(child.error,null);
  const childId=child.data.id;
  stage="no review records means no candidates";
  const candidates=await c.rpc('get_library_candidate_ids',{p_child_id:childId});assert.equal(candidates.error,null);assert.deepEqual(candidates.data,[]);
  stage="new open plan through public wrapper";
  const generated=await c.rpc('generate_weekly_plan',{p_child_id:childId});assert.ok(!generated.error&&generated.data);
  const readNew=async()=>{const r=await c.from('activity_instances').select('*').eq('plan_id',generated.data).order('scheduled_date');assert.equal(r.error,null);return r.data;};
  const rows=await readNew();assert.equal(rows.length,7);assert.ok(rows.every(row=>row.template_id===null&&row.opportunity_type==='open'));
  const retry=await c.rpc('generate_weekly_plan',{p_child_id:childId});assert.equal(retry.error,null);assert.equal(retry.data,generated.data);assert.deepEqual(await readNew(),rows);
  if(process.argv.includes('--plan-integrity')) {
    stage="new summary and protected week boundary";
    const plan=await c.from('plans').select('*').eq('id',generated.data).single();assert.equal(plan.error,null);
    assert.match(plan.data.adaptation_summary,/No reviewed activity/);
    const outside=new Date(rows[6].scheduled_date+'T12:00:00Z');outside.setUTCDate(outside.getUTCDate()+1);
    const outsideDate=outside.toISOString().slice(0,10);
    const invalidMove=await c.from('activity_instances').update({scheduled_date:outsideDate}).eq('id',rows[0].id);
    assert.ok(invalidMove.error?.message.includes('MIRA_ACTIVITY_OUTSIDE_WEEK'));
    const invalidInsert=await c.from('activity_instances').insert({plan_id:generated.data,child_id:childId,scheduled_date:outsideDate,personalized_title:'Synthetic boundary fixture',personalized_instructions:'Synthetic test only',opportunity_type:'open'});
    assert.ok(invalidInsert.error?.message.includes('MIRA_ACTIVITY_OUTSIDE_WEEK'));
    const changedAnchor=await c.from('plans').update({week_start:outsideDate}).eq('id',generated.data);
    assert.ok(changedAnchor.error?.message.includes('MIRA_PLAN_IDENTITY_IMMUTABLE'));
    assert.deepEqual(await readNew(),rows);
    const planAfter=await c.from('plans').select('*').eq('id',generated.data).single();assert.equal(planAfter.error,null);assert.deepEqual(planAfter.data,plan.data);
    const summaryHelper=await c.rpc('record_new_plan_selection_internal',{p_plan_id:generated.data});assert.equal(summaryHelper.error?.code,'42501');
    console.log('PASS live 007: truthful new summary, direct out-of-week insert/update and plan-anchor changes rejected atomically, private summary helper denied.');
  }
  stage="direct prototype attachment denied atomically";
  const prototype=await c.from('activity_templates').select('id').eq('review_status','internal_prototype').limit(1).single();assert.equal(prototype.error,null);
  const attached=await c.from('activity_instances').update({template_id:prototype.data.id}).eq('id',rows[0].id);
  assert.ok(attached.error?.message.includes(Object.hasOwn(rows[0],'content_snapshot')?'MIRA_ACTIVITY_NOT_REPLACEABLE':'MIRA_TEMPLATE_NOT_REVIEWED'));assert.deepEqual(await readNew(),rows);
  stage="prototype bookmark denied";
  const bookmark=await c.rpc('set_activity_saved',{p_child_id:childId,p_template_id:prototype.data.id,p_saved:true});assert.ok(bookmark.error?.message.includes('MIRA_TEMPLATE_NOT_REVIEWED'));
  if(process.argv.includes('--checked-replacement')) {
    stage="checked replacement schema and legacy denial";
    assert.equal(rows[0].revision,1);
    const legacy=await c.rpc('replace_planned_activity',{p_instance_id:rows[0].id,p_template_id:prototype.data.id});assert.equal(legacy.error?.code,'42501');
    const args={p_instance_id:rows[0].id,p_template_id:prototype.data.id,p_expected_revision:1,p_expected_template:{id:prototype.data.id}};
    const protectedOpen=await c.rpc('replace_planned_activity_checked',args);assert.ok(protectedOpen.error?.message.includes('MIRA_ACTIVITY_NOT_REPLACEABLE'));
    const moved=await c.rpc('reschedule_planned_activity',{p_instance_id:rows[0].id,p_target_date:rows[1].scheduled_date});assert.equal(moved.error,null);
    const movedRows=await readNew();assert.ok(movedRows.find(row=>row.id===rows[0].id).revision>1);
    const stale=await c.rpc('replace_planned_activity_checked',args);assert.ok(stale.error?.message.includes('MIRA_STALE_ACTIVITY'));
    assert.deepEqual(await readNew(),movedRows);
    const restored=await c.rpc('reschedule_planned_activity',{p_instance_id:rows[0].id,p_target_date:rows[0].scheduled_date});assert.equal(restored.error,null);
    const restoredRows=await readNew();
    const withoutRevision=row=>Object.fromEntries(Object.entries(row).filter(([key])=>key!=='revision'));
    assert.deepEqual(restoredRows.map(withoutRevision),rows.map(withoutRevision));
    const aba=await c.rpc('replace_planned_activity_checked',args);assert.ok(aba.error?.message.includes('MIRA_STALE_ACTIVITY'));
    const spoofed=await c.from('activity_instances').update({revision:1}).eq('id',rows[0].id);assert.equal(spoofed.error,null);
    assert.deepEqual(await readNew(),restoredRows);
    console.log('PASS live 008: checked RPC available, old unchecked replacement denied, open slot protected, revision advances through move/reversal, stale and ABA replacement rejected atomically, revision cannot be reset. Only new synthetic plan used; no live approved-template replacement attempted.');
  }
  stage="internal and anonymous execution denied";
  const internal=await c.rpc('activity_candidate_block_reason_internal',{p_child_id:childId,p_template_id:prototype.data.id,p_on_date:now.toISOString().slice(0,10)});assert.equal(internal.error?.code,'42501');
  const anon=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);
  const denied=await anon.rpc('get_library_candidate_ids',{p_child_id:childId});assert.equal(denied.error?.code,'42501');
  if(process.argv.includes('--content-history')) {
    stage="history and snapshot writes denied";
    const readHistory=await c.from('activity_content_versions').select('*').eq('child_id',childId);assert.equal(readHistory.error,null);assert.deepEqual(readHistory.data,[]);
    const fakeHistory=await c.from('activity_content_versions').insert({activity_instance_id:rows[0].id});assert.equal(fakeHistory.error?.code,'42501');
    const fakeSnapshot=await c.from('activity_instances').update({content_snapshot:{schema_version:1}}).eq('id',rows[0].id);assert.ok(fakeSnapshot.error?.message.includes('MIRA_ACTIVITY_CONTENT_IMMUTABLE'));
    const openUse=await c.rpc('get_activity_use_check',{p_instance_id:rows[0].id});assert.equal(openUse.error,null);assert.equal(openUse.data,'MIRA_OPEN_DAY');
    const legacy=before.items.find(row=>row.template_id!==null&&row.content_snapshot===null);
    if(legacy){const oldUse=await c.rpc('get_activity_use_check',{p_instance_id:legacy.id});assert.equal(oldUse.error,null);assert.equal(oldUse.data,'MIRA_LEGACY_CONTENT_VERSION_UNKNOWN');}
    const anonHistory=await anon.from('activity_content_versions').select('*').limit(1);assert.equal(anonHistory.error?.code,'42501');
    const anonUse=await anon.rpc('get_activity_use_check',{p_instance_id:rows[0].id});assert.equal(anonUse.error?.code,'42501');
    assert.ok((await readNew()).every(row=>row.content_snapshot===null));
    console.log('PASS live 009: snapshot/history schema, open-day use check, attempted snapshot/history forgery denied, no invented open-day history and anonymous denial. Exact-version positive history remains local-only.');
  }
  stage="existing fixture plans unchanged";assert.deepEqual(await readExisting(),before);
  console.log('PASS live owner: review table/private helper/anonymous denial, no prototype candidates, new seven-day open plan, idempotent retry, raw attachment and bookmark rejection, unchanged existing fixture plans. New synthetic child/plan retained. Positive reviewed eligibility remains local-only; no content was approved or AI called.');
  }
} catch { console.error('Eligibility check stopped at '+stage+'. Any newly created synthetic fixtures are retained. No private values logged.');process.exitCode=1; }
