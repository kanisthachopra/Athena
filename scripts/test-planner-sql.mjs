// Executes the actual migration chain in an in-memory PostgreSQL runtime.
// Install isolated test tooling (no production dependency change):
// npm install --prefix tmp/pglite-tests --no-save --package-lock=false --ignore-scripts @electric-sql/pglite@0.5.8
// Supabase auth helpers/default grants are a local fixture, NOT hosted auth evidence.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { checkGuideBudgetSql } from './fixtures/guide-budget-sql.mjs';
import { checkActivityContextSql } from './fixtures/activity-context-sql.mjs';
import { checkExtractionBudgetSql } from './fixtures/extraction-budget-sql.mjs';
import { checkJournalRetrySql } from './fixtures/journal-retry-sql.mjs';
import { checkActivityPublicationSql } from './fixtures/activity-publication-sql.mjs';
import { checkLearningProfileSql } from './fixtures/learning-profile-sql.mjs';
import { checkLanguageEnvironmentSql } from './fixtures/language-environment-sql.mjs';
import { checkLanguageAddSql } from './fixtures/language-add-sql.mjs';
import { checkPortfolioSelectionSql } from './fixtures/portfolio-selection-sql.mjs';
import { checkFamilyCalendarSql } from './fixtures/family-calendar-sql.mjs';
import { checkChildProfileSql } from './fixtures/child-profile-sql.mjs';
import { checkProfileCreationSql } from './fixtures/profile-creation-sql.mjs';
import { checkJournalCorrectionsSql } from './fixtures/journal-corrections-sql.mjs';
const testRequire = createRequire(new URL("../tmp/pglite-tests/package.json", import.meta.url));
const { PGlite } = testRequire("@electric-sql/pglite");
const { pgcrypto } = testRequire("@electric-sql/pglite/contrib/pgcrypto");
const db = await PGlite.create({ extensions: { pgcrypto } });
const owner="10000000-0000-4000-8000-000000000001", other="10000000-0000-4000-8000-000000000002", viewer="10000000-0000-4000-8000-000000000003";
const family="20000000-0000-4000-8000-000000000001", child="30000000-0000-4000-8000-000000000001";
const one=async(sql,args=[]) => (await db.query(sql,args)).rows[0];
const login=async id=>db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);
try {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key,email text);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('sub',auth.uid(),'email','synthetic@example.invalid') $$;
    grant usage on schema public,auth to anon,authenticated;
    alter default privileges in schema public grant all on tables to anon,authenticated;
    alter default privileges in schema public grant all on functions to anon,authenticated;
    alter default privileges in schema public grant all on sequences to anon,authenticated;`);
  const folder=new URL("../supabase/migrations/",import.meta.url);
  const migrations=readdirSync(folder).filter(x=>x.endsWith('.sql')).sort();
  const boundary="202610010006_reviewed_candidate_eligibility.sql";
  const contextBoundary="202610020001_activity_context_requirements.sql";
  for(const file of migrations.filter(x=>x<boundary)) {
    try { await db.exec(readFileSync(new URL(file,folder),'utf8')); }
    catch(error){throw new Error(`Baseline migration failed: ${file}: ${error.message}`);}
  }
  await db.query("insert into auth.users(id,email) values($1,'owner@example.invalid'),($2,'other@example.invalid'),($3,'viewer@example.invalid')",[owner,other,viewer]);
  await login(owner);
  await db.query("insert into public.families(id,display_name) values($1,'Synthetic local family')",[family]);
  await db.query("insert into public.family_members(family_id,user_id,role) values($1,$2,'owner'),($1,$3,'viewer')",[family,owner,viewer]);
  await db.query("insert into public.children(id,family_id,nickname,birth_year,birth_month) values($1,$2,'Synthetic child',2023,10)",[child,family]);
  await db.query("insert into public.family_preferences(family_id,weekday_minutes,weekend_minutes) values($1,6,30)",[family]);
  const oldPlan=(await one("select public.generate_weekly_plan($1) as id",[child])).id;
  const before=(await db.query("select to_jsonb(p) row from public.plans p order by id")).rows;
  const beforeItems=(await db.query("select to_jsonb(i) row from public.activity_instances i order by id")).rows;
  assert.ok(beforeItems.length>0);
  for(const file of migrations.filter(x=>x>=boundary && x<contextBoundary)) {
    try { await db.exec(readFileSync(new URL(file,folder),'utf8')); }
    catch(error){throw new Error(`Hardening migration failed: ${file}: ${error.message}`);}
  }
  assert.deepEqual((await db.query("select to_jsonb(p) row from public.plans p order by id")).rows,before);
  assert.deepEqual((await db.query("select to_jsonb(i)-'revision'-'content_snapshot' row from public.activity_instances i order by id")).rows,beforeItems);
  assert.equal((await one("select count(*)::int n from public.activity_content_versions")).n,0);
  assert.equal((await one("select count(*)::int n from public.activity_instances where content_snapshot is not null")).n,0);
  assert.equal((await one("select public.generate_weekly_plan($1) as id",[child])).id,oldPlan);
  assert.deepEqual((await db.query("select to_jsonb(p) row from public.plans p order by id")).rows,before);
  assert.equal((await db.query("select * from public.get_library_candidate_ids($1,'2026-10-05')",[child])).rows.length,0);

  // Exact review records exist ONLY in this disposable in-memory database.
  const template=(await one(`insert into public.activity_templates(slug,title,domain,min_age_months,max_age_months,duration_minutes,
    summary,instructions,conversation_prompt,look_for,why_it_matters,safety_note,review_status,setup_minutes)
    values('synthetic-review-test','Synthetic SQL fixture — never publish','language',0,83,5,'fixture','fixture','fixture','fixture','fixture','fixture','expert_reviewed',2) returning id`)).id;
  const reason=async(date="2026-10-05")=>(await one("select public.activity_candidate_block_reason_internal($1,$2,$3) reason",[child,template,date])).reason;
  assert.equal(await reason(),'MIRA_REVIEW_MISSING_OR_STALE');
  const reviewFixture=async id=>db.query(`insert into public.activity_template_reviews(template_id,content_version,template_snapshot,evidence_snapshot,reviewer_name,reviewer_qualifications,
    reviewed_at,review_due_on,evidence_review,safety_applicability_review,language_review,rights_review)
    select id,content_version,to_jsonb(t),public.activity_evidence_snapshot_internal(id),'SYNTHETIC FIXTURE — NOT AN APPROVAL','Synthetic',now()-interval '1 minute','2200-01-01','Synthetic','Synthetic','Synthetic','Synthetic'
    from public.activity_templates t where id=$1
    on conflict(template_id,content_version) do update set template_snapshot=excluded.template_snapshot,evidence_snapshot=excluded.evidence_snapshot`,[id]);
  await reviewFixture(template);
  assert.equal(await reason(),'MIRA_EVIDENCE_REVIEW_MISSING_OR_STALE');
  const claim=(await one(`insert into public.evidence_claims(claim_key,claim_text,source_title,source_url,source_organisation,evidence_type,checked_on,review_due_on,status,notes,applicability,not_supported)
    values('synthetic-sql','Synthetic fact only','Synthetic source','https://example.org/fixture','Synthetic organisation','expert_consensus',current_date-1,'2200-01-01','approved','Synthetic note','Fictional software test only','No real child use or educational benefit') returning id`)).id;
  await db.query('insert into public.activity_template_claims(template_id,claim_id) values($1,$2)',[template,claim]);
  assert.equal(await reason(),'MIRA_REVIEW_MISSING_OR_STALE');
  await reviewFixture(template);
  assert.equal(await reason(),'MIRA_TIME_BUDGET_EXCEEDED'); // 5+2 is not <= weekday 6
  assert.equal(await reason('2026-10-10'),null); // weekend 30
  await db.query("update public.family_preferences set weekday_minutes=7 where family_id=$1",[family]);
  assert.equal(await reason(),null);
  await db.query("update public.children set birth_year=2019,birth_month=10 where id=$1",[child]);
  assert.equal(await reason(),'MIRA_AGE_OUTSIDE_REVIEWED_RANGE');
  await db.query("update public.children set birth_year=2019,birth_month=11 where id=$1",[child]);
  assert.equal(await reason(),null); // six-year-old before seventh-birthday month
  await db.query("update public.children set birth_year=2027,birth_month=1 where id=$1",[child]);
  assert.equal(await reason(),'MIRA_AGE_OUTSIDE_REVIEWED_RANGE');
  await db.query("update public.children set birth_year=2023,birth_month=10 where id=$1",[child]);
  await db.query("update public.activity_templates set title='Changed without review' where id=$1",[template]);
  assert.equal(await reason(),'MIRA_REVIEW_MISSING_OR_STALE');
  await db.query("update public.activity_templates set title='Synthetic SQL fixture — never publish' where id=$1",[template]);
  assert.equal(await reason(),null);
  await db.query("update public.activity_template_reviews set review_due_on='2026-10-04',reviewed_at='2026-09-01' where template_id=$1",[template]);
  assert.equal(await reason(),'MIRA_REVIEW_MISSING_OR_STALE');
  // A past scheduling date must not revive a review that expired yesterday.
  await db.query("update public.activity_template_reviews set reviewed_at=now()-interval '10 days',review_due_on=current_date-1 where template_id=$1",[template]);
  const pastDate=(await one("select (current_date-2)::text as day")).day;
  assert.equal(await reason(pastDate),'MIRA_REVIEW_MISSING_OR_STALE');
  await db.query("update public.activity_template_reviews set review_due_on='2200-01-01',reviewed_at=now()-interval '1 minute' where template_id=$1",[template]);
  const p=(await one("insert into public.plans(child_id,week_start) values($1,'2026-10-05') returning id",[child])).id;
  await db.query("select public.populate_weekly_portfolio_internal($1,$2,'2026-10-05',null)",[p,child]);
  const items=(await db.query("select * from public.activity_instances where plan_id=$1 order by scheduled_date",[p])).rows;
  assert.equal(items.length,7);assert.equal(items.filter(x=>x.template_id===template).length,1);
  assert.equal(items.find(x=>x.template_id===template).scheduled_date.toISOString().slice(0,10),'2026-10-06'); // intentional Tuesday; skipped Monday does not shift slots
  assert.equal(items.filter(x=>x.opportunity_type==='open').length,6);
  await assert.rejects(db.query("select public.populate_weekly_portfolio_internal($1,$2,'2026-10-05',null)",[p,child]),/Existing plan is preserved/);
  const item=items.find(x=>x.template_id===template);
  assert.equal(item.content_snapshot.template.id,template);
  assert.equal(item.content_snapshot.template.instructions,item.personalized_instructions);
  assert.equal(item.content_snapshot.review.content_version,2);
  assert.equal(item.content_snapshot.schema_version,2);
  assert.equal(item.content_snapshot.evidence[0].claim.id,claim);
  assert.equal(item.content_snapshot.evidence[0].claim.applicability,'Fictional software test only');
  const atomicContext=(await db.query('select * from public.get_reviewed_library_context($1,$2)',[child,'2026-10-05'])).rows;
  assert.deepEqual(atomicContext[0].evidence_snapshot,item.content_snapshot.evidence);
  assert.ok(!Object.hasOwn(item.content_snapshot.review,'reviewer_name'));
  const history=async()=> (await db.query("select * from public.activity_content_versions where activity_instance_id=$1 order by instance_revision",[item.id])).rows;
  const initialHistory=await history();assert.equal(initialHistory.length,1);
  assert.deepEqual(initialHistory[0].content_snapshot,item.content_snapshot);
  // Deferred validation permits a valid swap despite the temporary date.
  await db.query("select public.reschedule_planned_activity($1,'2026-10-10')",[item.id]);
  await db.query("update public.family_preferences set weekday_minutes=6 where family_id=$1",[family]);
  await assert.rejects(db.query("select public.reschedule_planned_activity($1,'2026-10-06')",[item.id]),/MIRA_TIME_BUDGET_EXCEEDED/);
  assert.equal((await one("select scheduled_date::text from public.activity_instances where id=$1",[item.id])).scheduled_date,'2026-10-10');
  assert.deepEqual(await history(),initialHistory); // moves do not rewrite selection history
  await assert.rejects(db.query("update public.activity_instances set personalized_instructions='Unreviewed new text' where id=$1",[item.id]),/MIRA_ACTIVITY_CONTENT_IMMUTABLE/);
  await assert.rejects(db.query("update public.activity_instances set content_snapshot='{}'::jsonb where id=$1",[item.id]),/MIRA_ACTIVITY_CONTENT_IMMUTABLE/);
  assert.deepEqual(await history(),initialHistory);
  // Raw writes cannot bypass the same guard.
  await assert.rejects(db.query("update public.activity_instances set scheduled_date='2026-10-12' where id=$1",[item.id]),/MIRA_ACTIVITY_OUTSIDE_WEEK/);
  const openItem=items.find(x=>x.opportunity_type==='open');
  await assert.rejects(db.query("update public.activity_instances set scheduled_date='2026-10-04' where id=$1",[openItem.id]),/MIRA_ACTIVITY_OUTSIDE_WEEK/);
  await assert.rejects(db.query("update public.plans set week_start='2026-10-12' where id=$1",[p]),/MIRA_PLAN_IDENTITY_IMMUTABLE/);
  await assert.rejects(db.query("insert into public.activity_instances(plan_id,child_id,scheduled_date,personalized_title,personalized_instructions,opportunity_type) values($1,$2,'2026-10-12','Synthetic','Synthetic','open')",[p,child]),/MIRA_ACTIVITY_OUTSIDE_WEEK/);
  const otherPlan=(await one("insert into public.plans(child_id,week_start) values($1,'2026-10-19') returning id",[child])).id;
  await assert.rejects(db.query("insert into public.activity_instances(plan_id,child_id,template_id,scheduled_date,personalized_title,personalized_instructions,estimated_parent_minutes) values($1,$2,$3,'2026-10-19','Synthetic SQL fixture — never publish','Invented variant',2)",[otherPlan,child,template]),/MIRA_UNREVIEWED_ACTIVITY_VARIANT/);
  assert.equal((await one("select count(*)::int n from public.activity_instances where plan_id=$1",[otherPlan])).n,0);
  await assert.rejects(db.query("update public.activity_instances set template_id=null where id=$1",[item.id]),/MIRA_KEEP_ACTIVITY_HISTORY_USE_SKIP/);
  await assert.rejects(db.query("update public.activity_instances set plan_id=$1 where id=$2",[otherPlan,openItem.id]),/MIRA_ACTIVITY_IDENTITY_IMMUTABLE/);
  assert.equal((await one("select count(*)::int n from public.activity_instances where plan_id=$1",[p])).n,7);

  // A checked replacement binds both the instance revision and the exact
  // candidate shown. Synthetic editorial rows never leave this local database.
  const alternative=(await one(`insert into public.activity_templates(slug,title,domain,min_age_months,max_age_months,duration_minutes,
    summary,instructions,conversation_prompt,look_for,why_it_matters,safety_note,review_status,setup_minutes)
    select 'synthetic-alternative','Synthetic alternative — never publish',domain,min_age_months,max_age_months,duration_minutes,
      summary,instructions,conversation_prompt,look_for,why_it_matters,safety_note,review_status,setup_minutes
      from public.activity_templates where id=$1 returning id`,[template])).id;
  await db.query('insert into public.activity_template_claims(template_id,claim_id) values($1,$2)',[alternative,claim]);
  await reviewFixture(alternative);
  const candidateSnapshot=async id=>(await one("select to_jsonb(t) snapshot from public.activity_templates t where id=$1",[id])).snapshot;
  const alternativeSnapshot=await candidateSnapshot(alternative);
  const readItem=async()=>one("select to_jsonb(i) row from public.activity_instances i where id=$1",[item.id]);
  const prior=await readItem();
  const replace=(revision,snapshot=alternativeSnapshot,targetId=alternative)=>db.query("select public.replace_planned_activity_checked($1,$2,$3,$4)",[item.id,targetId,revision,snapshot]);
  await assert.rejects(replace(null),/MIRA_REPLACEMENT_CONTEXT_REQUIRED/);
  await assert.rejects(replace(prior.row.revision-1),/MIRA_STALE_ACTIVITY/);
  await assert.rejects(replace(prior.row.revision,{...alternativeSnapshot,instructions:'Tampered preview'}),/MIRA_STALE_REPLACEMENT/);
  assert.deepEqual(await readItem(),prior);
  await db.query("update public.activity_templates set title='New editorial wording' where id=$1",[alternative]);
  await assert.rejects(replace(prior.row.revision),/MIRA_STALE_REPLACEMENT/);
  await db.query("update public.activity_templates set title=$1 where id=$2",[alternativeSnapshot.title,alternative]);
  await db.exec('set role authenticated');
  await replace(prior.row.revision);
  const replaced=await readItem();
  assert.equal(replaced.row.template_id,alternative);
  assert.equal(replaced.row.revision,prior.row.revision+1);
  await assert.rejects(replace(prior.row.revision),/MIRA_STALE_ACTIVITY/); // double submit
  assert.deepEqual(await readItem(),replaced);
  await assert.rejects(db.query("select public.replace_planned_activity($1,$2)",[item.id,template]),e=>e.code==='42501');
  await replace(replaced.row.revision,await candidateSnapshot(template),template);
  const restored=await readItem();
  assert.equal(restored.row.template_id,template);
  assert.equal(restored.row.revision,replaced.row.revision+1);
  const versionHistory=await history();assert.equal(versionHistory.length,3);
  assert.deepEqual(versionHistory[0],initialHistory[0]);
  assert.deepEqual(versionHistory.map(x=>x.template_id),[template,alternative,template]);
  await assert.rejects(db.query("update public.activity_content_versions set personalized_title='tampered' where activity_instance_id=$1",[item.id]),e=>e.code==='42501');
  await assert.rejects(db.query("delete from public.activity_content_versions where activity_instance_id=$1",[item.id]),e=>e.code==='42501');
  // Returning to the same displayed template does not resurrect an old token.
  await assert.rejects(replace(prior.row.revision),/MIRA_STALE_ACTIVITY/);
  await db.query("update public.activity_instances set revision=1 where id=$1",[item.id]);
  assert.deepEqual(await readItem(),restored); // clients cannot reset revisions
  await login(other);await assert.rejects(replace(restored.row.revision),/Caregiver access required/);
  assert.equal((await history()).length,0);
  await assert.rejects(db.query("select public.get_activity_use_check($1)",[item.id]),/Family access required/);
  await login(viewer);await assert.rejects(replace(restored.row.revision),/Caregiver access required/);
  assert.equal((await history()).length,3);
  await login(owner);await db.exec('reset role');
  // Source/link edits invalidate every affected exact template review, including
  // change-and-restore. They never rewrite previously selected evidence.
  await db.query('update public.family_preferences set weekday_minutes=7 where family_id=$1',[family]);
  const evidenceVersion=(await candidateSnapshot(template)).content_version;
  await db.query('update public.evidence_claims set claim_text=claim_text where id=$1',[claim]);
  assert.equal((await candidateSnapshot(template)).content_version,evidenceVersion);
  await db.query("update public.evidence_claims set claim_text='Changed synthetic wording' where id=$1",[claim]);
  assert.equal((await candidateSnapshot(template)).content_version,evidenceVersion+1);
  assert.equal(await reason(),'MIRA_REVIEW_MISSING_OR_STALE');
  assert.equal((await db.query('select * from public.get_reviewed_library_context($1,$2)',[child,'2026-10-05'])).rows.length,0);
  assert.equal((await one('select public.get_activity_use_check($1) reason',[item.id])).reason,'MIRA_SAVED_CONTENT_CHANGED');
  assert.deepEqual(await history(),versionHistory);
  await db.query("update public.evidence_claims set claim_text='Synthetic fact only' where id=$1",[claim]);
  assert.equal((await candidateSnapshot(template)).content_version,evidenceVersion+2);
  assert.equal(await reason(),'MIRA_REVIEW_MISSING_OR_STALE');
  await assert.rejects(replace(restored.row.revision,alternativeSnapshot),/MIRA_STALE_REPLACEMENT/);
  await reviewFixture(template);assert.equal(await reason(),null);
  const beforeStaleMove=await readItem();
  await assert.rejects(db.query("select public.reschedule_planned_activity($1,'2026-10-11')",[item.id]),/MIRA_SAVED_CONTENT_CHANGED/);
  assert.deepEqual(await readItem(),beforeStaleMove);
  await db.query('delete from public.activity_template_claims where template_id=$1',[template]);
  await reviewFixture(template);assert.equal(await reason(),'MIRA_EVIDENCE_REVIEW_MISSING_OR_STALE');
  await db.query('insert into public.activity_template_claims(template_id,claim_id) values($1,$2)',[template,claim]);
  await reviewFixture(template);assert.equal(await reason(),null);
  await db.query('update public.evidence_claims set review_due_on=current_date-1 where id=$1',[claim]);
  await reviewFixture(template);assert.equal(await reason(),'MIRA_SOURCE_REVIEW_EXPIRED');
  await db.query("update public.evidence_claims set review_due_on='2200-01-01',applicability=null where id=$1",[claim]);
  await reviewFixture(template);assert.equal(await reason(),'MIRA_SOURCE_SCOPE_INCOMPLETE');
  await db.query("update public.evidence_claims set applicability='Fictional software test only' where id=$1",[claim]);
  await reviewFixture(template);assert.equal(await reason(),null);
  assert.deepEqual(await history(),versionHistory);
  await db.query("update public.activity_templates set review_status='retired' where id=$1",[alternative]);
  await db.query("update public.activity_templates set review_status='retired' where id=$1",[template]);
  assert.equal((await one("select public.get_activity_use_check($1) reason",[item.id])).reason,'MIRA_SAVED_CONTENT_CHANGED');
  assert.deepEqual((await history())[0],initialHistory[0]);
  await assert.rejects(db.query("select public.replace_planned_activity($1,$2)",[item.id,template]),/MIRA_TEMPLATE_NOT_REVIEWED/);
  await db.query("insert into public.saved_activities(child_id,template_id,saved_by) values($1,$2,$3)",[child,template,owner]);
  await db.query("select public.set_activity_saved($1,$2,false)",[child,template]);
  assert.equal((await one("select count(*)::int n from public.saved_activities where child_id=$1",[child])).n,0);
  // A status-only observation of an existing retired/prototype plan still saves.
  await db.query("update public.activity_instances set status='completed' where id=$1",[item.id]);
  assert.deepEqual(await history(),versionHistory);

  // No approved candidates remain: newly stored explanations must say so,
  // while an existing plan retry must preserve the whole row and all items.
  const freshChild=(await one("insert into public.children(family_id,nickname,birth_year,birth_month) values($1,'Synthetic summary fixture',2023,10) returning id",[family])).id;
  for(const rpc of ['generate_weekly_plan','generate_next_week_plan']) {
    const freshPlan=(await one(`select public.${rpc}($1) as id`,[freshChild])).id;
    const row=await one("select to_jsonb(p) row from public.plans p where id=$1",[freshPlan]);
    assert.match(row.row.adaptation_summary,/No reviewed activity/);
    const saved=(await db.query("select to_jsonb(i) row from public.activity_instances i where plan_id=$1 order by id",[freshPlan])).rows;
    assert.equal(saved.length,7);
    assert.ok(saved.every(x=>x.row.template_id===null));
    assert.equal((await one(`select public.${rpc}($1) as id`,[freshChild])).id,freshPlan);
    assert.deepEqual(await one("select to_jsonb(p) row from public.plans p where id=$1",[freshPlan]),row);
    assert.deepEqual((await db.query("select to_jsonb(i) row from public.activity_instances i where plan_id=$1 order by id",[freshPlan])).rows,saved);
  }

  await db.exec("set role authenticated");
  await assert.rejects(db.query("select public.set_family_ai_preferences($1,0,true,false,false,'2026-10-01-v1')",[family]),/Review the current AI information/);
  assert.equal((await one("select public.set_family_ai_preferences($1,0,true,false,false,'2026-10-01-v2') revision",[family])).revision,1);
  await db.query("select public.set_family_ai_preferences($1,1,false,false,false,null)",[family]);
  await assert.rejects(db.query("select * from public.activity_template_reviews"),e=>e.code==='42501');
  await assert.rejects(db.query("insert into public.activity_template_reviews(template_id) values($1)",[template]),e=>e.code==='42501');
  await assert.rejects(db.query("select public.activity_candidate_block_reason_internal($1,$2,'2026-10-05')",[child,template]),e=>e.code==='42501');
  await assert.rejects(db.query("select public.record_new_plan_selection_internal($1)",[oldPlan]),e=>e.code==='42501');
  await assert.rejects(db.query('select public.activity_evidence_snapshot_internal($1)',[template]),e=>e.code==='42501');
  await assert.rejects(db.query('select public.activity_evidence_block_reason_internal($1,current_date)',[template]),e=>e.code==='42501');
  await assert.rejects(db.query('update public.evidence_claims set status=\'approved\' where id=$1',[claim]),e=>e.code==='42501');
  // Exercise direct row writes as an actual family editor, not only admin.
  await assert.rejects(db.query("update public.activity_instances set scheduled_date='2026-10-12' where id=$1",[openItem.id]),/MIRA_ACTIVITY_OUTSIDE_WEEK/);
  await assert.rejects(db.query("update public.plans set week_start='2026-10-12' where id=$1",[p]),/MIRA_PLAN_IDENTITY_IMMUTABLE/);
  await login(other);
  await assert.rejects(db.query("select * from public.get_library_candidate_ids($1,'2026-10-05')",[child]),/Family access required/);
  await login(viewer);
  await assert.rejects(db.query("select public.generate_next_week_plan($1)",[child]),/Caregiver access required/);
  await db.query("select * from public.get_library_candidate_ids($1,'2026-10-05')",[child]);
  await db.exec("reset role; set role anon");
  await assert.rejects(db.query("select * from public.get_library_candidate_ids($1,'2026-10-05')",[child]),e=>e.code==='42501');
  await assert.rejects(replace(1),e=>e.code==='42501');
  await assert.rejects(history(),e=>e.code==='42501');
  await assert.rejects(db.query('select * from public.get_reviewed_library_context($1)',[child]),e=>e.code==='42501');
  await assert.rejects(db.query('select public.activity_evidence_snapshot_internal($1)',[template]),e=>e.code==='42501');
  console.log('PASS evidence binding: exact claim/link snapshot, scope/date requirements, source/link version invalidation and change/restore, stale acceptance denial, unchanged saved evidence and denied editorial helpers/writes. Synthetic local reviews only.');
  console.log("PASS immutable content: no historical backfill, exact saved template/review metadata, move/status preservation, append-only replacement history, denied content tampering, retirement use block and family-scoped history reads (local SQL).");
  console.log("PASS checked replacement: exact displayed template, current instance revision, duplicate/stale/ABA rejection, atomic failures, unforgeable revision, old unchecked RPC denied and owner/other/viewer/anonymous boundaries (local SQL).");
  console.log("PASS local PostgreSQL: full migration chain, existing-plan preservation/idempotence, no prototype candidates, exact review version/present-and-scheduled expiry, age boundary, setup+day budget, fixed day slots/open fallback, faithful stored summaries, week identity/date integrity, guarded swaps/rollback/direct writes, retired bookmark removal, family/viewer/anonymous permissions. In-memory synthetic reviews only; not hosted Supabase verification.");
  await checkGuideBudgetSql(db,{owner,other,viewer,family});
  await db.exec('reset role');
  const priorContextPlans=(await db.query('select to_jsonb(p) row from public.plans p order by id')).rows;
  const priorContextItems=(await db.query('select to_jsonb(i) row from public.activity_instances i order by id')).rows;
  // Exercise older profile contracts before their endpoint is intentionally
  // closed, then test the checked upgrade against that populated database.
  for(const file of migrations.filter(x=>x>=contextBoundary && x<'202610020016'))await db.exec(readFileSync(new URL(file,folder),'utf8'));
  assert.deepEqual((await db.query('select to_jsonb(p) row from public.plans p order by id')).rows,priorContextPlans);
  assert.deepEqual((await db.query('select to_jsonb(i) row from public.activity_instances i order by id')).rows,priorContextItems);
  await checkActivityContextSql(db,{owner,other,viewer,family});
  await checkExtractionBudgetSql(db,{owner,other,viewer,family});
  await checkJournalRetrySql(db,{owner,other,viewer,family,child});
  await checkActivityPublicationSql(db,{owner,other,viewer,family,child});
  await checkLearningProfileSql(db,{owner,other,viewer});
  await checkLanguageEnvironmentSql(db,{owner,other,viewer});
  await checkLanguageAddSql(db,{other});
  await checkPortfolioSelectionSql(db,{owner,other,viewer,family});
  await checkFamilyCalendarSql(db,{owner,other,viewer,family,child});
  await checkChildProfileSql(db,{owner,other,viewer,family,child});
  await checkProfileCreationSql(db,{owner,other,viewer,family});
  await checkJournalCorrectionsSql(db,{owner,other,viewer,family,child});
  await db.exec('reset role');
  for(const file of migrations.filter(x=>x>='202610020016'))await db.exec(readFileSync(new URL(file,folder),'utf8'));
  const {checkCheckedLearningProfileSql}=await import('./fixtures/checked-learning-profile-sql.mjs');
  await checkCheckedLearningProfileSql(db,{owner,other,viewer,family,child});
  const {checkLearningDirectionsSql}=await import('./fixtures/learning-directions-sql.mjs');
  await checkLearningDirectionsSql(db,{owner,other,viewer,family});
  const {checkFamilyUnderstandingSql}=await import('./fixtures/family-understanding-sql.mjs');
  await checkFamilyUnderstandingSql(db,{owner,other,viewer,family});
} finally { await db.close(); }
