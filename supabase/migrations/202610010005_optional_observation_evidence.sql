-- Preserve missing answers as unknown; do not reinterpret historical answers.
begin;
alter table public.observations
  alter column engagement drop not null,
  alter column challenge_level drop not null,
  alter column repeated drop not null,
  alter column repeated drop default,
  add column revision integer not null default 1 check (revision > 0);

create function public.advance_observation_revision()
returns trigger language plpgsql set search_path = '' as $$
begin
  if TG_OP = 'INSERT' then new.revision := 1;
  else new.revision := old.revision + 1; end if;
  return new;
end;
$$;
revoke all on function public.advance_observation_revision() from public, anon, authenticated;
create trigger observation_revision before insert or update on public.observations
for each row execute function public.advance_observation_revision();

create function public.record_activity_observation_checked(
  p_instance_id uuid, p_expected_revision integer, p_expected_template_id uuid,
  p_engagement text, p_challenge_level text, p_repeated boolean, p_parent_note text
) returns integer language plpgsql security definer set search_path = '' as $$
declare target_plan uuid; target_child uuid; actual_template uuid; actual_status text; current_revision integer; saved_revision integer;
begin
  if not public.can_edit_activity_instance(p_instance_id) then raise exception 'Caregiver access required'; end if;
  if p_expected_revision is null or p_expected_revision < 0
    or (p_engagement is not null and p_engagement not in ('low','medium','high'))
    or (p_challenge_level is not null and p_challenge_level not in ('easy','just_right','stretch'))
    or char_length(coalesce(p_parent_note,'')) > 1000 then raise exception 'Invalid observation'; end if;
  if p_engagement is null and p_challenge_level is null and p_repeated is null and btrim(coalesce(p_parent_note,'')) = '' then
    raise exception 'Add a note or one observation before saving';
  end if;
  select plan_id into target_plan from public.activity_instances where id = p_instance_id;
  -- Same lock order as Week movement: plan, instance, observation.
  perform id from public.plans where id = target_plan for update;
  select child_id, template_id, status into target_child, actual_template, actual_status
    from public.activity_instances where id = p_instance_id for update;
  if target_child is null or actual_status not in ('planned','completed') or actual_template is distinct from p_expected_template_id then
    raise exception 'MIRA_ACTIVITY_CHANGED';
  end if;
  select revision into current_revision from public.observations where activity_instance_id = p_instance_id for update;
  if coalesce(current_revision,0) <> p_expected_revision then raise exception 'MIRA_STALE_OBSERVATION'; end if;
  insert into public.observations(activity_instance_id,child_id,engagement,challenge_level,repeated,parent_note,updated_at)
  values(p_instance_id,target_child,p_engagement,p_challenge_level,p_repeated,
    case when btrim(coalesce(p_parent_note,'')) = '' then null else p_parent_note end,now())
  on conflict(activity_instance_id) do update set engagement=excluded.engagement,
    challenge_level=excluded.challenge_level,repeated=excluded.repeated,parent_note=excluded.parent_note,updated_at=now()
  returning revision into saved_revision;
  update public.activity_instances set status='completed' where id=p_instance_id;
  return saved_revision;
end;
$$;
revoke all on function public.record_activity_observation_checked(uuid,integer,uuid,text,text,boolean,text) from public,anon,authenticated;
grant execute on function public.record_activity_observation_checked(uuid,integer,uuid,text,text,boolean,text) to authenticated;
-- Old clients must refresh rather than bypass the revision check.
revoke all on function public.record_activity_feedback(uuid,text,text,boolean,text) from public,anon,authenticated;

-- Narrow repair of the inspected planner's two engagement score expressions.
-- Abort on an unexpected function body rather than silently patching different logic.
do $$
declare definition text; old_expression text := 'case o.engagement when ''high'' then 3 when ''medium'' then 1 else -1 end';
begin
  select pg_get_functiondef('public.populate_weekly_portfolio_internal(uuid,uuid,date,uuid)'::regprocedure) into definition;
  if (length(definition)-length(replace(definition,old_expression,'')))/length(old_expression) <> 2 then
    raise exception 'MIRA_PLANNER_REVIEW_REQUIRED: engagement scoring differs from expected baseline';
  end if;
  execute replace(definition,old_expression,'case o.engagement when ''high'' then 3 when ''medium'' then 1 when ''low'' then -1 else 0 end');
end;
$$;
notify pgrst,'reload schema';
commit;
