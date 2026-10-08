import assert from 'node:assert/strict';
export const contextFixture = {
  schema_version:1,max_valid_days:7,
  checks:[{id:'adult',category:'supervision',statement:'Synthetic adult-availability statement, not reviewed guidance.'},{id:'book',category:'materials',statement:'Synthetic material statement, not reviewed guidance.'}],
  not_required:{environment:'Synthetic test only',readiness:'Synthetic test only',restrictions:'Synthetic test only'},
};
export async function checkActivityContextSql(db,{owner,other,viewer,family}) {
  const one=async(sql,args=[])=>(await db.query(sql,args)).rows[0];
  const login=async id=>db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);
  await db.exec('reset role');await login(owner);
  const today=(await one('select current_date::text d')).d;
  const until=(await one("select (current_date+6)::text d")).d;
  const child=(await one("insert into public.children(family_id,nickname,birth_year,birth_month) values($1,'Synthetic context fixture',extract(year from current_date)::int-3,1) returning id",[family])).id;
  const sibling=(await one("insert into public.children(family_id,nickname,birth_year,birth_month) values($1,'Synthetic sibling fixture',extract(year from current_date)::int-3,1) returning id",[family])).id;
  await db.query('update public.family_preferences set weekday_minutes=30,weekend_minutes=30 where family_id=$1',[family]);
  const template=(await one(`insert into public.activity_templates(slug,title,domain,min_age_months,max_age_months,duration_minutes,summary,instructions,conversation_prompt,look_for,why_it_matters,safety_note,review_status,setup_minutes,context_requirements)
    values('synthetic-context-fixture','Synthetic context fixture — not for use','language',0,83,5,'fixture','fixture','fixture','fixture','fixture','fixture','expert_reviewed',1,$1) returning id`,[JSON.stringify(contextFixture)])).id;
  const claim=(await one(`insert into public.evidence_claims(claim_key,claim_text,source_title,source_url,source_organisation,evidence_type,checked_on,review_due_on,status,notes,applicability,not_supported)
    values('synthetic-context','Synthetic fact','Synthetic source','https://example.org/context','Synthetic organisation','expert_consensus',current_date-1,current_date+30,'approved','Synthetic only','Software tests only','Not advice or an approval') returning id`)).id;
  await db.query('insert into public.activity_template_claims(template_id,claim_id) values($1,$2)',[template,claim]);
  const review=async()=>db.query(`insert into public.activity_template_reviews(template_id,content_version,template_snapshot,evidence_snapshot,reviewer_name,reviewer_qualifications,reviewed_at,review_due_on,evidence_review,safety_applicability_review,language_review,rights_review)
    select id,content_version,to_jsonb(t),public.activity_evidence_snapshot_internal(id),'FICTIONAL SOFTWARE FIXTURE','Not a real reviewer',now()-interval '1 minute',current_date+30,'Synthetic','Synthetic','Synthetic','Synthetic' from public.activity_templates t where id=$1
    on conflict(template_id,content_version) do update set template_snapshot=excluded.template_snapshot,evidence_snapshot=excluded.evidence_snapshot`,[template]);
  await review();
  const reason=async(id=child,date=today)=>(await one('select public.activity_candidate_block_reason_internal($1,$2,$3) r',[id,template,date])).r;
  const version=async()=>(await one('select content_version v from public.activity_templates where id=$1',[template])).v;
  const options=async()=>db.query('select * from public.get_activity_context_options($1,$2)',[child,today]);
  const save=(revision,answers={adult:true,book:true},v=2,contract=contextFixture,start=today,end=until)=>one('select public.save_activity_context($1,$2,$3,$4,$5,$6,$7,$8) revision',[child,template,v,JSON.stringify(contract),revision,start,end,JSON.stringify(answers)]);
  assert.equal(await reason(),'MIRA_CONTEXT_REQUIRED');
  assert.equal((await options()).rows[0].confirmation,null);
  for(const bad of [null,{}, {...contextFixture,checks:[]},{...contextFixture,checks:[{...contextFixture.checks[0],id:'bad-id'}]}, {...contextFixture,not_required:{}},{...contextFixture,max_valid_days:8}])assert.equal((await one('select public.activity_context_contract_valid_internal($1) valid',[JSON.stringify(bad)])).valid,false);
  await db.exec('set role authenticated');
  assert.equal((await save(0,{adult:null,book:false})).revision,1);
  assert.equal((await save(1)).revision,2);
  await assert.rejects(save(1),/MIRA_CONTEXT_STALE/);
  for(const answers of [{adult:true},{adult:true,book:'true'},{adult:true,book:true,extra:true}])await assert.rejects(save(2,answers),/MIRA_CONTEXT_INVALID_ANSWERS/);
  await assert.rejects(save(2,undefined,1),/MIRA_CONTEXT_TEMPLATE_CHANGED/);
  const tooLong=(await one('select (current_date+7)::text d')).d;
  await assert.rejects(save(2,undefined,2,contextFixture,today,tooLong),/MIRA_CONTEXT_INVALID_DATES/);
  await db.exec('reset role');assert.equal(await reason(),null);assert.equal(await reason(sibling),'MIRA_CONTEXT_REQUIRED');
  const plan=(await one("insert into public.plans(child_id,week_start) values($1,date_trunc('week',current_date)::date) returning id",[child])).id;
  const instance=(await one(`insert into public.activity_instances(plan_id,child_id,template_id,scheduled_date,personalized_title,personalized_instructions,selection_reason,opportunity_type,estimated_parent_minutes,is_optional)
    values($1,$2,$3,current_date,'Synthetic context fixture — not for use','fixture','Synthetic only','language',1,true) returning id,content_snapshot`,[plan,child,template]));
  assert.deepEqual(instance.content_snapshot.family_context.answers,{adult:true,book:true});
  assert.equal(instance.content_snapshot.family_context.revision,2);
  await db.exec('set role authenticated');await save(2,{adult:false,book:true});
  assert.equal((await one('select public.get_activity_use_check($1) r',[instance.id])).r,'MIRA_CONTEXT_NOT_CONFIRMED');
  assert.equal((await db.query('select * from public.get_reviewed_library_context($1,$2)',[child,today])).rows.length,0);
  await assert.rejects(db.query('select public.set_activity_saved($1,$2,true)',[child,template]),/MIRA_CONTEXT_NOT_CONFIRMED/);
  const alternateDate=(await one("select (current_date+case when extract(isodow from current_date)<7 then 1 else -1 end)::text d")).d;
  await assert.rejects(db.query('select public.reschedule_planned_activity($1,$2)',[instance.id,alternateDate]),/MIRA_CONTEXT_(NOT_CONFIRMED|REQUIRED)/);
  const openPlan=(await one('select public.generate_weekly_plan($1) id',[sibling])).id;
  const openItems=(await db.query('select template_id,selection_reason from public.activity_instances where plan_id=$1',[openPlan])).rows;
  assert.equal(openItems.length,7);assert.ok(openItems.every(i=>i.template_id===null));assert.ok(openItems.some(i=>i.selection_reason.includes('family context')));
  await db.exec('reset role');assert.equal(await reason(),'MIRA_CONTEXT_NOT_CONFIRMED');
  assert.deepEqual((await one('select content_snapshot from public.activity_instances where id=$1',[instance.id])).content_snapshot,instance.content_snapshot);
  await db.exec('set role authenticated');await save(3);
  await assert.rejects(db.query('update public.activity_context_confirmations set revision=1 where child_id=$1',[child]),e=>e.code==='42501');
  await assert.rejects(db.query('delete from public.activity_context_confirmations where child_id=$1',[child]),e=>e.code==='42501');
  await login(viewer);assert.equal((await options()).rows.length,1);await assert.rejects(save(4),/Caregiver access required/);
  await login(other);await assert.rejects(options,/Family access required/);await assert.rejects(save(4),/Caregiver access required/);
  assert.equal((await db.query('select * from public.activity_context_confirmations')).rows.length,0);
  await login(owner);await db.exec('reset role');
  const changed=structuredClone(contextFixture);changed.checks[0].statement+=' Changed.';
  await db.query('update public.activity_templates set context_requirements=$1 where id=$2',[JSON.stringify(changed),template]);
  assert.equal(await version(),3);assert.equal(await reason(),'MIRA_REVIEW_MISSING_OR_STALE');
  await db.query('update public.activity_templates set context_requirements=$1 where id=$2',[JSON.stringify(contextFixture),template]);
  assert.equal(await version(),4);await review();assert.equal(await reason(),'MIRA_CONTEXT_REQUIRED');
  await db.exec('set role authenticated');await assert.rejects(save(4),/MIRA_CONTEXT_TEMPLATE_CHANGED/);await save(4,undefined,4);
  await db.exec('reset role');assert.equal(await reason(),null);
  await db.query("update public.activity_context_confirmations set valid_from=current_date-2,valid_until=current_date-1 where child_id=$1",[child]);
  assert.equal(await reason(),'MIRA_CONTEXT_REQUIRED');
  await db.query('update public.activity_templates set context_requirements=null where id=$1',[template]);await review();assert.equal(await reason(),'MIRA_CONTEXT_REQUIREMENTS_UNREVIEWED');assert.equal((await options()).rows.length,0);
  await db.exec('set role authenticated');
  await assert.rejects(db.query('select public.activity_context_block_reason_internal($1,$2,current_date)',[child,template]),e=>e.code==='42501');
  await db.exec('reset role; set role anon');await assert.rejects(options,e=>e.code==='42501');await assert.rejects(save(5),e=>e.code==='42501');
  console.log('PASS context requirements: no inferred defaults, unknown/no blocks, exact reviewed contract and version, dates/revisions, shared candidate gate, saved-answer provenance, unchanged history, roles/direct-write denial and change/restore invalidation. Synthetic local fixtures only; no clinical/content validation or concurrent-session certification.');
}
