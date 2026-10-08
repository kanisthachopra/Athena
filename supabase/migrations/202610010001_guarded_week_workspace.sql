-- Spatial Workspace: compare-and-swap protects moves and undo from stale screens.
-- The legacy reschedule function remains available for existing activity forms.
create or replace function public.move_week_activity_checked(
  p_instance_id uuid, p_target_date date, p_expected jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  target_plan uuid;
  current_snapshot jsonb;
  expected_snapshot jsonb;
begin
  if not public.can_edit_activity_instance(p_instance_id) then
    raise exception 'Caregiver access required';
  end if;
  select plan_id into target_plan from public.activity_instances where id = p_instance_id;
  if target_plan is null then raise exception 'Activity not found'; end if;
  perform id from public.plans where id = target_plan for update;
  perform id from public.activity_instances where plan_id = target_plan order by id for update;
  select jsonb_agg(jsonb_build_object('id',id,'scheduled_date',scheduled_date,'status',status,'template_id',template_id) order by id)
    into current_snapshot from public.activity_instances where plan_id = target_plan;
  if jsonb_typeof(p_expected) <> 'array' or jsonb_array_length(p_expected) > 100 then
    raise exception 'Invalid plan snapshot';
  end if;
  select jsonb_agg(jsonb_build_object('id',x.id,'scheduled_date',x.scheduled_date,'status',x.status,'template_id',x.template_id) order by x.id)
    into expected_snapshot from jsonb_to_recordset(p_expected) as x(id uuid, scheduled_date date, status text, template_id uuid);
  if current_snapshot is distinct from expected_snapshot then
    raise exception 'MIRA_STALE_PLAN';
  end if;
  perform public.reschedule_planned_activity(p_instance_id, p_target_date);
  select jsonb_agg(jsonb_build_object('id',id,'scheduled_date',scheduled_date,'status',status,'template_id',template_id) order by id)
    into current_snapshot from public.activity_instances where plan_id = target_plan;
  return current_snapshot;
end;
$$;
revoke all on function public.move_week_activity_checked(uuid,date,jsonb) from public;
grant execute on function public.move_week_activity_checked(uuid,date,jsonb) to authenticated;
