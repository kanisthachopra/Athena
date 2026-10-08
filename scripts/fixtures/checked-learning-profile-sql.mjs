import assert from 'node:assert/strict';
export async function checkCheckedLearningProfileSql(db,{owner,other,viewer,family,child}) {
  const one=async(sql,args=[])=>(await db.query(sql,args)).rows[0];
  const login=async id=>db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);
  await db.exec('reset role');
  const plans=(await db.query('select to_jsonb(p) row from public.plans p order by id')).rows;
  const items=(await db.query('select to_jsonb(i) row from public.activity_instances i order by id')).rows;
  const target=(await one("insert into public.children(family_id,nickname,birth_year,birth_month) values($1,'Synthetic checked setup',2024,1) returning id",[family])).id;
  await login(owner);await db.exec('set role authenticated');
  const read=async(id=target)=>(await one('select public.get_learning_profile_snapshot($1) value',[id])).value;
  let snapshot=await read();assert.equal(snapshot.childId,target);assert.equal(snapshot.familyId,family);assert.match(snapshot.version,/^[a-f0-9]{64}$/);
  const initialArgs=[family,target,snapshot.version,'minimal_child_screen','light',0,0,true,snapshot.initial.caregiverName||'Synthetic adult','Parent',[],['Curiosity'],[]];
  const save=(args=initialArgs)=>one('select public.configure_learning_profile_checked($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) value',args);
  const result=(await save()).value;assert.equal(typeof result.createdProfile,'boolean');assert.match(result.version,/^[a-f0-9]{64}$/);
  snapshot=await read();assert.equal(snapshot.version,result.version);assert.equal(snapshot.initial.weekday_minutes,0);assert.deepEqual(snapshot.initial.aspirations,['Curiosity']);
  await assert.rejects(save(),/MIRA_PROFILE_STALE/);
  for(const version of [null,'','not-a-version']) await assert.rejects(save([...initialArgs.slice(0,2),version,...initialArgs.slice(3)]),/MIRA_PROFILE_STALE/);
  assert.deepEqual(await read(),snapshot);
  const current=[...initialArgs];current[2]=snapshot.version;current[5]=20;
  await save(current);const newer=await read();assert.notEqual(newer.version,snapshot.version);assert.equal(newer.initial.weekday_minutes,20);
  await assert.rejects(save(current),/MIRA_PROFILE_STALE/);
  const back=[...initialArgs];back[2]=newer.version;await save(back);
  assert.notEqual((await read()).version,snapshot.version,'Change/restore still advances saved preference metadata');
  // Another child shares the same family preferences, so its save invalidates this form.
  const sibling=(await read(child));
  const siblingArgs=[...initialArgs];siblingArgs[1]=child;siblingArgs[2]=sibling.version;
  siblingArgs[8]=sibling.initial.caregiverName||'Synthetic adult';siblingArgs[10]=sibling.initial.caregiverLanguages;
  siblingArgs[11]=sibling.initial.aspirations.length?sibling.initial.aspirations:['Curiosity'];siblingArgs[12]=sibling.initial.languageGoals;
  const beforeSibling=await read();await save(siblingArgs);
  await assert.rejects(save([...initialArgs.slice(0,2),beforeSibling.version,...initialArgs.slice(3)]),/MIRA_PROFILE_STALE/);
  // An added language, changed language context, or newly cleared context cannot
  // silently disappear through an older setup form.
  const beforeLanguage=await read();
  const key=(await one('select gen_random_uuid() id')).id;
  const goal=(await one("select public.add_family_language($1,$2,'hi') id",[target,key])).id;
  await assert.rejects(save([...initialArgs.slice(0,2),beforeLanguage.version,...initialArgs.slice(3)]),/MIRA_PROFILE_STALE/);
  const afterLanguage=await read();assert.deepEqual(afterLanguage.initial.languageGoals,['hi']);
  await db.query('select public.save_language_environment($1,$2,0,null)',[target,goal]);
  await assert.rejects(save([...initialArgs.slice(0,2),afterLanguage.version,...initialArgs.slice(3)]),/MIRA_PROFILE_STALE/);
  const forty=[...initialArgs];forty[2]=(await read()).version;
  forty[12]=['hi',...Array.from({length:39},(_,i)=>`synthetic ${i}`)];
  await save(forty);
  const fortySnapshot=await read();assert.equal(fortySnapshot.initial.languageGoals.length,40);
  const retained=await one('select id,environment_revision from public.child_language_goals where child_id=$1 and language_code=$2',[target,'hi']);
  assert.equal(retained.id,goal);assert.equal(retained.environment_revision,1);
  await assert.rejects(save([...forty.slice(0,2),fortySnapshot.version,...forty.slice(3,12),[...forty[12],'extra']]),/forty child languages/);
  assert.deepEqual(await read(),fortySnapshot);
  // Versions cannot be moved between children, even within the same family.
  await assert.rejects(save([family,target,(await read(child)).version,...forty.slice(3)]),/MIRA_PROFILE_STALE/);
  // Positive caregiver access, followed by role revocation on a loaded form.
  await db.exec('reset role');
  await db.query("update public.family_members set role='caregiver' where family_id=$1 and user_id=$2",[family,viewer]);
  await login(viewer);await db.exec('set role authenticated');
  const caregiverBefore=await read();
  await save([family,target,caregiverBefore.version,...forty.slice(3)]);
  const caregiverAfter=await read();assert.notEqual(caregiverAfter.version,caregiverBefore.version);
  await db.exec('reset role');
  await db.query("update public.family_members set role='viewer' where family_id=$1 and user_id=$2",[family,viewer]);
  await db.exec('set role authenticated');
  await assert.rejects(save([family,target,caregiverAfter.version,...forty.slice(3)]),/Caregiver access required/);
  assert.deepEqual(await read(),caregiverAfter);
  // Archive/restore cannot revive an old form's version.
  await login(owner);const beforeArchive=await read();
  await db.exec('reset role');
  await db.query('update public.children set archived_at=now() where id=$1',[target]);
  await db.exec('set role authenticated');
  await assert.rejects(read(),/MIRA_PROFILE_NOT_FOUND/);
  await assert.rejects(save([family,target,beforeArchive.version,...forty.slice(3)]),/MIRA_PROFILE_NOT_FOUND/);
  await db.exec('reset role');
  await db.query('update public.children set archived_at=null where id=$1',[target]);
  await db.exec('set role authenticated');
  await assert.rejects(save([family,target,beforeArchive.version,...forty.slice(3)]),/MIRA_PROFILE_STALE/);
  const now=await read();
  const invalid=[...initialArgs];invalid[2]=now.version;invalid[5]=-1;await assert.rejects(save(invalid));assert.deepEqual(await read(),now);
  const otherVersion=[...initialArgs];otherVersion[2]=now.version;
  await login(viewer);assert.deepEqual(await read(),now);await assert.rejects(save(otherVersion),/Caregiver access required/);
  await login(other);await assert.rejects(read(),/Family access required/);await assert.rejects(save(otherVersion),/Caregiver access required/);
  await login(owner);
  await assert.rejects(db.query("select public.configure_learning_profile($1,$2,'minimal_child_screen','light',0,0,true,'Old',null,'{}',array['Curiosity'],'{}')",[family,target]),e=>e.code==='42501');
  await assert.rejects(db.query('select public.learning_profile_snapshot_internal($1)',[target]),e=>e.code==='42501');
  for(const table of ['family_preferences','caregivers','caregiver_languages','aspirations']) {
    const column=table==='family_preferences'?'family_id':'id';
    await assert.rejects(db.query(`delete from public.${table} where ${column}=$1`,[family]),e=>e.code==='42501');
  }
  await db.exec('reset role; set role anon');
  await assert.rejects(read(),e=>e.code==='42501');await assert.rejects(save(otherVersion),e=>e.code==='42501');
  await db.exec('reset role');
  assert.deepEqual((await db.query('select to_jsonb(p) row from public.plans p order by id')).rows,plans);
  assert.deepEqual((await db.query('select to_jsonb(i) row from public.activity_instances i order by id')).rows,items);
  console.log('PASS checked learning profile: coherent snapshot/version, strict stale/change-restore/cross-child rejection, shared preferences, language-add/clear invalidation, 40 languages with retained identity, rollback, caregiver save/revocation, archive/restore invalidation, read-only viewers, foreign/anonymous/legacy/direct/helper denial, and unchanged plans. Synthetic single-session SQL; not hosted contention proof.');
}
