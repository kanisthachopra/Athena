-- Review provenance, honest age precision, day-specific capacity and guarded
-- selection. No existing plan, instance, template or saved choice is rewritten.
-- No review records are seeded. Family roles cannot approve library content.
begin;

create table public.activity_template_reviews (
  template_id uuid not null references public.activity_templates(id) on delete restrict,
  content_version integer not null check (content_version > 0),
  template_snapshot jsonb not null check (jsonb_typeof(template_snapshot) = 'object'),
  reviewer_name text not null check (length(btrim(reviewer_name)) > 0),
  reviewer_qualifications text not null check (length(btrim(reviewer_qualifications)) > 0),
  reviewed_at timestamptz not null,
  review_due_on date not null,
  evidence_review text not null check (length(btrim(evidence_review)) > 0),
  safety_applicability_review text not null check (length(btrim(safety_applicability_review)) > 0),
  language_review text not null check (length(btrim(language_review)) > 0),
  rights_review text not null check (length(btrim(rights_review)) > 0),
  primary key(template_id,content_version),
  check (review_due_on >= reviewed_at::date)
);
alter table public.activity_template_reviews enable row level security;
revoke all on public.activity_template_reviews from public, anon, authenticated;
comment on table public.activity_template_reviews is
  'Internal editorial evidence, not family approval. Empty until an independently reviewed exact version is imported. Record fields alone do not verify qualifications or establish clinical validity.';

-- A reason code is null only when these baseline checks pass. Resource,
-- readiness and supervision context need their own checks before pilot release.
create function public.activity_candidate_block_reason_internal(
  p_child_id uuid, p_template_id uuid, p_on_date date
) returns text language plpgsql stable security definer set search_path = '' as $$
declare
  child public.children%rowtype;
  item public.activity_templates%rowtype;
  preferences public.family_preferences%rowtype;
  upper_months integer;
  lower_months integer;
  available_minutes integer;
begin
  if p_on_date is null then return 'MIRA_INVALID_ACTIVITY_DATE'; end if;
  select * into child from public.children where id = p_child_id and archived_at is null;
  if child.id is null then return 'MIRA_CHILD_UNAVAILABLE'; end if;
  select * into item from public.activity_templates where id = p_template_id;
  if item.id is null or not item.reviewed or item.review_status <> 'expert_reviewed' then
    return 'MIRA_TEMPLATE_NOT_REVIEWED';
  end if;
  if not exists (
    select 1 from public.activity_template_reviews r
    where r.template_id = item.id and r.content_version = item.content_version
      and r.template_snapshot = to_jsonb(item)
      and r.reviewed_at <= now() and r.review_due_on >= p_on_date
  ) then return 'MIRA_REVIEW_MISSING_OR_STALE'; end if;
  -- Month/year describes a range, not a birthday on day one.
  upper_months := (extract(year from p_on_date)::integer - child.birth_year) * 12
    + extract(month from p_on_date)::integer - child.birth_month;
  lower_months := greatest(0, upper_months - 1);
  if child.birth_month not between 1 and 12 or upper_months < 0 or upper_months >= 84
    or lower_months < item.min_age_months or upper_months > item.max_age_months then
    return 'MIRA_AGE_OUTSIDE_REVIEWED_RANGE';
  end if;
  select * into preferences from public.family_preferences where family_id = child.family_id;
  available_minutes := case when extract(isodow from p_on_date) in (6,7)
    then preferences.weekend_minutes else preferences.weekday_minutes end;
  if available_minutes is null or preferences.screen_policy is null then return 'MIRA_MISSING_PLANNING_CONTEXT'; end if;
  if item.duration_minutes < 0 or item.setup_minutes < 0
    or item.duration_minutes + item.setup_minutes > available_minutes then return 'MIRA_TIME_BUDGET_EXCEEDED'; end if;
  if preferences.screen_policy <> 'no_preference' and item.screen_requirement = 'required' then return 'MIRA_SCREEN_PREFERENCE'; end if;
  return null;
end;
$$;
revoke all on function public.activity_candidate_block_reason_internal(uuid,uuid,date) from public,anon,authenticated;

create function public.get_library_candidate_ids(p_child_id uuid, p_on_date date default current_date)
returns table(template_id uuid, template_snapshot jsonb) language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.can_access_child(p_child_id) then raise exception 'Family access required'; end if;
  if p_on_date is null then raise exception 'Choose an activity date'; end if;
  return query select t.id, to_jsonb(t) from public.activity_templates t
    where public.activity_candidate_block_reason_internal(p_child_id,t.id,p_on_date) is null;
