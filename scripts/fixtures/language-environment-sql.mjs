import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

export async function checkLanguageEnvironmentSql(db, { other }) {
  await db.exec('reset role');
  const api = {};
  new Function('exports', ts.transpileModule(readFileSync(new URL('../../lib/language-planning.ts', import.meta.url), 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(api);
  const one = async (sql, args = []) => (await db.query(sql, args)).rows[0];
  const login = async id => db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  const owner = (await one("insert into auth.users(id,email) values(gen_random_uuid(),'language-owner@example.invalid') returning id")).id;
  const viewer = (await one("insert into auth.users(id,email) values(gen_random_uuid(),'language-viewer@example.invalid') returning id")).id;
  const family = (await one("insert into public.families(display_name) values('Synthetic language environment') returning id")).id;
  const otherFamily = (await one("insert into public.families(display_name) values('Synthetic unrelated language family') returning id")).id;
  await db.query("insert into public.family_members(family_id,user_id,role) values($1,$2,'owner'),($1,$3,'viewer')", [family, owner, viewer]);
  const child = (await one("insert into public.children(family_id,nickname,birth_year,birth_month) values($1,'Synthetic language child',2024,1) returning id", [family])).id;
  const sibling = (await one("insert into public.children(family_id,nickname,birth_year,birth_month) values($1,'Synthetic language sibling',2023,1) returning id", [family])).id;
  const person = (await one("insert into public.caregivers(family_id,display_name) values($1,'Synthetic adult') returning id", [family])).id;
  const outsider = (await one("insert into public.caregivers(family_id,display_name) values($1,'Synthetic unrelated adult') returning id", [otherFamily])).id;
  const goal = (await one("insert into public.child_language_goals(child_id,language_code) values($1,'hi') returning id", [child])).id;
  const plans = (await db.query('select to_jsonb(p) row from public.plans p order by id')).rows;
  const items = (await db.query('select to_jsonb(i) row from public.activity_instances i order by id')).rows;
  const saved = () => one('select * from public.child_language_goals where id=$1', [goal]);
  const save = (revision, context, childId = child, goalId = goal) => one('select public.save_language_environment($1,$2,$3,$4::jsonb) revision', [childId, goalId, revision, context === null ? null : JSON.stringify(context)]);
  const empty = api.emptyLanguageEnvironment();
  const context = {...empty, role:'heritage', state:'active', oralGoal:'  साथ में बात करना  ', support:[{caregiverId:person,label:'अम्मा',comfort:'comfortable',contact:'occasional',contexts:['कहानी','وقت القصة']}]};
  await login(owner); await db.exec('set role authenticated');
  assert.equal((await save(0, empty)).revision, 1);
  assert.deepEqual((await saved()).environment, empty);
  const initial = await saved();
  assert.equal((await save(0, empty)).revision, 1);
  assert.deepEqual(await saved(), initial, 'retry must preserve date and revision');
  assert.equal((await save(1, {...empty,support:[]})).revision, 2);
  assert.deepEqual((await saved()).environment.support, []);
  assert.equal((await save(2, context)).revision, 3);
  const before = await saved();
  assert.equal(before.environment.oralGoal, context.oralGoal);
  assert.equal((await save(2, context)).revision, 3);
  await assert.rejects(save(0, context), /MIRA_LANGUAGE_STALE/);
  await assert.rejects(save(2, {...context,state:'paused'}), /MIRA_LANGUAGE_STALE/);
  await assert.rejects(save(3, context, sibling), /MIRA_LANGUAGE_NOT_FOUND/);
  await assert.rejects(save(3, context, child, '10000000-0000-4000-8000-000000000099'), /MIRA_LANGUAGE_NOT_FOUND/);
  await assert.rejects(save(null, context), /MIRA_LANGUAGE_INVALID/);
  for (const id of [outsider,'10000000-0000-4000-8000-000000000099']) {
    await assert.rejects(save(3, {...context,support:[{...context.support[0],caregiverId:id}]}), /MIRA_LANGUAGE_CAREGIVER_LINK/);
    assert.deepEqual(await saved(), before);
  }
  const mutations = [x=>x.role='native', x=>x.state='fluent', x=>x.schemaVersion=2, x=>delete x.oralGoal, x=>x.extra=true,
    x=>x.support={}, x=>x.support=[null], x=>x.support[0].label='', x=>x.support[0].label=null,
    x=>x.support[0].comfort='fluent', x=>x.support[0].contact='daily', x=>x.support[0].contexts=['Same',' same '],
    x=>x.support[0].contexts=[null], x=>x.support[0].contexts=['x'.repeat(121)], x=>x.support[0].caregiverId='bad',
    x=>x.support[0].extra=true, x=>x.support.push({...x.support[0]}), x=>x.support=Array(13).fill({...x.support[0],caregiverId:null}),
    x=>x.variety='x'.repeat(101), x=>x.oralGoal='x'.repeat(401), x=>x.literacyGoal=false,
    x=>x.support[0].label='\t\n\u00a0\ufeff', x=>x.support[0].contexts=['\u3000'], x=>x.variety='\r\n'];
  for (const mutate of mutations) {
    const invalid = structuredClone(context); mutate(invalid);
    assert.equal(api.parseLanguageEnvironment(invalid), null);
    await assert.rejects(save(3, invalid), /MIRA_LANGUAGE_INVALID/);
    assert.deepEqual(await saved(), before);
  }
  for (const invalid of [[],42,'Hindi',{}]) await assert.rejects(save(3, invalid), /MIRA_LANGUAGE_INVALID/);
  for (const sql of ['update public.child_language_goals set environment_revision=99 where id=$1', 'delete from public.child_language_goals where id=$1']) {
    await assert.rejects(db.query(sql,[goal]), e=>e.code==='42501');
  }
  await assert.rejects(db.query('select * from public.language_environment_caregivers'), e=>e.code==='42501');
  await assert.rejects(db.query('select public.valid_language_environment_internal($1::jsonb)',[JSON.stringify(context)]), e=>e.code==='42501');
  // Existing setup must roll back every earlier preference/hope change on removal.
  await assert.rejects(db.query("select public.configure_learning_profile($1,$2,'minimal_child_screen','light',0,0,true,'New name',null,'{}',array['New hope'],'{}')",[family,child]), /MIRA_LANGUAGE_CLEAR_CONTEXT_FIRST/);
  assert.equal((await one('select count(*)::int count from public.family_preferences where family_id=$1',[family])).count, 0);
  assert.equal((await one('select display_name from public.caregivers where id=$1',[person])).display_name, 'Synthetic adult');
  await db.query("select public.configure_learning_profile($1,$2,'minimal_child_screen','light',0,0,true,'Synthetic adult',null,'{}',array['Curiosity'],array['hi'])",[family,child]);
  assert.deepEqual(await saved(),before,'Retaining a goal through setup must preserve its context, revision and timestamp');
  await login(viewer);
  assert.deepEqual((await saved()).environment, context);
  await assert.rejects(save(3,null), /MIRA_LANGUAGE_ACCESS/);
  await login(other);
  assert.equal(await saved(), undefined);
  await assert.rejects(save(3,null), /MIRA_LANGUAGE_ACCESS/);
  await db.exec('reset role; set role anon');
  await assert.rejects(save(3,null), e=>e.code==='42501');
  await db.exec('reset role');
  await assert.rejects(db.query('delete from public.caregivers where id=$1',[person]), e=>e.code==='23503');
  await assert.rejects(db.query('update public.caregivers set id=gen_random_uuid() where id=$1',[person]), e=>e.code==='23503');
  await assert.rejects(db.query('update public.caregivers set family_id=$2 where id=$1',[person,otherFamily]), /MIRA_LANGUAGE_CAREGIVER_LINK/);
  await assert.rejects(db.query('update public.children set family_id=$2 where id=$1',[child,otherFamily]), /MIRA_LANGUAGE_IDENTITY/);
  await assert.rejects(db.query('update public.child_language_goals set child_id=$2 where id=$1',[goal,sibling]), /MIRA_LANGUAGE_IDENTITY/);
  await db.query('update public.children set archived_at=now() where id=$1',[child]);
  await login(owner); await db.exec('set role authenticated');
  await assert.rejects(save(3,null), /MIRA_LANGUAGE_ACCESS/);
  await db.exec('reset role'); await db.query('update public.children set archived_at=null where id=$1',[child]);
  await db.exec('set role authenticated');
  assert.equal((await save(3,null)).revision, 4);
  const cleared = await saved(); assert.equal(cleared.environment,null);
  assert.equal((await save(3,null)).revision, 4);
  assert.deepEqual(await saved(),cleared);
  await assert.rejects(save(3,context), /MIRA_LANGUAGE_STALE/);
  // Cleared links permit intentional deletion; re-add to exercise full cascade.
  await db.exec('reset role');
  assert.equal((await one('select count(*)::int count from public.language_environment_caregivers where goal_id=$1',[goal])).count,0);
  await db.exec('set role authenticated');
  assert.equal((await save(4,context)).revision,5);
  await db.exec('reset role');
  await db.query('delete from public.families where id=$1',[family]);
  assert.equal(await saved(),undefined);
  assert.equal((await one('select count(*)::int count from public.language_environment_caregivers where goal_id=$1',[goal])).count,0);
  assert.deepEqual((await db.query('select to_jsonb(p) row from public.plans p order by id')).rows,plans);
  assert.deepEqual((await db.query('select to_jsonb(i) row from public.activity_instances i order by id')).rows,items);
  console.log('PASS language environment SQL: exact parent reports/unknowns, revision-safe save/clear/retry, malformed/stale/cross-child/cross-family denial, legacy removal rollback, linked caregiver/child integrity, private helpers, role boundaries and family cascade. Existing plans unchanged; local synthetic fixtures only.');
}
