import assert from 'node:assert/strict';
import { contextFixture } from './activity-context-sql.mjs';

// All content, review identities and answers are fictional, in-memory only.
export async function checkPortfolioSelectionSql(db, { owner, other, viewer, family }) {
  const one=async(sql,args=[])=>(await db.query(sql,args)).rows[0];
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);
  await db.query('update public.family_preferences set weekday_minutes=30,weekend_minutes=30 where family_id=$1',[family]);
  const start=(await one("select (date_trunc('week',current_date)::date+7)::text d")).d;
  const child=(await one("insert into public.children(family_id,nickname,birth_year,birth_month) values($1,'Synthetic portfolio only',extract(year from current_date)::int-3,1) returning id",[family])).id;
  const claim=(await one(`insert into public.evidence_claims(claim_key,claim_text,source_title,source_url,source_organisation,evidence_type,checked_on,review_due_on,status,notes,applicability,not_supported)
    values('synthetic-portfolio','Fictional fixture','Fictional source','https://example.org/fixture','Fictional','expert_consensus',current_date-30,current_date+60,'approved','Not a real review','Software tests only','No real-world safety or efficacy') returning id`)).id;
  const review=async id=>db.query(`insert into public.activity_template_reviews(template_id,content_version,template_snapshot,evidence_snapshot,reviewer_name,reviewer_qualifications,reviewed_at,review_due_on,evidence_review,safety_applicability_review,language_review,rights_review)
    select id,content_version,to_jsonb(t),public.activity_evidence_snapshot_internal(id),'FICTIONAL REVIEWER','SOFTWARE TEST ONLY',now()-interval '1 minute',current_date+60,'Fictional','Fictional','Fictional','Fictional' from public.activity_templates t where id=$1
    on conflict(template_id,content_version) do update set template_snapshot=excluded.template_snapshot,evidence_snapshot=excluded.evidence_snapshot`,[id]);
  const ids=[];
  for(const [slug,domain,type] of [
    ['a','movement','embedded'],['b','movement','embedded'],['c','creative','embedded'],
    ['d','language','intentional'],['e','language','intentional'],['f','nature','intentional'],['g','creative','intentional'],
  ]) {
    const id=(await one(`insert into public.activity_templates(slug,title,domain,min_age_months,max_age_months,duration_minutes,summary,instructions,conversation_prompt,look_for,why_it_matters,safety_note,review_status,setup_minutes,experience_type,context_requirements)
      values($1,$1,$2,0,83,5,'fixture','fixture','fixture','fixture','fixture','fixture','expert_reviewed',1,$3,$4) returning id`,['synthetic-portfolio-'+slug,domain,type,JSON.stringify(contextFixture)])).id;
    ids.push(id);
    await db.query('insert into public.activity_template_claims(template_id,claim_id) values($1,$2)',[id,claim]);
    await review(id);
    await db.query(`insert into public.activity_context_confirmations(child_id,template_id,content_version,contract,answers,valid_from,valid_until,revision,confirmed_by)
      select $1,id,content_version,context_requirements,'{"adult":true,"book":true}'::jsonb,$2::date,$2::date+6,1,$3 from public.activity_templates where id=$4`,[child,start,owner,id]);
  }
  const [a,b,c,d,,f]=ids;
  const generate=async()=>{
    await db.exec('set role authenticated');
    const id=(await one('select public.generate_next_week_plan($1) id',[child])).id;
    await db.exec('reset role');
    return {id,items:(await db.query('select * from public.activity_instances where plan_id=$1 order by scheduled_date',[id])).rows};
  };
  const snapshot=async()=>({plans:(await db.query('select to_jsonb(p) row from public.plans p order by id')).rows,items:(await db.query('select to_jsonb(i) row from public.activity_instances i order by id')).rows});
  await db.exec('begin');
  const base=await generate();
  assert.deepEqual(base.items.map(i=>i.template_id),[a,d,null,c,b,f,null]);
  assert.ok(base.items.every(i=>i.is_optional && i.opportunity_type!=='language'));
  assert.equal((await one('select generation_method from public.plans where id=$1',[base.id])).generation_method,'reviewed_portfolio_v4');
  assert.match(base.items[0].selection_reason,/Adds an area not yet selected/);
  assert.match(base.items[4].selection_reason,/This area already appears/);
  const before=await snapshot();
  assert.equal((await generate()).id,base.id);
  assert.deepEqual(await snapshot(),before);
  await assert.rejects(db.query('select public.populate_weekly_portfolio_internal($1,$2,$3,null)',[base.id,child,start]),/Existing plan is preserved/);
  // A rejected SQL statement aborts this local transaction. Roll it all back.
  await db.exec('rollback');

  const history=async(engagement,repeated,template=b,daysAgo=1)=>{
    await db.query('update public.activity_context_confirmations set valid_from=current_date-1,valid_until=current_date+5 where child_id=$1',[child]);
    const plan=(await one("insert into public.plans(child_id,week_start) values($1,date_trunc('week',current_date-$2::int)::date) on conflict(child_id,week_start) do update set status=plans.status returning id",[child,daysAgo])).id;
    const instance=(await one(`insert into public.activity_instances(plan_id,child_id,template_id,scheduled_date,personalized_title,personalized_instructions,selection_reason,opportunity_type,estimated_parent_minutes,is_optional)
      select $1,$2,id,current_date-$4::int,title,instructions,'Synthetic only',experience_type,setup_minutes,true from public.activity_templates where id=$3 returning id`,[plan,child,template,daysAgo])).id;
    await db.query('insert into public.observations(activity_instance_id,child_id,engagement,repeated) values($1,$2,$3,$4)',[instance,child,engagement,repeated]);
    await db.exec('set constraints all immediate; set constraints all deferred');
    await db.query('update public.activity_context_confirmations set valid_from=$2::date,valid_until=$2::date+6 where child_id=$1',[child,start]);
  };
  for(const [engagement,repeated,expected] of [['high',true,b],['low',true,a],['high',null,a],[null,true,a]]) {
    await db.exec('begin');await history(engagement,repeated);
    const result=await generate();assert.equal(result.items[0].template_id,expected);
    assert.equal(result.items[0].selection_reason.includes('Your latest recent report'),expected===b);
    await db.exec('rollback');
  }
  // A newer unknown report supersedes the older positive one, without becoming
  // evidence of inability or suppressing every movement activity.
  await db.exec('begin');await history('high',true);await history(null,null,b,0);
  assert.equal((await generate()).items[0].template_id,a);await db.exec('rollback');
  // A stale content version cannot inherit positive repetition evidence.
  await db.exec('begin');await history('high',true);
  await db.query("update public.activity_templates set instructions='Changed fictional version' where id=$1",[b]);await review(b);
  await db.query('update public.activity_context_confirmations c set content_version=t.content_version from public.activity_templates t where c.template_id=t.id and c.child_id=$1',[child]);
  assert.equal((await generate()).items[0].template_id,a);await db.exec('rollback');
  // Context always beats a positive report; missing context leaves open space.
  await db.exec('begin');await history('high',true);
  await db.query('update public.activity_context_confirmations set answers=$3::jsonb where child_id=$1 and template_id=$2',[child,b,JSON.stringify({adult:false,book:true})]);
  assert.ok((await generate()).items.every(i=>i.template_id!==b));await db.exec('rollback');
  await db.exec('begin');await db.query('delete from public.activity_context_confirmations where child_id=$1',[child]);
  assert.ok((await generate()).items.every(i=>i.template_id===null));await db.exec('rollback');

  for(const user of [other,viewer]) {
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);await db.exec('set role authenticated');
    await assert.rejects(db.query('select public.generate_weekly_plan($1)',[child]),/Caregiver access required/);
    await assert.rejects(db.query('select public.populate_weekly_portfolio_internal(null,$1,$2,null)',[child,start]),e=>e.code==='42501');
    await db.exec('reset role');
  }
  await db.query("select set_config('request.jwt.claim.sub','',false)");
  await db.exec('set role anon');await assert.rejects(db.query('select public.generate_weekly_plan($1)',[child]),/Caregiver access required/);await db.exec('reset role');
  console.log('PASS portfolio v4: weekly variety, no forced language task, two open days, optional distinct choices, exact-version/latest-report repetition, unknowns, safety gate precedence, retry preservation and access boundaries. Fictional local fixtures only.');
}