end;
$$;
revoke all on function public.get_library_candidate_ids(uuid,date) from public,anon,authenticated;
grant execute on function public.get_library_candidate_ids(uuid,date) to authenticated;

-- Deferred validation evaluates the final row, not the temporary date used by
-- an occupied-day swap. Status/observation-only edits of old plans remain usable.
create function public.guard_activity_candidate_internal()
returns trigger language plpgsql security definer set search_path = '' as $$
declare current_item public.activity_instances%rowtype; reason text;
begin
  if tg_op = 'UPDATE' and new.template_id is not distinct from old.template_id
    and new.child_id is not distinct from old.child_id
    and new.scheduled_date is not distinct from old.scheduled_date then return null; end if;
  select * into current_item from public.activity_instances where id = new.id;
  if current_item.id is null or current_item.template_id is null then return null; end if;
  reason := public.activity_candidate_block_reason_internal(current_item.child_id,current_item.template_id,current_item.scheduled_date);
  if reason is not null then raise exception '%', reason; end if;
  return null;
end;
$$;
revoke all on function public.guard_activity_candidate_internal() from public,anon,authenticated;
create constraint trigger activity_candidate_guard
  after insert or update on public.activity_instances deferrable initially deferred
  for each row execute function public.guard_activity_candidate_internal();

create or replace function public.populate_weekly_portfolio_internal(
  p_plan_id uuid, p_child_id uuid, p_week_start date, p_previous_plan_id uuid default null
) returns void language plpgsql security definer set search_path = '' as $$
declare
  desired_type text;
  chosen public.activity_templates%rowtype;
  slot_index integer;
  target_date date;
begin
  if not public.can_edit_child(p_child_id) then raise exception 'Caregiver access required'; end if;
  perform id from public.plans where id=p_plan_id and child_id=p_child_id and week_start=p_week_start for update;
  if not found then raise exception 'Plan context changed'; end if;
  if exists(select 1 from public.activity_instances where plan_id=p_plan_id) then raise exception 'Existing plan is preserved'; end if;
  for slot_index in 0..6 loop
    target_date := p_week_start + slot_index;
    desired_type := (array['embedded','intentional','open','language','embedded','intentional','open'])[slot_index+1];
    chosen := null;
    if desired_type <> 'open' then
      select t.* into chosen from public.activity_templates t
      where public.activity_candidate_block_reason_internal(p_child_id,t.id,target_date) is null
        and not exists(select 1 from public.activity_instances x where x.plan_id=p_plan_id and x.template_id=t.id)
        and ((desired_type in ('embedded','intentional') and t.experience_type=desired_type)
          or (desired_type='language' and (t.domain='language' or exists(
            select 1 from public.activity_template_tracks tt where tt.template_id=t.id and tt.track_code='languages'))))
      order by
        (select count(*) from public.activity_instances recent
          where recent.child_id=p_child_id and recent.template_id=t.id
            and recent.scheduled_date >= target_date-28 and recent.scheduled_date < target_date),
        coalesce((select sum(case o.engagement when 'high' then 3 when 'medium' then 1 when 'low' then -1 else 0 end
          + case when o.repeated then 2 else 0 end)
          from public.observations o join public.activity_instances oi on oi.id=o.activity_instance_id
          join public.activity_templates ot on ot.id=oi.template_id
          where o.child_id=p_child_id and ot.domain=t.domain and o.created_at>=now()-interval '90 days'),0) desc,
        t.setup_minutes, t.duration_minutes, t.slug
      limit 1;
    end if;
    if chosen.id is not null then
      insert into public.activity_instances(plan_id,child_id,template_id,scheduled_date,personalized_title,
        personalized_instructions,selection_reason,opportunity_type,estimated_parent_minutes,is_optional)
      values(p_plan_id,p_child_id,chosen.id,target_date,chosen.title,chosen.instructions,
        'Selected from version-reviewed options within the saved age range, this day’s time and screen preferences. Recent use, recorded engagement and preparation effort order the options; they do not measure ability.',
        desired_type,chosen.setup_minutes,true);
    else
      insert into public.activity_instances(plan_id,child_id,template_id,scheduled_date,personalized_title,
        personalized_instructions,selection_reason,opportunity_type,estimated_parent_minutes,is_optional)
      values(p_plan_id,p_child_id,null,target_date,'Open space',
        'Nothing needs to be prepared. Leave room for rest, family life and the things your child chooses.',
        case when desired_type='open' then 'Time deliberately left open, not an activity to complete.'
          else 'No version-reviewed activity met the current age, day-specific time and screen checks. No substitute was invented.' end,
        'open',0,true);
    end if;
  end loop;
