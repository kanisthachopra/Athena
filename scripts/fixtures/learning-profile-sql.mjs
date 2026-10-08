import assert from 'node:assert/strict';

export async function checkLearningProfileSql(db,{other}) {
  await db.exec('reset role');
  const one=async(sql,args=[]) => (await db.query(sql,args)).rows[0];
  const login=async id=>db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);
  const owner=(await one("insert into auth.users(id,email) values(gen_random_uuid(),'profile-owner@example.invalid') returning id")).id;
  const viewer=(await one("insert into auth.users(id,email) values(gen_random_uuid(),'profile-viewer@example.invalid') returning id")).id;
  const plans=(await db.query('select to_jsonb(p) row from public.plans p order by id')).rows;
  const items=(await db.query('select to_jsonb(i) row from public.activity_instances i order by id')).rows;
  const family=(await one("insert into public.families(display_name) values('Synthetic profile identity test') returning id")).id;
  await db.query("insert into public.family_members(family_id,user_id,role) values($1,$2,'owner'),($1,$3,'viewer')",[family,owner,viewer]);
  const child=(await one("insert into public.children(family_id,nickname,birth_year,birth_month) values($1,'Synthetic profile child',2024,1) returning id",[family])).id;
  const secondChild=(await one("insert into public.children(family_id,nickname,birth_year,birth_month) values($1,'Synthetic sibling',2023,1) returning id",[family])).id;
  const args=[family,child,'minimal_child_screen','light',0,0,true,'किरण','Caregiver',['हिन्दी','English'],['Curiosity','Kindness'],['हिन्दी','English']];
  const save=(values=args)=>db.query('select public.configure_learning_profile($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',values);
  const snapshot=async()=>({
    caregivers:(await db.query('select * from public.caregivers where family_id=$1 order by created_at,id',[family])).rows,
    languages:(await db.query('select l.* from public.caregiver_languages l join public.caregivers c on c.id=l.caregiver_id where c.family_id=$1 order by l.id',[family])).rows,
    goals:(await db.query('select * from public.child_language_goals where child_id=$1 order by id',[child])).rows,
    hopes:(await db.query('select * from public.aspirations where child_id=$1 order by id',[child])).rows,
    preference:(await one('select * from public.family_preferences where family_id=$1',[family]))
  });
  await login(owner);await db.exec('set role authenticated');await save();
  let before=await snapshot();
  assert.equal(before.caregivers.length,1);assert.equal(before.languages.length,2);
  assert.ok(before.languages.every(l=>l.proficiency===null && l.proficiency_reported===false));
  assert.equal(before.preference.weekday_minutes,0);
  const primary=before.caregivers[0].id;
  await db.exec('reset role');
  const secondary=(await one("insert into public.caregivers(family_id,display_name,relationship,created_at) values($1,'Second adult','Relative',now()+interval '1 second') returning id",[family])).id;
  await db.query("insert into public.caregiver_languages(caregiver_id,language_code,proficiency,proficiency_reported) values($1,'தமிழ்','conversational',true)",[secondary]);
  await db.query("update public.caregiver_languages set proficiency='conversational',proficiency_reported=true where caregiver_id=$1 and language_code='english'",[primary]);
  await db.query("update public.child_language_goals set priority='low' where child_id=$1 and language_code='english'",[child]);
  await db.query("update public.aspirations set priority='medium' where child_id=$1 and title='Curiosity'",[child]);
  await db.query("insert into public.child_language_goals(child_id,language_code) values($1,'தமிழ்')",[secondChild]);
  const siblingBefore=(await db.query('select * from public.child_language_goals where child_id=$1',[secondChild])).rows;
  before=await snapshot();
  await db.exec('set role authenticated');await save();
  const after=await snapshot();
  for(const key of ['caregivers','languages','goals','hopes'])assert.deepEqual(after[key],before[key],key+' must retain IDs and metadata');
  const changed=[...args];changed[7]='Kiran';changed[9]=[' ENGLISH ','हिन्दी','english','العربية'];changed[10]=['curiosity','Kindness'];changed[11]=['English','हिन्दी','العربية'];
  await save(changed);
  const added=await snapshot();
  assert.equal(added.caregivers.find(c=>c.id===primary).display_name,'Kiran');
  assert.deepEqual(added.caregivers.find(c=>c.id===secondary),before.caregivers.find(c=>c.id===secondary));
  assert.equal(added.languages.filter(l=>l.caregiver_id===primary).length,3);
  assert.equal(added.languages.find(l=>l.language_code==='العربية').proficiency,null);
  assert.equal(added.goals.find(g=>g.language_code==='english').id,before.goals.find(g=>g.language_code==='english').id);
  assert.equal(added.goals.find(g=>g.language_code==='english').priority,'low');
  assert.deepEqual(added.hopes,before.hopes);
  const removed=[...changed];removed[9]=['English'];removed[10]=['Curiosity'];removed[11]=['English'];
  await save(removed);
  const pruned=await snapshot();
  assert.equal(pruned.languages.filter(l=>l.caregiver_id===primary).length,1);
  assert.equal(pruned.languages.filter(l=>l.caregiver_id===secondary).length,1);
  assert.equal(pruned.goals.length,1);assert.equal(pruned.hopes.length,1);
  assert.deepEqual((await db.query('select * from public.child_language_goals where child_id=$1',[secondChild])).rows,siblingBefore);
  for(const [index,value] of [[2,null],[3,null],[4,null],[5,null],[6,null],[10,[null]],[11,[null]],[9,['x'.repeat(61)]],[7,'']]){
    const bad=[...removed];bad[index]=value;
    await assert.rejects(save(bad));assert.deepEqual(await snapshot(),pruned,'Invalid payload must roll back');
  }
  // Clearing both fields used to delete whichever caregiver sorted first on
  // every replay. The profile save must never serve as caregiver deletion.
  const blankName=[...removed];blankName[7]='';blankName[9]=[];
  for(let retry=0;retry<2;retry++){
    await assert.rejects(save(blankName),/Removing a caregiver requires a separate action/);
    assert.deepEqual(await snapshot(),pruned);
  }
  await login(viewer);await assert.rejects(save(),/Caregiver access required/);
  await login(other);await assert.rejects(save(),/Caregiver access required/);
  await login(owner);const mismatch=[...args];mismatch[0]='20000000-0000-4000-8000-000000000001';await assert.rejects(save(mismatch));
  await db.exec('reset role; set role anon');await assert.rejects(save(),e=>e.code==='42501');
  await db.exec('reset role');
  assert.deepEqual((await db.query('select to_jsonb(p) row from public.plans p order by id')).rows,plans);
  assert.deepEqual((await db.query('select to_jsonb(i) row from public.activity_instances i order by id')).rows,items);
  console.log('PASS profile SQL: stable caregiver/language/goal/hope identities and metadata, multilingual inputs, no assumed fluency, secondary caregivers/sibling goals preserved, explicit removals, null/invalid rollback, viewer/other/anonymous denial and unchanged plans. Local synthetic data only.');
}
