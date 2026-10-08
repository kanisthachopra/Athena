import assert from 'node:assert/strict';import {randomUUID,createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {publicationFixture} from './activity-publication.mjs';
export async function checkActivityPublicationSql(db,{owner,other,viewer,child}) {
  const one=async(sql,args=[])=>(await db.query(sql,args)).rows[0];
  const login=id=>db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);
  await db.exec('reset role');const today=(await one('select current_date::text as day')).day;
  const definition=(await one("select pg_get_functiondef('public.publish_activity_release(uuid,jsonb,jsonb)'::regprocedure) definition")).definition;
  await db.exec(readFileSync(new URL('../../supabase/migrations/202610020011_practice_source_classification.sql',import.meta.url),'utf8'));
  assert.equal((await one("select pg_get_functiondef('public.publish_activity_release(uuid,jsonb,jsonb)'::regprocedure) definition")).definition,definition,'Classifier migration replay must be unchanged');
  const {bundle,decision}=publicationFixture(today);const releaseId=randomUUID();
  const publish=async(id=releaseId,p=bundle,d=decision)=>(await one('select public.publish_activity_release($1,$2,$3) id',[id,p,d])).id;
  const plans=(await db.query('select to_jsonb(p) row from public.plans p order by id')).rows;
  const items=(await db.query('select to_jsonb(i) row from public.activity_instances i order by id')).rows;
  await db.exec('set role authenticated');
  for(const actor of [owner,other,viewer]) {await login(actor);await assert.rejects(publish,/MIRA_EDITOR_REQUIRED/);await assert.rejects(db.query("insert into public.content_publishers(user_id,enabled,authorization_reference) values($1,true,'self-enrollment')",[actor]),e=>e.code==='42501');}
  await db.exec('reset role');await db.query("insert into public.content_publishers(user_id,enabled,authorization_reference) values($1,true,'FICTIONAL IN-MEMORY PERMISSION ONLY')",[other]);
  await db.exec('set role authenticated');await login(other);
  const template=await publish();assert.equal(await publish(),template);
  await assert.rejects(()=>publish(releaseId,bundle,{...decision,rationale:'Changed'}),/MIRA_RELEASE_REQUEST_CHANGED/);
  await assert.rejects(db.query('select * from public.activity_publications'),e=>e.code==='42501');
  await db.exec('reset role');
  const row=await one('select * from public.activity_templates where id=$1',[template]);
  assert.equal(row.publication_context.language_variety,'en-SG');assert.equal(row.publication_context.readiness,'Synthetic readiness');
  const reviewed=await one('select * from public.activity_template_reviews where template_id=$1',[template]);
  assert.deepEqual(reviewed.template_snapshot,(await one('select to_jsonb(a) as snapshot from public.activity_templates a where id=$1',[template])).snapshot);assert.equal(reviewed.evidence_snapshot.length>0,true);
  assert.equal((await one('select public.activity_evidence_block_reason_internal($1,current_date) reason',[template])).reason,null);
  assert.equal((await one('select public.activity_candidate_block_reason_internal($1,$2,current_date) reason',[child,template])).reason,'MIRA_CONTEXT_REQUIRED');
  await db.exec('set role authenticated');await login(owner);
  await db.query('select public.save_activity_context($1,$2,$3,$4,0,$5,$5,$6)',[child,template,row.content_version,row.context_requirements,today,{adult:true,book:true}]);
  const live=(await db.query('select * from public.get_reviewed_library_context($1,$2)',[child,today])).rows.find(r=>r.template_id===template);
  assert.ok(live);assert.deepEqual(live.template_snapshot.publication_context,row.publication_context);
  assert.equal(live.evidence_snapshot.length,reviewed.evidence_snapshot.length);
  await db.exec('reset role');
  await assert.rejects(db.query("update public.activity_templates set instructions='Changed' where id=$1",[template]),/MIRA_PUBLISHED_TEMPLATE_IMMUTABLE/);
  await assert.rejects(db.query('delete from public.activity_template_capabilities where template_id=$1',[template]),/MIRA_PUBLISHED_ASSOCIATIONS_IMMUTABLE/);
  await assert.rejects(db.query('delete from public.activity_template_tracks where template_id=$1',[template]),/MIRA_PUBLISHED_ASSOCIATIONS_IMMUTABLE/);
  await login(other);
  const count=async()=>one('select (select count(*)::int from public.activity_templates) templates,(select count(*)::int from public.evidence_claims) claims,(select count(*)::int from public.activity_publications) publications');
  const before=await count();
  // Mutated packages cannot gain an exact-version publication accidentally.
  const alter=(p,fn,bind=false)=>{const c=JSON.parse(p.candidateText),r=JSON.parse(p.responseText);fn(c,r);p.candidateText=JSON.stringify(c);if(bind)r.candidateFingerprint=createHash('sha256').update(p.candidateText).digest('hex');p.responseText=JSON.stringify(r);};
  const mutations=[
    p=>p.publicationAllowed=true,p=>p.version=2,p=>p.sources=[],
    p=>alter(p,c=>c.template.instructions+=' changed'),
    p=>alter(p,(_c,r)=>r.submission.primitives[0].checks[0].outcome='reject'),
    p=>alter(p,(_c,r)=>r.submission.primitives[0].checks.pop()),
    p=>alter(p,(_c,r)=>r.submission.primitives[0].reviewDueOn='2000-01-01'),
    p=>alter(p,(_c,r)=>r.submission.primitives[0].languageVarieties=['fr']),
    p=>alter(p,(_c,r)=>r.submission.sources[0].rightsAssessment=null),
    p=>alter(p,c=>c.template.materials=null,true),
    p=>alter(p,c=>c.template.context_requirements=null,true),
    p=>alter(p,c=>c.associations.capabilities[0].code='invented',true),
    p=>alter(p,c=>c.claims[0].sourceIds=['unknown'],true),
    p=>{const s=JSON.parse(p.sources[0]);s.title='Changed';p.sources[0]=JSON.stringify(s);},
  ];
  for(const mutate of mutations){const bad=structuredClone(bundle);mutate(bad);await db.exec('set role authenticated');await assert.rejects(()=>publish(randomUUID(),bad),/MIRA_RELEASE_/);await db.exec('reset role');assert.deepEqual(await count(),before);}
  // Descriptive source records keep their exact provenance; explicit aliases
  // classify practice material without turning it into causal/consensus evidence.
  for (const kind of ['Educator practice article with classroom examples','Expert practice guide; not a trial of MIRA activities','Professional guidance']) {
    const practice=structuredClone(bundle), source=JSON.parse(practice.sources[0]);source.type=kind;
    practice.sources[0]=JSON.stringify(source);
    alter(practice,(_c,r)=>r.submission.sources[0].sourceFingerprint=createHash('sha256').update(practice.sources[0]).digest('hex'));
    await db.exec('set role authenticated');const id=await publish(randomUUID(),practice);await db.exec('reset role');
    assert.equal((await one('select e.evidence_type from public.evidence_claims e join public.activity_template_claims l on l.claim_id=e.id where l.template_id=$1',[id])).evidence_type,'practice_explanation');
  }
  const extra=structuredClone(bundle), supplemental={...JSON.parse(extra.sources[0]),id:'synthetic-material-source',title:'FICTIONAL additional material source'};
  extra.sources.push(JSON.stringify(supplemental));
  await db.exec('set role authenticated');await assert.rejects(()=>publish(randomUUID(),extra),/MIRA_RELEASE_EVIDENCE_INCOMPLETE/);
  alter(extra,(_c,r)=>r.submission.sources.push({...r.submission.sources[0],sourceId:supplemental.id,sourceFingerprint:createHash('sha256').update(extra.sources.at(-1)).digest('hex')}));
  const extraId=await publish(randomUUID(),extra);await db.exec('reset role');
  assert.equal((await one('select jsonb_array_length(package->\'sources\') n from public.activity_publications where template_id=$1',[extraId])).n,bundle.sources.length+1);
  const unclassified=structuredClone(bundle), unknown=JSON.parse(unclassified.sources[0]);unknown.type='AI says proven';unclassified.sources[0]=JSON.stringify(unknown);
  alter(unclassified,(_c,r)=>r.submission.sources[0].sourceFingerprint=createHash('sha256').update(unclassified.sources[0]).digest('hex'));
  await db.exec('set role authenticated');await assert.rejects(()=>publish(randomUUID(),unclassified),/MIRA_RELEASE_SOURCE_TYPE_UNKNOWN/);
  await db.exec('set role authenticated');await assert.rejects(()=>publish(randomUUID(),bundle,{...decision,reviewerVerification:null}),/MIRA_EDITOR_DECISION_REQUIRED/);
  assert.equal((await one('select public.retire_activity_release($1,$2) retired',[template,'Synthetic retirement'])).retired,true);
  assert.equal((await one('select public.retire_activity_release($1,$2) retired',[template,'Repeated request'])).retired,false);
  assert.equal(await publish(),template); // Replay cannot reactivate retired content.
  await db.exec('reset role');
  assert.equal((await one('select review_status from public.activity_templates where id=$1',[template])).review_status,'retired');
  assert.equal((await one('select public.activity_candidate_block_reason_internal($1,$2,current_date) reason',[child,template])).reason,'MIRA_TEMPLATE_NOT_REVIEWED');
  await assert.rejects(db.query("update public.activity_templates set reviewed=true,review_status='expert_reviewed' where id=$1",[template]),/MIRA_PUBLISHED_TEMPLATE_IMMUTABLE/);
  await db.exec('reset role');await db.query('update public.content_publishers set enabled=false where user_id=$1',[other]);await db.exec('set role authenticated');await assert.rejects(publish,/MIRA_EDITOR_REQUIRED/);
  await db.exec('reset role; set role anon');await assert.rejects(publish,e=>e.code==='42501');
  await db.exec('reset role');assert.deepEqual((await db.query('select to_jsonb(p) row from public.plans p order by id')).rows,plans);assert.deepEqual((await db.query('select to_jsonb(i) row from public.activity_instances i order by id')).rows,items);
  console.log('PASS publication SQL: explicit editor enrollment, no family self-enrollment, exact package/review/source binding, atomic import/replay, rollback of malformed bundles, current permission and no family plan changes. All content and editorial assertions are fictional local fixtures.');
}
