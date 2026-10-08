// Synthetic, in-memory SQL only. Never deletes or changes hosted family data.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
export async function checkJournalRetrySql(db,{owner,other,viewer,family,child}) {
  const one=async(sql,args=[])=>(await db.query(sql,args)).rows[0];
  const login=id=>db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);
  await db.exec('reset role');
  const plans=(await db.query('select to_jsonb(p) row from public.plans p order by id')).rows;
  const instances=(await db.query('select to_jsonb(i) row from public.activity_instances i order by id')).rows;
  const day=(await one('select current_date::text as day')).day;
  const sibling=(await one("insert into public.children(family_id,nickname,birth_year,birth_month) values($1,'Synthetic journal sibling',2024,1) returning id",[family])).id;
  const args=[randomUUID(),child,day,'everyday','  A moment  ','  再来一次\nمرحبا 🙂  '];
  const save=async(values=args)=>(await one('select public.create_learning_moment_checked($1,$2,$3,$4,$5,$6) id',values)).id;
  await db.exec('set role authenticated'); await login(owner);
  const first=await save();assert.equal(await save(),first);
  const row=await one('select * from public.learning_moments where id=$1',[first]);
  assert.equal(row.note,args[5]); assert.equal(row.title,'A moment');
  for(const [index,value] of [[1,sibling],[2,'2020-01-01'],[3,'language'],[4,'Different'],[5,args[5]+'!']]) {
    const changed=[...args];changed[index]=value;
    await assert.rejects(()=>save(changed),/MIRA_MOMENT_REQUEST_CHANGED/);
  }
  assert.equal(await save(),first);
  const second=await save([randomUUID(),...args.slice(1)]);assert.notEqual(second,first);
  for(const actor of [other,viewer]) { await login(actor); await assert.rejects(save,/Caregiver access required/); }
  await login(owner);
  for(const [index,value,pattern] of [[0,null,/REQUEST_REQUIRED/],[2,null,/past year/],[3,null,/valid learning/],[3,'invalid',/valid learning/],[4,' ',/title/],[5,' ',/note/],[5,'x'.repeat(1201),/note/]]) {
    const invalid=[randomUUID(),...args.slice(1)];invalid[index]=value;
    await assert.rejects(()=>save(invalid),pattern);
  }
  await assert.rejects(db.query('select * from public.learning_moment_requests'),e=>e.code==='42501');
  await assert.rejects(db.query('select public.create_learning_moment($1,$2,$3,$4,$5)',args.slice(1)),e=>e.code==='42501');
  await db.exec('reset role');
  assert.equal((await one('select count(*)::int n from public.learning_moment_requests')).n,2);
  await db.query("update public.family_members set role='viewer' where user_id=$1 and family_id=$2",[owner,family]);
  await db.exec('set role authenticated');await assert.rejects(save,/Caregiver access required/);
  await db.exec('reset role');await db.query("update public.family_members set role='owner' where user_id=$1 and family_id=$2",[owner,family]);
  await db.exec('set role authenticated');
  await db.query('select public.delete_learning_moment_checked($1,$2,(select updated_at from public.learning_moments where id=$1))',[first,child]);
  await assert.rejects(save,/MIRA_MOMENT_REMOVED/);
  await db.exec('reset role');
  assert.equal((await one('select moment_id from public.learning_moment_requests where request_id=$1',[args[0]])).moment_id,null);
  assert.equal((await one('select count(*)::int n from public.learning_moments where id=$1',[first])).n,0);
  assert.deepEqual((await db.query('select to_jsonb(p) row from public.plans p order by id')).rows,plans);
  assert.deepEqual((await db.query('select to_jsonb(i) row from public.activity_instances i order by id')).rows,instances);
  await db.exec('set role anon');await assert.rejects(save,e=>e.code==='42501');
  await assert.rejects(db.query('select * from public.learning_moment_requests'),e=>e.code==='42501');
  console.log('PASS journal SQL: exact replay, changed payload and child rejection, original multilingual whitespace, new-entry identity, validation rollback, removed-entry tombstone, current role checks, private receipts, old/anonymous RPC denial and unchanged plans. Local single-session evidence, not hosted concurrency proof.');
}
