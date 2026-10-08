import assert from 'node:assert/strict';
export async function checkFamilyCalendarSql(db,{owner,other,viewer,family,child}) {
  const one=async(sql,args=[])=>(await db.query(sql,args)).rows[0];
  const login=async id=>db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);
  await db.exec("reset role; set time zone 'Pacific/Honolulu'"); await login(owner);
  const snapshot=async()=>({plans:(await db.query('select to_jsonb(p) row from public.plans p order by id')).rows,items:(await db.query('select to_jsonb(i) row from public.activity_instances i order by id')).rows});
  const before=await snapshot();
  const get=async()=>(await one('select public.get_family_calendar($1) c',[family])).c;
  const set=async(revision,zone)=>(await one('select public.set_family_time_zone($1,$2,$3) r',[family,revision,zone])).r;
  await db.exec("set time zone 'Pacific/Honolulu'; set role authenticated");
  assert.deepEqual(await get(),{timeZone:null,revision:0,today:(await one("select (now() at time zone 'UTC')::date::text d")).d});
  assert.equal(await set(0,'Asia/Kolkata'),1);
  assert.equal((await get()).today,(await one("select (now() at time zone 'Asia/Kolkata')::date::text d")).d);
  await assert.rejects(set(0,'Europe/London'),/MIRA_STALE_FAMILY_CALENDAR/);
  for(const zone of [null,'','IST','Not/A_Zone','posix/Asia/Kolkata',"UTC'; select 1; --",' Asia/Kolkata'])await assert.rejects(set(1,zone),/MIRA_INVALID_TIME_ZONE/);
  assert.equal((await get()).revision,1);
  await assert.rejects(db.query("update public.family_calendar_settings set time_zone='UTC' where family_id=$1",[family]),e=>e.code==='42501');
  await assert.rejects(db.query('select public.family_today_internal($1,now())',[family]),e=>e.code==='42501');
  await assert.rejects(db.query('select public.child_today_internal($1)',[child]),e=>e.code==='42501');
  await login(other); await assert.rejects(get(),/Family access required/); await assert.rejects(set(1,'UTC'),/owner access required/);
  assert.equal((await db.query('select * from public.family_calendar_settings where family_id=$1',[family])).rows.length,0);
  await login(viewer); assert.equal((await get()).timeZone,'Asia/Kolkata'); await assert.rejects(set(1,'UTC'),/owner access required/);
  await db.exec('reset role');
  // A caregiver can read but cannot change the shared household clock.
  await db.query("update public.family_members set role='caregiver' where family_id=$1 and user_id=$2",[family,viewer]);
  await db.exec('set role authenticated'); assert.equal((await get()).timeZone,'Asia/Kolkata'); await assert.rejects(set(1,'UTC'),/owner access required/);
  await db.exec('reset role'); await db.query("update public.family_members set role='viewer' where family_id=$1 and user_id=$2",[family,viewer]);
  await db.exec('set role anon'); await assert.rejects(get(),e=>e.code==='42501'); await assert.rejects(set(1,'UTC'),e=>e.code==='42501');
  await db.exec('reset role'); await login(owner);
  const at=async instant=>(await one('select public.family_today_internal($1,$2)::text d',[family,instant])).d;
  assert.equal(await at('2026-10-04T18:29:59Z'),'2026-10-04');
  assert.equal(await at('2026-10-04T18:30:00Z'),'2026-10-05');
  assert.equal(await at('2026-12-31T18:30:00Z'),'2027-01-01');
  assert.equal(await set(1,'America/New_York'),2);
  assert.equal(await at('2026-03-08T06:59:59Z'),'2026-03-08');
  assert.equal(await at('2026-03-08T07:00:00Z'),'2026-03-08');
  assert.equal(await at('2026-11-01T05:30:00Z'),'2026-11-01');
  assert.equal(await at('2026-11-01T06:30:00Z'),'2026-11-01');
  assert.equal(await at('2026-10-05T03:59:59Z'),'2026-10-04');
  assert.equal(await set(2,'Pacific/Kiritimati'),3);
  assert.equal(await at('2026-10-04T10:00:00Z'),'2026-10-05');
  assert.deepEqual(await snapshot(),before);
  // Exercise actual planning/journal entry functions, not just date formatting.
  const c=(await one("insert into public.children(family_id,nickname,birth_year,birth_month) values($1,'Synthetic calendar',2024,1) returning id",[family])).id;
  const today=(await get()).today;
  await db.exec('set role authenticated');
  for(const [rpc,offset] of [['generate_weekly_plan',0],['generate_next_week_plan',7]]) {
    const id=(await one(`select public.${rpc}($1) id`,[c])).id;
    const plan=await one('select week_start::text d from public.plans where id=$1',[id]);
    assert.equal(plan.d,(await one('select ($1::date-(extract(isodow from $1::date)::integer-1)+$2::integer)::text d',[today,offset])).d);
    assert.equal((await one(`select public.${rpc}($1) id`,[c])).id,id);
  }
  const request='90000000-0000-4000-8000-000000000012';
  const save=(date)=>one("select public.create_learning_moment_checked($1,$2,$3,'everyday','Calendar test','Synthetic note only') id",[request,c,date]);
  const moment=await save(today); assert.deepEqual(await save(today),moment);
  const tomorrow=(await one('select ($1::date+1)::text d',[today])).d;
  await assert.rejects(db.query("select public.create_learning_moment_checked(gen_random_uuid(),$1,$2,'everyday','Test','Synthetic note only')",[c,tomorrow]),/Choose a date within the past year/);
  for(const rpc of ['get_library_candidate_ids','get_reviewed_library_context','get_activity_context_options']) {
    assert.deepEqual((await db.query(`select * from public.${rpc}($1)`,[c])).rows,(await db.query(`select * from public.${rpc}($1,$2)`,[c,today])).rows);
  }
  await db.exec("reset role; set time zone 'UTC'");
  console.log('PASS family calendar SQL: explicit UTC fallback, owner/revision/tenant/direct-write boundaries, IANA validation, India midnight/year change, DST/International Date Line, new-week anchors, journal dates/retries, default library dates and unchanged existing plans. Local synthetic database only.');
}
