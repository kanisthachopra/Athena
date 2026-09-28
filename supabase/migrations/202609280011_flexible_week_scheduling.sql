-- MIRA Milestone 10: caregiver-controlled rescheduling inside a weekly plan.

create or replace function public.reschedule_planned_activity(
  p_instance_id uuid,
  p_target_date date
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  source_instance public.activity_instances%rowtype;
  target_instance public.activity_instances%rowtype;
  target_week_start date;
  temporary_date date;
begin
  if not public.can_edit_activity_instance(p_instance_id) then
    raise exception 'Caregiver access required';
  end if;

  select * into source_instance
  from public.activity_instances
  where id = p_instance_id and status = 'planned'
  for update;
  if source_instance.id is null then raise exception 'Only planned activities can be moved'; end if;

  select week_start into target_week_start
  from public.plans
  where id = source_instance.plan_id;
  if p_target_date is null or p_target_date < target_week_start or p_target_date > target_week_start + 6 then
    raise exception 'Choose a day inside this weekly plan';
  end if;
  if p_target_date = source_instance.scheduled_date then return source_instance.plan_id; end if;

  select * into target_instance
  from public.activity_instances
  where plan_id = source_instance.plan_id and scheduled_date = p_target_date
  for update;

  if target_instance.id is not null then
    if target_instance.status <> 'planned' then
      raise exception 'Completed or skipped days cannot be rearranged';
    end if;
    -- Move through an unused temporary date because the plan enforces one activity per day.
    temporary_date := target_week_start + 14;
    update public.activity_instances set scheduled_date = temporary_date where id = source_instance.id;
    update public.activity_instances set scheduled_date = source_instance.scheduled_date where id = target_instance.id;
    update public.activity_instances set scheduled_date = p_target_date where id = source_instance.id;
  else
    update public.activity_instances set scheduled_date = p_target_date where id = source_instance.id;
  end if;

  return source_instance.plan_id;
end;
$$;

revoke all on function public.reschedule_planned_activity(uuid, date) from public;
grant execute on function public.reschedule_planned_activity(uuid, date) to authenticated;

comment on function public.reschedule_planned_activity(uuid, date) is
'Moves a planned activity within its seven-day plan, swapping with another planned activity when the target day is occupied.';
