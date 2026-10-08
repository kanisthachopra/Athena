import assert from 'node:assert/strict';

export async function checkFamilyUnderstandingSql(db,{owner,other,viewer,family}) {
  const one=async(sql,args=[])=>(await db.query(sql,args)).rows[0];
  const login=async id=>db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);
  await db.exec('reset role');await login(owner);
  const child=(await one("insert into public.children(family_id,nickname,birth_year,birth_month) values($1,'Synthetic understanding',2023,1) returning id",[family])).id;
  const hope=(await one("insert into public.aspirations(child_id,title) values($1,'قصص — हिंदी') returning id",[child])).id;
  const person=(await one("insert into public.caregivers(family_id,display_name,relationship) values($1,'Synthetic person','Family friend') returning id",[family])).id;
  const environment={schemaVersion:1,role:'heritage',state:'paused',variety:null,oralGoal:'Our own words',literacyGoal:null,support:[{caregiverId:person,label:'Synthetic person',comfort:null,contact:'occasional',contexts:['Shared stories']} ]};
  const goal=(await one("insert into public.child_language_goals(child_id,language_code,environment,environment_revision,environment_updated_at) values($1,'hi',$2::jsonb,1,now()) returning id",[child,JSON.stringify(environment)])).id;
  const direction={horizon:'future',capabilities:[],tracks:['music']};
  await db.query('insert into public.aspiration_directions(aspiration_id,direction,revision,updated_by) values($1,$2::jsonb,1,$3)',[hope,JSON.stringify(direction),owner]);
  const capture=async()=>({plans:(await db.query('select to_jsonb(p) row from public.plans p order by id')).rows,items:(await db.query('select to_jsonb(i) row from public.activity_instances i order by id')).rows,hopes:(await db.query('select to_jsonb(a) row from public.aspirations a order by id')).rows});
  const before=await capture();
  const read=async()=> (await one('select public.get_family_understanding($1) value',[child])).value;
  await db.exec('set role authenticated');let result=await read();
  assert.equal(result.schemaVersion,1);assert.equal(result.childId,child);assert.equal(result.familyId,family);
  assert.equal(result.directions.hopes[0].title,'قصص — हिंदी');assert.deepEqual(result.directions.hopes[0].direction,direction);
  assert.deepEqual(result.languages.find(row=>row.id===goal).environment,environment);
  assert.ok(result.people.some(row=>row.id===person&&row.relationship==='Family friend'));
  assert.ok(result.hopeDates[0].directionUpdatedAt);assert.ok(result.childUpdatedAt);
  assert.ok(!Object.hasOwn(result,'observations'));assert.ok(!Object.hasOwn(result,'inferences'));
  assert.deepEqual(Object.keys(result.people.find(row=>row.id===person)).sort(),['createdAt','id','name','relationship']);
  const ownerRead=result;await login(viewer);assert.deepEqual(await read(),ownerRead);
  await login(other);await assert.rejects(read,/MIRA_UNDERSTANDING_ACCESS/);
  await login('');await db.exec('set role anon');await assert.rejects(read,/permission denied/);
  await db.exec('reset role');await login(owner);
  await db.query('update public.children set archived_at=now() where id=$1',[child]);
  await db.exec('set role authenticated');await assert.rejects(read,/MIRA_UNDERSTANDING_NOT_FOUND/);
  await db.exec('reset role');await db.query('update public.children set archived_at=null where id=$1',[child]);
  const fresh=(await one("insert into public.families(display_name) values('Synthetic unknown overview') returning id")).id;
  // Membership is temporarily rebound only in a rolled-back local transaction.
  await db.exec('begin');await db.query('update public.family_members set family_id=$1 where user_id=$2',[fresh,owner]);
  const freshChild=(await one("insert into public.children(family_id,nickname,birth_year,birth_month) values($1,'Unknown',2024,1) returning id",[fresh])).id;
  await db.exec('set role authenticated');result=(await one('select public.get_family_understanding($1) value',[freshChild])).value;
  assert.equal(result.profile.configured,false);assert.equal(result.preferencesUpdatedAt,null);assert.deepEqual(result.calendar,{timeZone:null,updatedAt:null});
  assert.deepEqual(result.languages,[]);assert.deepEqual(result.people,[]);assert.deepEqual(result.directions.hopes,[]);
  await db.exec('reset role; rollback');assert.deepEqual(await capture(),before);
  const permissions=await one("select has_function_privilege('anon','public.get_family_understanding(uuid)','execute') anon,has_function_privilege('authenticated','public.get_family_understanding(uuid)','execute') member,has_function_privilege('service_role','public.get_family_understanding(uuid)','execute') service");
  assert.deepEqual(permissions,{anon:false,member:true,service:false});
  console.log('PASS family understanding: coherent bound projection, exact multilingual choices, future/paused preserved, unknowns, current-member/viewer read, unrelated/anonymous/archived denial, minimized fields and unchanged existing plans. Local synthetic SQL only.');
}
