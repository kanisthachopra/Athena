import assert from 'node:assert/strict';
import { contextFixture } from './activity-context-sql.mjs';

// Entirely fictional content/reviews and families in an in-memory database.
export async function checkLearningDirectionsSql(db,{owner,other,viewer,family}) {
  const one=async(sql,args=[])=>(await db.query(sql,args)).rows[0];
  const login=async id=>db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);
  const plans=async()=>({plans:(await db.query('select to_jsonb(p) row from public.plans p order by id')).rows,items:(await db.query('select to_jsonb(i) row from public.activity_instances i order by id')).rows});
  await db.exec('reset role');await login(owner);const before=await plans();
  const child=(await one("insert into public.children(family_id,nickname,birth_year,birth_month) values($1,'Synthetic directions',2023,1) returning id",[family])).id;
  const hope=(await one("insert into public.aspirations(child_id,title) values($1,'Our own words — हिंदी') returning id",[child])).id;
  const read=async()=>(await one('select public.get_aspiration_directions($1) result',[child])).result;
  const save=async(direction,version,id=hope)=>(await one('select public.save_aspiration_direction($1,$2,$3,$4) result',[child,id,version??(await read()).version,direction===null?null:JSON.stringify(direction)])).result;
  const current={horizon:'now',capabilities:['physical_motor'],tracks:['music']};
  await db.exec('set role authenticated');
  const blank=await read();assert.deepEqual(blank.hopes,[{id:hope,title:'Our own words — हिंदी',direction:null}]);
  const profileBefore=(await one('select public.get_learning_profile_snapshot($1) result',[child])).result;
  const saved=await save(current);assert.notEqual(saved.version,blank.version);assert.deepEqual(saved.hopes[0].direction,current);
  const exported=(await one('select public.export_aspiration_directions($1) result',[child])).result;
  assert.equal(exported[0].aspiration_id,hope);assert.deepEqual(exported[0].direction,current);
  const profileAfter=(await one('select public.get_learning_profile_snapshot($1) result',[child])).result;
  assert.notEqual(profileBefore.version,profileAfter.version,'Old setup must notice new direction links');
  await assert.rejects(save(current,blank.version),/MIRA_DIRECTION_STALE/);
  for(const invalid of [{...current,extra:true},{...current,horizon:null},{...current,horizon:'daily'},{...current,capabilities:null},{...current,tracks:['music','music']},{...current,tracks:['invented']},{...current,tracks:[null]},{horizon:'now',capabilities:[],tracks:[]},[],"bad"]) {
    const snapshot=await read();await assert.rejects(save(invalid),/MIRA_DIRECTION_INVALID|MIRA_DIRECTION_CHOOSE_OPPORTUNITY/);assert.deepEqual(await read(),snapshot);
  }
  const future=await save({horizon:'future',capabilities:[],tracks:[]});assert.equal(future.hopes[0].direction.horizon,'future');
  const cleared=await save(null);assert.equal(cleared.hopes[0].direction,null);assert.notEqual(cleared.version,blank.version);
  await assert.rejects(save(null,future.version),/MIRA_DIRECTION_STALE/);
  await assert.rejects(save(current,cleared.version,'00000000-0000-4000-8000-000000000000'),/MIRA_DIRECTION_NOT_FOUND/);
  for(const user of [viewer,other]) {
    await login(user);await assert.rejects(save(current,cleared.version),/MIRA_DIRECTION_ACCESS/);
    if(user===viewer)assert.deepEqual(await read(),cleared);else {
      await assert.rejects(read(),/MIRA_DIRECTION_ACCESS/);
      await assert.rejects(db.query('select public.export_aspiration_directions($1)',[child]),/MIRA_DIRECTION_ACCESS/);
    }
  }
  await login(owner);
  await assert.rejects(db.query('select * from public.aspiration_directions'),e=>e.code==='42501');
  await assert.rejects(db.query('select public.aspiration_directions_snapshot_internal($1)',[child]),e=>e.code==='42501');
  await assert.rejects(db.query("select public.match_family_direction_internal('{}','{}')"),e=>e.code==='42501');
  await db.exec('reset role; set role anon');await assert.rejects(read(),e=>e.code==='42501');await assert.rejects(save(current,cleared.version),e=>e.code==='42501');
  await db.exec('reset role');await login(owner);
  // Build eligible fictional options; only exact publication-context tags match.
  await db.query('update public.family_preferences set weekday_minutes=30,weekend_minutes=30 where family_id=$1',[family]);
  const start=(await one("select (date_trunc('week',public.child_today_internal($1))::date+7)::text d",[child])).d;
  const claim=(await one("select id from public.evidence_claims where claim_key='synthetic-portfolio'")).id;
  const ids=[];
  for(const [slug,domain,type,tracks] of [['a','movement','embedded',[]],['b','movement','embedded',['music']],['c','creative','embedded',[]],['d','nature','intentional',[]]]) {
    const pub={schema_version:1,language_variety:'en',readiness:'Fictional only',exclusions:'Fictional only',associations:{capabilities:[{code:'curiosity_play_creativity',emphasis:'primary',rationale:'Fictional'}],tracks:tracks.map(code=>({code,rationale:'Fictional'}))}};
    const id=(await one(`insert into public.activity_templates(slug,title,domain,min_age_months,max_age_months,duration_minutes,summary,instructions,conversation_prompt,look_for,why_it_matters,safety_note,review_status,setup_minutes,experience_type,context_requirements,publication_context)
      values($1,$1,$2,0,83,5,'fictional','fictional','fictional','fictional','fictional','fictional','expert_reviewed',1,$3,$4,$5) returning id`,['synthetic-directions-'+slug,domain,type,JSON.stringify(contextFixture),JSON.stringify(pub)])).id;
    ids.push(id);
    await db.query('insert into public.activity_template_claims(template_id,claim_id) values($1,$2)',[id,claim]);
    await db.query(`insert into public.activity_template_reviews(template_id,content_version,template_snapshot,evidence_snapshot,reviewer_name,reviewer_qualifications,reviewed_at,review_due_on,evidence_review,safety_applicability_review,language_review,rights_review)
      select id,content_version,to_jsonb(t),public.activity_evidence_snapshot_internal(id),'FICTIONAL','SOFTWARE TEST ONLY',now()-interval '1 minute',current_date+60,'Fictional','Fictional','Fictional','Fictional' from public.activity_templates t where id=$1`,[id]);
    await db.query(`insert into public.activity_context_confirmations(child_id,template_id,content_version,contract,answers,valid_from,valid_until,revision,confirmed_by)
      select $1,id,content_version,context_requirements,'{"adult":true,"book":true}'::jsonb,$2::date,$2::date+6,1,$3 from public.activity_templates where id=$4`,[child,start,owner,id]);
  }
  const [a,b,c]=ids;
  const generate=async()=>{await db.exec('set role authenticated');const id=(await one('select public.generate_next_week_plan($1) id',[child])).id;await db.exec('reset role');return{id,items:(await db.query('select * from public.activity_instances where plan_id=$1 order by scheduled_date',[id])).rows};};
  for(const [horizon,expected] of [['now',b],['future',a],['paused',a]]) {
    await db.exec('begin');await save({...current,horizon});const result=await generate();
    assert.equal(result.items[0].template_id,expected);assert.equal(result.items[3].template_id,c,'Variety outranks another matched domain');
    assert.equal(result.items[0].selection_reason.includes('Current family direction:'),horizon==='now');
    if(horizon==='now'){assert.match(result.items[0].selection_reason,/Our own words — हिंदी/);assert.match(result.items[0].selection_reason,/Music/);}
    assert.equal(result.items.filter(i=>i.opportunity_type==='open').length,3);
    assert.equal((await one('select generation_method from public.plans where id=$1',[result.id])).generation_method,'reviewed_portfolio_v5');
    const immutable=await plans();await save(null);assert.equal((await generate()).id,result.id);assert.deepEqual(await plans(),immutable);
    await db.exec('rollback');
  }
  await db.exec('begin');await save(current);
  await db.query('delete from public.activity_context_confirmations where child_id=$1 and template_id=$2',[child,b]);
  assert.equal((await generate()).items[0].template_id,a,'Priority never overrides missing required context');await db.exec('rollback');
  await db.exec('begin');await save(current);
  await db.query("update public.activity_templates set publication_context=jsonb_set(publication_context,'{associations,tracks}','[]') where id=$1",[b]);
  assert.ok((await generate()).items.every(i=>i.template_id!==b),'Changed reviewed content is not eligible');await db.exec('rollback');
  assert.deepEqual(await plans(),before);
  console.log('PASS learning directions: exact parent choices, no defaults, now/future/paused, clear/version/stale/roles, setup invalidation, reviewed-association matching, real ranking change with preserved variety/context gates, historical reason preservation and unchanged existing plans. Fictional local reviews only.');
}
