-- New selections need a review valid today AND on the scheduled day.
-- Week identity is stable; every new date assignment stays in that week.
-- No existing plan, activity, review or observation is rewritten.
begin;

do $$
declare definition text; old_check text := 'r.reviewed_at <= now() and r.review_due_on >= p_on_date';
begin
  select pg_get_functiondef('public.activity_candidate_block_reason_internal(uuid,uuid,date)'::regprocedure)
    into definition;
  if position(old_check in definition)=0 then
    raise exception 'MIRA_PLANNER_REVIEW_REQUIRED: unexpected eligibility helper';
  end if;
  execute replace(definition,old_check,
    'r.reviewed_at <= now() and r.review_due_on >= greatest(p_on_date,current_date)');
end;
$$;
revoke all on function public.activity_candidate_block_reason_internal(uuid,uuid,date) from public,anon,authenticated;

-- An instance date is interpreted relative to its original plan. Changing that
-- anchor behind an open screen would invalidate its selection/move checks.
create function public.guard_plan_identity_internal()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.id is distinct from old.id or new.child_id is distinct from old.child_id
    or new.week_start is distinct from old.week_start then
    raise exception 'MIRA_PLAN_IDENTITY_IMMUTABLE';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_plan_identity_internal() from public,anon,authenticated;
create trigger plan_identity_guard before update on public.plans
  for each row execute function public.guard_plan_identity_internal();

-- Validate final state, allowing the temporary out-of-week date used within a
-- transactional swap. Include open days and changes to the linked plan.
create or replace function public.guard_activity_candidate_internal()
returns trigger language plpgsql security definer set search_path = '' as $$
declare current_item public.activity_instances%rowtype; week_start date; reason text;
begin
  if tg_op = 'UPDATE' and new.template_id is not distinct from old.template_id
    and new.child_id is not distinct from old.child_id
    and new.plan_id is not distinct from old.plan_id
    and new.scheduled_date is not distinct from old.scheduled_date then return null; end if;
  select * into current_item from public.activity_instances where id=new.id;
  if current_item.id is null then return null; end if;
  select p.week_start into week_start from public.plans p
    where p.id=current_item.plan_id and p.child_id=current_item.child_id;
  if week_start is null then raise exception 'MIRA_PLAN_CONTEXT_INVALID'; end if;
  if current_item.scheduled_date < week_start or current_item.scheduled_date > week_start+6 then
    raise exception 'MIRA_ACTIVITY_OUTSIDE_WEEK';
  end if;
  if current_item.template_id is null then return null; end if;
  reason := public.activity_candidate_block_reason_internal(current_item.child_id,current_item.template_id,current_item.scheduled_date);
  if reason is not null then raise exception '%',reason; end if;
  return null;
end;
$$;
revoke all on function public.guard_activity_candidate_internal() from public,anon,authenticated;

-- Persist a faithful summary only when creating a NEW plan. A retry returns the
-- existing ID without resetting status, summary, instances or observations.
create function public.record_new_plan_selection_internal(p_plan_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare selected_count integer;
begin
  select count(*)::integer into selected_count from public.activity_instances
    where plan_id=p_plan_id and template_id is not null;
  update public.plans set adaptation_summary=case when selected_count=0
    then 'No reviewed activity met the current selection checks. This week is left open; no substitute was invented.'
    else 'Options were checked against exact-version review records, age range, each day''s time and screen preferences. Recent use, recorded engagement and preparation effort ordered eligible options; this is not a measure of ability.'
    end where id=p_plan_id;
end;
$$;
revoke all on function public.record_new_plan_selection_internal(uuid) from public,anon,authenticated;

create or replace function public.generate_weekly_plan_internal(p_child_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare new_plan_id uuid; monday date := current_date-(extract(isodow from current_date)::integer-1);
begin
  if not public.can_edit_child(p_child_id) then raise exception 'Caregiver access required'; end if;
  insert into public.plans(child_id,week_start,generation_method,adaptation_summary)
    values(p_child_id,monday,'reviewed_portfolio_v3','Selection is being checked.')
    on conflict(child_id,week_start) do nothing returning id into new_plan_id;
  if new_plan_id is null then
    select id into new_plan_id from public.plans where child_id=p_child_id and week_start=monday;
    return new_plan_id;
  end if;
  perform public.populate_weekly_portfolio_internal(new_plan_id,p_child_id,monday,null);
  perform public.record_new_plan_selection_internal(new_plan_id);
  return new_plan_id;
end;
$$;

create or replace function public.generate_next_week_plan_internal(p_child_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  new_plan_id uuid; previous_id uuid;
  monday date := current_date-(extract(isodow from current_date)::integer-1);
  target_week date := monday+7;
begin
  if not public.can_edit_child(p_child_id) then raise exception 'Caregiver access required'; end if;
  select id into previous_id from public.plans where child_id=p_child_id and week_start<=monday
    order by week_start desc limit 1;
  insert into public.plans(child_id,week_start,previous_plan_id,generation_method,adaptation_summary)
    values(p_child_id,target_week,previous_id,'reviewed_portfolio_v3','Selection is being checked.')
    on conflict(child_id,week_start) do nothing returning id into new_plan_id;
  if new_plan_id is null then
    select id into new_plan_id from public.plans where child_id=p_child_id and week_start=target_week;
    return new_plan_id;
  end if;
  perform public.populate_weekly_portfolio_internal(new_plan_id,p_child_id,target_week,previous_id);
  perform public.record_new_plan_selection_internal(new_plan_id);
  return new_plan_id;
end;
$$;
revoke all on function public.generate_weekly_plan_internal(uuid) from public,anon,authenticated;
revoke all on function public.generate_next_week_plan_internal(uuid) from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