end;
$$;
revoke all on function public.populate_weekly_portfolio_internal(uuid,uuid,date,uuid) from public,anon,authenticated;

create or replace function public.replace_planned_activity_internal(p_instance_id uuid,p_template_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare target public.activity_instances%rowtype; replacement public.activity_templates%rowtype; target_plan uuid; reason text;
begin
  if not public.can_edit_activity_instance(p_instance_id) then raise exception 'Caregiver access required'; end if;
  select plan_id into target_plan from public.activity_instances where id=p_instance_id;
  perform id from public.plans where id=target_plan for update;
  select * into target from public.activity_instances where id=p_instance_id for update;
  if target.id is null or target.status <> 'planned' then raise exception 'Only planned activities can be replaced'; end if;
  if target.opportunity_type='open' then raise exception 'Protected open time is not an activity slot'; end if;
  reason := public.activity_candidate_block_reason_internal(target.child_id,p_template_id,target.scheduled_date);
  if reason is not null then raise exception '%',reason; end if;
  if exists(select 1 from public.activity_instances where plan_id=target.plan_id and template_id=p_template_id and id<>p_instance_id) then
    raise exception 'This activity is already in the selected week'; end if;
  select * into replacement from public.activity_templates where id=p_template_id;
  update public.activity_instances set template_id=replacement.id,personalized_title=replacement.title,
    personalized_instructions=replacement.instructions,
    opportunity_type=case when replacement.domain='language' then 'language' else replacement.experience_type end,
    estimated_parent_minutes=replacement.setup_minutes,
    selection_reason='Chosen by the caregiver from version-reviewed options within this day’s age, time and screen checks.'
  where id=p_instance_id;
end;
$$;
revoke all on function public.replace_planned_activity_internal(uuid,uuid) from public,anon,authenticated;

create or replace function public.set_activity_saved(p_child_id uuid,p_template_id uuid,p_saved boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare reason text;
begin
  if not public.can_edit_child(p_child_id) then raise exception 'Caregiver access required'; end if;
  if p_saved is null then raise exception 'Choose save or remove'; end if;
  -- Removing an old bookmark must remain possible after a retirement/age change.
  if not p_saved then
    delete from public.saved_activities where child_id=p_child_id and template_id=p_template_id;
    return;
  end if;
  reason := public.activity_candidate_block_reason_internal(p_child_id,p_template_id,current_date);
  if reason is not null then raise exception '%',reason; end if;
  insert into public.saved_activities(child_id,template_id,saved_by) values(p_child_id,p_template_id,auth.uid())
    on conflict(child_id,template_id) do nothing;
end;
$$;
revoke all on function public.set_activity_saved(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.set_activity_saved(uuid,uuid,boolean) to authenticated;

-- Guard the expected generation wrappers rather than silently changing an
-- unknown body. Retry must return an existing plan without rewriting metadata.
do $$
declare definition text; old_clause text; signature text;
begin
  foreach signature in array array['public.generate_weekly_plan_internal(uuid)','public.generate_next_week_plan_internal(uuid)'] loop
    select pg_get_functiondef(signature::regprocedure) into definition;
    definition := replace(definition,'''portfolio_deterministic_v2''','''reviewed_portfolio_v3''');
    if signature='public.generate_weekly_plan_internal(uuid)' then
      old_clause := 'on conflict (child_id, week_start) do update set status = ''active''';
    else
      old_clause := 'on conflict (child_id, week_start) do update set
    previous_plan_id = excluded.previous_plan_id,
    generation_method = excluded.generation_method,
    adaptation_summary = excluded.adaptation_summary,
    status = ''active''';
    end if;
    if position(old_clause in definition)=0 then raise exception 'MIRA_PLANNER_REVIEW_REQUIRED: unexpected generation wrapper'; end if;
    definition := replace(definition,old_clause,'on conflict (child_id, week_start) do nothing');
    definition := replace(definition,'returning id into new_plan_id;','returning id into new_plan_id;
  if new_plan_id is null then
    select id into new_plan_id from public.plans where child_id=p_child_id and week_start=' ||
      case when signature='public.generate_weekly_plan_internal(uuid)' then 'monday' else 'target_week' end || ';
    return new_plan_id;
  end if;');
    execute definition;
  end loop;
end;
$$;
revoke all on function public.generate_weekly_plan_internal(uuid) from public,anon,authenticated;
revoke all on function public.generate_next_week_plan_internal(uuid) from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
