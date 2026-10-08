import assert from 'node:assert/strict';

export async function checkChildProfileSql(db,{owner,other,viewer,family,child}) {
  const one=async(sql,args=[])=>(await db.query(sql,args)).rows[0];
  const login=async id=>db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);
  const read=async()=>(await one('select to_jsonb(c) row from public.children c where id=$1',[child])).row;
  await db.exec('reset role'); await login(owner);
  const beforePlans=(await db.query('select to_jsonb(p) row from public.plans p order by id')).rows;
  const beforeItems=(await db.query('select to_jsonb(i) row from public.activity_instances i order by id')).rows;
  let saved=await read();
  const call=(version,name='Synthetic correction',year=2024,month=1)=>one('select public.update_child_profile_checked($1,$2,$3,$4,$5) result',[child,version,name,year,month]);
  await db.exec('set role authenticated');
  for(const person of [other,viewer]) {await login(person);await assert.rejects(call(saved.updated_at),/Caregiver access required/);}
  await login(owner);
  await assert.rejects(db.query('select public.update_child_profile($1,$2,2024,1)',[child,'Unchecked']),e=>e.code==='42501');
  await assert.rejects(db.query("update public.children set nickname='Direct' where id=$1",[child]),e=>e.code==='42501');
  await assert.rejects(db.query('select public.advance_child_profile_version_internal()'),e=>e.code==='42501');
  await assert.rejects(call(null),/MIRA_STALE_CHILD_PROFILE/);
  for(const [name,year,month] of [[null,2024,1],[' ',2024,1],['x'.repeat(61),2024,1],['Test',null,1],['Test',2024,null],['Test',2024,13]]) {
    await assert.rejects(call(saved.updated_at,name,year,month),/MIRA_INVALID/);
  }
  const today=(await one('select public.get_family_calendar($1) c',[family])).c.today;
  const y=Number(today.slice(0,4)),m=Number(today.slice(5,7));
  if(m<12)await assert.rejects(call(saved.updated_at,'Future',y,m+1),/MIRA_FUTURE_BIRTH_MONTH/);
  await assert.rejects(call(saved.updated_at,'Future year',y+1,1),/MIRA_INVALID_BIRTH_CONTEXT/);
  assert.deepEqual(await read(),saved);
  const first=await call(saved.updated_at,' बच्चा / طفل ',y,m);
  const changed=await read(); assert.equal(changed.nickname,'बच्चा / طفل');
  assert.equal(changed.birth_month,m); assert.equal(first.result.updatedAt,changed.updated_at);
  assert.notEqual(changed.updated_at,saved.updated_at);
  await assert.rejects(call(saved.updated_at),/MIRA_STALE_CHILD_PROFILE/);
  // Caregiver allowed; restore the original values without restoring their version.
  await db.exec('reset role');
  await db.query("update public.family_members set role='caregiver' where user_id=$1 and family_id=$2",[viewer,family]);
  await login(viewer);await db.exec('set role authenticated');
  await call(changed.updated_at,saved.nickname,saved.birth_year,saved.birth_month);
  saved=await read();
  await db.exec('reset role');await login(owner);
  await db.query("update public.family_members set role='viewer' where user_id=$1 and family_id=$2",[viewer,family]);
  await db.query('update public.children set archived_at=now() where id=$1',[child]);
  const archived=await read();
  await db.exec('set role authenticated');await assert.rejects(call(archived.updated_at),/MIRA_CHILD_NOT_ACTIVE/);
  await db.exec('reset role');await db.query('update public.children set archived_at=null where id=$1',[child]);
  await db.exec('set role authenticated');await assert.rejects(call(saved.updated_at),/MIRA_STALE_CHILD_PROFILE/);
  await db.exec('reset role; set role anon');await assert.rejects(call(saved.updated_at),e=>e.code==='42501');
  await db.exec('reset role');
  assert.deepEqual((await db.query('select to_jsonb(p) row from public.plans p order by id')).rows,beforePlans);
  assert.deepEqual((await db.query('select to_jsonb(i) row from public.activity_instances i order by id')).rows,beforeItems);
  console.log('PASS checked child profiles: family-day future-month validation, null/invalid input, exact timestamp versions, stale/ABA denial, owner/caregiver allowed, viewer/other/anonymous/unchecked/direct writes denied, archives respected, plans and activities unchanged. Local synthetic SQL only.');
}
