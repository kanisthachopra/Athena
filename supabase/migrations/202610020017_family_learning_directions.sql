-- Explicit parent directions, separate from free-text hopes and child inferences.
-- No existing profile, plan, activity, review or publication is rewritten.
begin;
create table public.aspiration_directions (
  aspiration_id uuid primary key references public.aspirations(id) on delete cascade,
  direction jsonb,
  revision bigint not null check(revision>0),
  updated_at timestamptz not null default clock_timestamp(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.aspiration_directions enable row level security;
revoke all on public.aspiration_directions from public,anon,authenticated,service_role;

create function public.aspiration_directions_snapshot_internal(p_child_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
  with source as (
    select c.id child_id,c.updated_at child_version,
      coalesce((select jsonb_agg(jsonb_build_object('hope',to_jsonb(a),'saved',to_jsonb(d)) order by a.created_at,a.id)
        from public.aspirations a left join public.aspiration_directions d on d.aspiration_id=a.id
        where a.child_id=c.id),'[]'::jsonb) entries
    from public.children c where c.id=p_child_id and c.archived_at is null
  ) select jsonb_build_object('childId',child_id,
    'version',encode(sha256(convert_to(to_jsonb(source)::text,'UTF8')),'hex'),
    'hopes',coalesce((select jsonb_agg(jsonb_build_object('id',item#>>'{hope,id}',
      'title',item#>>'{hope,title}','direction',item#>'{saved,direction}'))
      from jsonb_array_elements(entries) item),'[]'::jsonb)) from source;
$$;
revoke all on function public.aspiration_directions_snapshot_internal(uuid) from public,anon,authenticated,service_role;

create function public.get_aspiration_directions(p_child_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  if auth.uid() is null or not public.can_access_child(p_child_id) then raise exception 'MIRA_DIRECTION_ACCESS'; end if;
  result:=public.aspiration_directions_snapshot_internal(p_child_id);
  if result is null then raise exception 'MIRA_DIRECTION_NOT_FOUND'; end if;
  return result;
end;
$$;
revoke all on function public.get_aspiration_directions(uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_aspiration_directions(uuid) to authenticated;

-- Export current parent choices even when a child is archived. No old drafts or
-- erased direction values are kept in this table.
create function public.export_aspiration_directions(p_child_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null or not public.can_access_child(p_child_id) then raise exception 'MIRA_DIRECTION_ACCESS'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('aspiration_id',a.id,'hope',a.title,
    'direction',d.direction,'revision',d.revision,'updated_at',d.updated_at) order by a.created_at,a.id)
    from public.aspirations a join public.aspiration_directions d on d.aspiration_id=a.id where a.child_id=p_child_id),'[]'::jsonb);
end;
$$;
revoke all on function public.export_aspiration_directions(uuid) from public,anon,authenticated,service_role;
grant execute on function public.export_aspiration_directions(uuid) to authenticated;

create function public.save_aspiration_direction(p_child_id uuid,p_aspiration_id uuid,p_expected_version text,p_direction jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare family uuid; prior jsonb; list jsonb; item jsonb; kind text;
begin
  select family_id into family from public.children where id=p_child_id and archived_at is null;
  if auth.uid() is null or family is null or not public.can_edit_family(family) then raise exception 'MIRA_DIRECTION_ACCESS'; end if;
  perform 1 from public.families where id=family for update;
  perform 1 from public.family_members where family_id=family and user_id=auth.uid() and role in ('owner','caregiver') for share;
  if not found then raise exception 'MIRA_DIRECTION_ACCESS'; end if;
  perform 1 from public.children where id=p_child_id and family_id=family and archived_at is null for share;
  if not found then raise exception 'MIRA_DIRECTION_NOT_FOUND'; end if;
  prior:=public.aspiration_directions_snapshot_internal(p_child_id);
  if p_expected_version is null or p_expected_version !~ '^[0-9a-f]{64}$' or p_expected_version<>prior->>'version' then raise exception 'MIRA_DIRECTION_STALE'; end if;
  perform 1 from public.aspirations where id=p_aspiration_id and child_id=p_child_id for share;
  if not found then raise exception 'MIRA_DIRECTION_NOT_FOUND'; end if;
  if p_direction is not null then
    if jsonb_typeof(p_direction) is distinct from 'object' then raise exception 'MIRA_DIRECTION_INVALID'; end if;
    if (select array_agg(k order by k) from jsonb_object_keys(p_direction) k) is distinct from array['capabilities','horizon','tracks']
      or coalesce(p_direction->>'horizon','') not in ('now','future','paused') then raise exception 'MIRA_DIRECTION_INVALID'; end if;
    foreach kind in array array['capabilities','tracks'] loop
      list:=p_direction->kind;
      if jsonb_typeof(list) is distinct from 'array' then raise exception 'MIRA_DIRECTION_INVALID'; end if;
      if jsonb_array_length(list)>(case when kind='capabilities' then 9 else 14 end)
        or (select count(distinct value) from jsonb_array_elements(list))<>jsonb_array_length(list) then raise exception 'MIRA_DIRECTION_INVALID'; end if;
      for item in select value from jsonb_array_elements(list) loop
        if jsonb_typeof(item) is distinct from 'string' then raise exception 'MIRA_DIRECTION_INVALID'; end if;
        if kind='capabilities' then
          if not exists(select 1 from public.core_capabilities where code=item#>>'{}') then raise exception 'MIRA_DIRECTION_INVALID'; end if;
        else
          if not exists(select 1 from public.enrichment_tracks where code=item#>>'{}') then raise exception 'MIRA_DIRECTION_INVALID'; end if;
        end if;
      end loop;
    end loop;
    if p_direction->>'horizon'='now' and jsonb_array_length(p_direction->'capabilities')+jsonb_array_length(p_direction->'tracks')=0 then raise exception 'MIRA_DIRECTION_CHOOSE_OPPORTUNITY'; end if;
  end if;
  insert into public.aspiration_directions(aspiration_id,direction,revision,updated_by)
    values(p_aspiration_id,p_direction,1,auth.uid())
    on conflict(aspiration_id) do update set direction=excluded.direction,
      revision=public.aspiration_directions.revision+1,updated_at=clock_timestamp(),updated_by=auth.uid();
  return public.aspiration_directions_snapshot_internal(p_child_id);
end;
$$;
revoke all on function public.save_aspiration_direction(uuid,uuid,text,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.save_aspiration_direction(uuid,uuid,text,jsonb) to authenticated;

-- The only matching input is an explicitly chosen current opportunity and an
-- association inside the exact reviewed template. Never search hope keywords,
-- infer aptitude, or use the old automatically seeded association tables.
create function public.match_family_direction_internal(p_snapshot jsonb,p_template jsonb)
returns jsonb language sql stable security definer set search_path='' as $$
  with hopes as (
    select value h,ordinality n from jsonb_array_elements(p_snapshot->'hopes') with ordinality
    where value#>>'{direction,horizon}'='now'
  ), associations as (
    select 'capabilities' kind,value->>'code' code from jsonb_array_elements(
      case when jsonb_typeof(p_template#>'{publication_context,associations,capabilities}')='array'
      then p_template#>'{publication_context,associations,capabilities}' else '[]'::jsonb end)
    union all
    select 'tracks',value->>'code' from jsonb_array_elements(
      case when jsonb_typeof(p_template#>'{publication_context,associations,tracks}')='array'
      then p_template#>'{publication_context,associations,tracks}' else '[]'::jsonb end)
  ), labels as (
    select 'capabilities' kind,code,name,display_order from public.core_capabilities
    union all select 'tracks',code,name,display_order from public.enrichment_tracks
  ) select jsonb_build_object('hopeId',h->>'id','hope',h->>'title','kind',a.kind,'code',a.code,'label',l.name)
    from hopes join associations a on (h->'direction'->a.kind) ? a.code
    join labels l on l.kind=a.kind and l.code=a.code
    where p_template#>>'{publication_context,schema_version}'='1'
    order by n,a.kind,l.display_order,a.code limit 1;
$$;
revoke all on function public.match_family_direction_internal(jsonb,jsonb) from public,anon,authenticated,service_role;

-- A stale setup form must not delete a hope linked after the form was opened.
do $$ declare definition text; expected text := 'select jsonb_agg(to_jsonb(a) order by a.created_at,a.id) from public.aspirations a where a.child_id=c.id'; begin
  select pg_get_functiondef('public.learning_profile_snapshot_internal(uuid)'::regprocedure) into definition;
  if position(expected in definition)=0 then raise exception 'MIRA_PROFILE_SNAPSHOT_REVIEW_REQUIRED'; end if;
  execute replace(definition,expected,
    'select jsonb_agg(to_jsonb(a)||jsonb_build_object(''direction_state'',(select to_jsonb(d) from public.aspiration_directions d where d.aspiration_id=a.id)) order by a.created_at,a.id) from public.aspirations a where a.child_id=c.id');
end; $$;
revoke all on function public.learning_profile_snapshot_internal(uuid) from public,anon,authenticated,service_role;

create or replace function public.populate_weekly_portfolio_internal(
  p_plan_id uuid, p_child_id uuid, p_week_start date, p_previous_plan_id uuid default null
) returns void language plpgsql security definer set search_path = '' as $$
declare
  desired_type text;
  chosen record;
  slot_index integer;
  target_date date;
  direction_snapshot jsonb;
  family uuid;
begin
  if not public.can_edit_child(p_child_id) then raise exception 'Caregiver access required'; end if;
  select family_id into family from public.children where id=p_child_id;
  perform 1 from public.families where id=family for update;
  direction_snapshot:=public.aspiration_directions_snapshot_internal(p_child_id);
  perform id from public.plans where id=p_plan_id and child_id=p_child_id and week_start=p_week_start for update;
  if not found then raise exception 'Plan context changed'; end if;
  if exists(select 1 from public.activity_instances where plan_id=p_plan_id) then raise exception 'Existing plan is preserved'; end if;
  for slot_index in 0..6 loop
    target_date := p_week_start + slot_index;
    -- Preserve two open days and at most one option on the other days. The old
    -- Thursday language quota becomes a flexible slot, not another language task.
    desired_type := (array['embedded','intentional','open','flexible','embedded','intentional','open'])[slot_index+1];
    chosen := null;
    if desired_type <> 'open' then
      select t.*, pd.match as family_direction,
        (select count(*) from public.activity_instances x
          join public.activity_templates xt on xt.id=x.template_id
          where x.plan_id=p_plan_id and xt.domain=t.domain) as portfolio_domain_count,
        coalesce(feedback.engagement='high' and feedback.repeated=true,false) as repeat_supported
      into chosen
      from public.activity_templates t
      left join lateral (select public.match_family_direction_internal(direction_snapshot,to_jsonb(t)) as match) pd on true
      -- Only the latest report about this exact version can support repetition.
      -- No report about one template becomes a preference for its whole domain.
      left join lateral (
        select o.engagement,o.repeated from public.observations o
        join public.activity_instances oi on oi.id=o.activity_instance_id
        where o.child_id=p_child_id and oi.child_id=p_child_id and oi.template_id=t.id
          and oi.content_snapshot->'template'=to_jsonb(t)
          and oi.scheduled_date<target_date and oi.scheduled_date>=target_date-28
          and o.created_at<=now()
        order by oi.scheduled_date desc,o.created_at desc,o.id limit 1
      ) feedback on true
      where public.activity_candidate_block_reason_internal(p_child_id,t.id,target_date) is null
        and not exists(select 1 from public.activity_instances x where x.plan_id=p_plan_id and x.template_id=t.id)
        and (desired_type='flexible' or t.experience_type=desired_type)
      order by portfolio_domain_count,
        (pd.match is not null) desc,
        repeat_supported desc,
        (select count(*) from public.activity_instances recent
          where recent.child_id=p_child_id and recent.template_id=t.id
            and recent.scheduled_date>=target_date-28 and recent.scheduled_date<target_date),
        t.setup_minutes,t.duration_minutes,t.slug,t.id
      limit 1;
      if found then
        insert into public.activity_instances(plan_id,child_id,template_id,scheduled_date,personalized_title,
          personalized_instructions,selection_reason,opportunity_type,estimated_parent_minutes,is_optional)
        values(p_plan_id,p_child_id,chosen.id,target_date,chosen.title,chosen.instructions,
          'Passed the current exact-version review, age, day-specific time, screen and required family context checks. '
          || case when chosen.portfolio_domain_count=0 then 'Adds an area not yet selected in this week. '
            else 'This area already appears in the week; fewer eligible alternatives were available at this step. ' end
          || case when chosen.family_direction is not null then
            'Current family direction: “'||(chosen.family_direction->>'hope')||'” — '||(chosen.family_direction->>'label')||'. '
            else 'No current parent-chosen opportunity link matched this reviewed activity version. ' end
          || case when chosen.repeat_supported then 'Your latest recent report for this version recorded high engagement and repetition. '
            else 'No recent report of both high engagement and repetition for this version was used. ' end
          || 'Among eligible options, the order favours less-represented areas, current family directions, reported repetition, less recent use, then lower preparation and duration. These are planning heuristics, not an assessment of your child.',
          chosen.experience_type,chosen.setup_minutes,true);
        continue;
      end if;
    end if;
    insert into public.activity_instances(plan_id,child_id,template_id,scheduled_date,personalized_title,
      personalized_instructions,selection_reason,opportunity_type,estimated_parent_minutes,is_optional)
    values(p_plan_id,p_child_id,null,target_date,'Open space',
      'Nothing needs to be prepared. Leave room for rest, family life and the things your child chooses.',
      case when desired_type='open' then 'Time deliberately left open, not an activity to complete.'
        else 'No additional distinct reviewed option of this experience type passed all current eligibility checks, including required family context. No substitute was invented.' end,
      'open',0,true);
  end loop;
end;
$$;
revoke all on function public.populate_weekly_portfolio_internal(uuid,uuid,date,uuid) from public,anon,authenticated;

create or replace function public.record_new_plan_selection_internal(p_plan_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare selected_count integer;
begin
  select count(*)::integer into selected_count from public.activity_instances
    where plan_id=p_plan_id and template_id is not null;
  update public.plans set adaptation_summary=case when selected_count=0
    then 'No reviewed activity met the current selection checks. This week is left open; no substitute was invented.'
    else 'Eligible options were ordered for variety within this week, explicit current family directions, recent reports about the exact activity version, recent use and preparation effort. Future or paused hopes do not add tasks. Two days are deliberately open; every option is optional. No separate language task or daily domain quota was imposed. This is not an assessment of ability or a complete picture of family life.'
    end where id=p_plan_id;
end;
$$;
revoke all on function public.record_new_plan_selection_internal(uuid) from public,anon,authenticated;


do $$ declare definition text; signature text; begin
  foreach signature in array array['public.generate_weekly_plan_internal(uuid)','public.generate_next_week_plan_internal(uuid)'] loop
    select pg_get_functiondef(signature::regprocedure) into definition;
    if position('''reviewed_portfolio_v4''' in definition)=0 then raise exception 'MIRA_PLANNER_REVIEW_REQUIRED'; end if;
    execute replace(definition,'''reviewed_portfolio_v4''','''reviewed_portfolio_v5''');
  end loop;
end; $$;
revoke all on function public.generate_weekly_plan_internal(uuid),public.generate_next_week_plan_internal(uuid) from public,anon,authenticated,service_role;
comment on table public.aspiration_directions is 'Optional parent-chosen opportunity links for saved hopes. No inferred abilities or deadlines. Future/paused choices do not influence ranking; clear retains revision metadata, not the prior direction. Existing plan explanations remain historical records.';
notify pgrst,'reload schema';
commit;
