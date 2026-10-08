import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

export async function checkLanguageAddSql(db, {other}) {
  await db.exec('reset role');
  const one = async (sql,args=[]) => (await db.query(sql,args)).rows[0];
  const login = id => db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);
  const api={};new Function('exports',ts.transpileModule(readFileSync(new URL('../../lib/language-planning.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(api);
  const owner=(await one("insert into auth.users(id,email) values(gen_random_uuid(),'language-add-owner@example.invalid') returning id")).id;
  const viewer=(await one("insert into auth.users(id,email) values(gen_random_uuid(),'language-add-viewer@example.invalid') returning id")).id;
  const family=(await one("insert into public.families(display_name) values('Synthetic language selection') returning id")).id;
  await db.query("insert into public.family_members(family_id,user_id,role) values($1,$2,'owner'),($1,$3,'viewer')",[family,owner,viewer]);
  const child=(await one("insert into public.children(family_id,nickname,birth_year,birth_month) values($1,'Synthetic language selection',2024,1) returning id",[family])).id;
  const sibling=(await one("insert into public.children(family_id,nickname,birth_year,birth_month) values($1,'Synthetic sibling',2023,1) returning id",[family])).id;
  const plans=(await db.query('select to_jsonb(p) row from public.plans p order by id')).rows;
  const items=(await db.query('select to_jsonb(i) row from public.activity_instances i order by id')).rows;
  const add=async(code,key=randomUUID(),target=child)=>(await one('select public.add_family_language($1,$2,$3) id',[target,key,code])).id;
  const rows=()=>db.query('select * from public.child_language_goals where child_id=$1 order by id',[child]);
  await login(owner); await db.exec('set role authenticated');
  for(const bad of [null,'','English','EN',' en','xx']) await assert.rejects(add(bad),/MIRA_LANGUAGE_INVALID/);
  await assert.rejects(add('en',null),/MIRA_LANGUAGE_INVALID/);
  const request=randomUUID(), first=await add('en',request);
  const saved=(await rows()).rows;
  assert.deepEqual(saved[0].environment,api.emptyLanguageEnvironment());
  assert.equal(saved[0].environment_revision,0);assert.equal(saved[0].environment_updated_at,null);
  assert.equal(await add('en',request),first);
  assert.deepEqual((await rows()).rows,saved);
  await assert.rejects(add('hi',request),/MIRA_LANGUAGE_REQUEST_CHANGED/);
  await assert.rejects(add('en'),/MIRA_LANGUAGE_EXISTS/);
  // All 40 advertised codes actually persist; no inferred details or tasks.
  for(const [code] of api.planningLanguages.slice(1)) await add(code);
  assert.equal((await rows()).rows.length,40);
  const fullList=(await rows()).rows;
  await db.query("select public.configure_learning_profile($1,$2,'minimal_child_screen','light',0,0,true,null,null,'{}',array['Curiosity'],$3::text[])",[family,child,api.planningLanguages.map(([code])=>code)]);
  assert.deepEqual((await rows()).rows,fullList,'setup accepts all 40 retained goals without rewriting details');
  assert.equal(await add('en',request),first,'exact replay works when the list is full');
  await assert.rejects(db.query("select public.configure_learning_profile($1,$2,'minimal_child_screen','light',0,0,true,null,null,'{}',array['Curiosity'],$3::text[])",[family,child,[...api.planningLanguages.map(([code])=>code),'extra']]),/forty child languages/);
  const siblingGoal=await add('en',request,sibling);assert.notEqual(siblingGoal,first);
  await assert.rejects(db.query('select * from public.language_add_requests'),e=>e.code==='42501');
  await assert.rejects(db.query("insert into public.child_language_goals(child_id,language_code) values($1,'xx')",[child]),e=>e.code==='42501');
  await login(viewer);await assert.rejects(add('en',request),/MIRA_LANGUAGE_ACCESS/);
  await login(other);await assert.rejects(add('en',request),/MIRA_LANGUAGE_ACCESS/);
  await db.exec('reset role; set role anon');await assert.rejects(add('en',request),e=>e.code==='42501');
  await db.exec('reset role');await login(owner);
  await db.query('update public.children set archived_at=now() where id=$1',[child]);
  await db.exec('set role authenticated');await assert.rejects(add('en',request),/MIRA_LANGUAGE_ACCESS/);
  await db.exec('reset role');await db.query('update public.children set archived_at=null where id=$1',[child]);
  // A stale legacy setup cannot silently erase a newly added language.
  await db.exec('set role authenticated');
  await assert.rejects(db.query("select public.configure_learning_profile($1,$2,'minimal_child_screen','light',0,0,true,null,null,'{}',array['Curiosity'],'{}')",[family,child]),/MIRA_LANGUAGE_CLEAR_CONTEXT_FIRST/);
  assert.equal((await rows()).rows.length,40);
  // Explicitly cleared then removed entry must not reappear on delayed retry.
  await db.query('select public.save_language_environment($1,$2,0,null)',[child,first]);
  await db.exec('reset role');await db.query('delete from public.child_language_goals where id=$1',[first]);
  await db.exec('set role authenticated');await assert.rejects(add('en',request),/MIRA_LANGUAGE_REQUEST_RETIRED/);
  const replacement=await add('en');assert.notEqual(replacement,first);
  await assert.rejects(add('en',request),/MIRA_LANGUAGE_REQUEST_RETIRED/);
  // Only exact catalog names/codes are duplicates; no old value is rewritten.
  await db.exec('reset role');
  await db.query("insert into public.child_language_goals(child_id,language_code) values($1,' Hindi '),($1,'हिन्दी')",[sibling]);
  await db.exec('set role authenticated');await assert.rejects(add('hi',randomUUID(),sibling),/MIRA_LANGUAGE_EXISTS/);
  assert.deepEqual((await db.query("select language_code from public.child_language_goals where child_id=$1 order by language_code",[sibling])).rows.map(x=>x.language_code),[' Hindi ','en','हिन्दी']);
  await db.exec('reset role');
  await db.query("insert into public.child_language_goals(child_id,language_code) select $1,'synthetic legacy ' || i from generate_series(1,37) i",[sibling]);
  await db.exec('set role authenticated');
  await assert.rejects(add('fr',randomUUID(),sibling),/MIRA_LANGUAGE_LIST_FULL/);
  await db.exec('reset role');await db.query('delete from public.families where id=$1',[family]);
  assert.equal((await one('select count(*)::int n from public.language_add_requests where child_id in ($1,$2)',[child,sibling])).n,0);
  assert.deepEqual((await db.query('select to_jsonb(p) row from public.plans p order by id')).rows,plans);
  assert.deepEqual((await db.query('select to_jsonb(i) row from public.activity_instances i order by id')).rows,items);
  console.log('PASS language addition SQL: 40 catalog codes, exact retry, key/child/role binding, removal tombstone, duplicate legacy-name rejection without merges, stale setup protection, private receipts and cascade; plans unchanged. Local synthetic single-session tests only.');
}
