-- Family-owned calendar, independent of a caregiver's device or database zone.
-- No backfill, rescheduling, activity approval or changes to existing notes.
begin;
create table public.family_calendar_settings (
  family_id uuid primary key references public.families(id) on delete cascade,
  time_zone text not null check(length(time_zone) between 1 and 100),
  revision integer not null check(revision > 0),
  updated_at timestamptz not null default now()
);
alter table public.family_calendar_settings enable row level security;
revoke all on public.family_calendar_settings from public,anon,authenticated;
grant select on public.family_calendar_settings to authenticated;
create policy "Members read family calendar" on public.family_calendar_settings
  for select to authenticated using(public.can_access_family(family_id));

create function public.family_today_internal(p_family_id uuid,p_at timestamptz default now())
returns date language sql stable security definer set search_path='' as $$
  select (p_at at time zone coalesce((select c.time_zone from public.family_calendar_settings c where c.family_id=p_family_id),'UTC'))::date;
$$;
create function public.child_today_internal(p_child_id uuid)
returns date language sql stable security definer set search_path='' as $$
  select public.family_today_internal(c.family_id) from public.children c where c.id=p_child_id;
$$;
revoke all on function public.family_today_internal(uuid,timestamptz) from public,anon,authenticated;
revoke all on function public.child_today_internal(uuid) from public,anon,authenticated;

create function public.get_family_calendar(p_family_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare c public.family_calendar_settings;
begin
  if not public.can_access_family(p_family_id) then raise exception 'Family access required'; end if;
  select * into c from public.family_calendar_settings where family_id=p_family_id;
  return jsonb_build_object('timeZone',c.time_zone,'revision',coalesce(c.revision,0),
    'today',public.family_today_internal(p_family_id));
end;
$$;
revoke all on function public.get_family_calendar(uuid) from public,anon,authenticated;
grant execute on function public.get_family_calendar(uuid) to authenticated;

create function public.set_family_time_zone(p_family_id uuid,p_expected_revision integer,p_time_zone text)
returns integer language plpgsql security definer set search_path='' as $$
declare c public.family_calendar_settings; next_revision integer;
begin
  if not exists(select 1 from public.family_members where family_id=p_family_id and user_id=auth.uid() and role='owner') then
    raise exception 'Family owner access required';
  end if;
  if p_time_zone is null or length(p_time_zone)>100 or
    (p_time_zone<>'UTC' and (position('/' in p_time_zone)=0 or p_time_zone like 'posix/%' or p_time_zone like 'right/%')) or
    not exists(select 1 from pg_catalog.pg_timezone_names where name=p_time_zone) then
    raise exception 'MIRA_INVALID_TIME_ZONE';
  end if;
  if p_expected_revision is null or p_expected_revision<0 then raise exception 'MIRA_STALE_FAMILY_CALENDAR'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_family_id::text,20012));
  select * into c from public.family_calendar_settings where family_id=p_family_id for update;
  if coalesce(c.revision,0)<>p_expected_revision then raise exception 'MIRA_STALE_FAMILY_CALENDAR'; end if;
  next_revision:=coalesce(c.revision,0)+1;
  insert into public.family_calendar_settings(family_id,time_zone,revision) values(p_family_id,p_time_zone,next_revision)
    on conflict(family_id) do update set time_zone=excluded.time_zone,revision=excluded.revision,updated_at=now();
  return next_revision;
end;
$$;
revoke all on function public.set_family_time_zone(uuid,integer,text) from public,anon,authenticated;
grant execute on function public.set_family_time_zone(uuid,integer,text) to authenticated;

-- Change only family-relative date decisions. Editorial review timestamps,
-- provider allowance windows and already-saved date-only values are unchanged.
do $$
declare signature text; definition text; expected integer; actual integer;
begin
  for signature,expected in select * from (values
    ('public.generate_weekly_plan_internal(uuid)',2),
    ('public.generate_next_week_plan_internal(uuid)',2),
    ('public.create_learning_moment_checked(uuid,uuid,date,text,text,text)',2),
    ('public.save_activity_context(uuid,uuid,integer,jsonb,integer,date,date,jsonb)',2),
    ('public.activity_context_block_reason_internal(uuid,uuid,date)',1),
    ('public.set_activity_saved(uuid,uuid,boolean)',1)
  ) x(signature,n) loop
    select pg_get_functiondef(signature::regprocedure) into definition;
    actual:=(length(definition)-length(replace(definition,'current_date','')))/length('current_date');
    if actual<>expected then raise exception 'MIRA_CALENDAR_MIGRATION_CHANGED: %',signature; end if;
    execute replace(definition,'current_date','public.child_today_internal(p_child_id)');
  end loop;
  select pg_get_functiondef('public.get_activity_use_check(uuid)'::regprocedure) into definition;
  if position('greatest(current_date,item.scheduled_date)' in definition)=0 then raise exception 'MIRA_CALENDAR_USE_CHECK_CHANGED'; end if;
  execute replace(definition,'greatest(current_date,item.scheduled_date)','greatest(public.child_today_internal(item.child_id),item.scheduled_date)');
  -- Omitted dates are resolved after authorization, not in the caller's session.
  foreach signature in array array['public.get_library_candidate_ids(uuid,date)','public.get_reviewed_library_context(uuid,date)','public.get_activity_context_options(uuid,date)'] loop
    select pg_get_functiondef(signature::regprocedure) into definition;
    if position('DEFAULT CURRENT_DATE' in definition)=0 or position('if p_on_date is null then raise exception ''Choose an activity date''; end if;' in definition)=0 then
      raise exception 'MIRA_CALENDAR_DEFAULT_CHANGED: %',signature;
    end if;
    definition:=replace(definition,'DEFAULT CURRENT_DATE','DEFAULT NULL::date');
    execute replace(definition,'if p_on_date is null then raise exception ''Choose an activity date''; end if;',
      'p_on_date:=coalesce(p_on_date,public.child_today_internal(p_child_id));');
  end loop;
end;
$$;
comment on table public.family_calendar_settings is 'Explicit shared family timezone. No row means UTC fallback, not an inferred location. Owner-only revision-checked RPC; saved plan dates and journal dates never shift.';
notify pgrst,'reload schema';
commit;
