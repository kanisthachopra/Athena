-- MIRA Milestone 3: transparent learning signals and an adaptive next week.

alter table public.activity_instances
  add column if not exists selection_reason text not null
  default 'Reviewed for your child’s age and family rhythm.';

alter table public.plans
  add column if not exists previous_plan_id uuid references public.plans(id) on delete set null;

alter table public.plans
  add column if not exists adaptation_summary text not null
  default 'A varied week shaped by age and family preferences.';

create or replace function public.generate_next_week_plan(p_child_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  new_plan_id uuid;
  previous_id uuid;
  child_age_months integer;
  prefer_embedded boolean := true;
  available_minutes integer := 15;
  observation_count integer := 0;
  existing_count integer := 0;
  current_monday date := current_date - (extract(isodow from current_date)::integer - 1);
  target_week date := current_date - (extract(isodow from current_date)::integer - 1) + 7;
begin
  if not public.can_access_child(p_child_id) then raise exception 'Access denied'; end if;

  select greatest(0, extract(year from age(target_week, make_date(birth_year, birth_month, 1)))::integer * 12
    + extract(month from age(target_week, make_date(birth_year, birth_month, 1)))::integer)
    into child_age_months from public.children where id = p_child_id;

  select fp.prefer_embedded_learning, greatest(fp.weekday_minutes, fp.weekend_minutes)
    into prefer_embedded, available_minutes
    from public.family_preferences fp
    join public.children c on c.family_id = fp.family_id
    where c.id = p_child_id;

  select id into previous_id from public.plans
  where child_id = p_child_id and week_start <= current_monday
  order by week_start desc limit 1;

  select count(*)::integer into observation_count
  from public.observations where child_id = p_child_id;

  insert into public.plans
    (child_id, week_start, previous_plan_id, generation_method, adaptation_summary)
  values
    (p_child_id, target_week, previous_id, 'adaptive_deterministic_v1',
      case when observation_count = 0
        then 'A varied week shaped by age and family preferences. Feedback will guide later weeks.'
        else format('Shaped by %s caregiver observation%s, while preserving variety.', observation_count, case when observation_count = 1 then '' else 's' end)
      end)
  on conflict (child_id, week_start) do update set
    previous_plan_id = excluded.previous_plan_id,
    adaptation_summary = excluded.adaptation_summary
  returning id into new_plan_id;

  select count(*)::integer into existing_count
  from public.activity_instances where plan_id = new_plan_id;

  if existing_count < 7 then
    insert into public.activity_instances
      (plan_id, child_id, template_id, scheduled_date, personalized_title, personalized_instructions, selection_reason)
    select new_plan_id, p_child_id, ranked.id,
      target_week + existing_count + (ranked.rn - 1), ranked.title, ranked.instructions,
      case
        when ranked.domain_score >= 4 then 'Builds on strong interest noticed in ' || replace(ranked.domain, '_', ' ') || '.'
        when ranked.domain_score > 0 then 'Gently extends an emerging interest in ' || replace(ranked.domain, '_', ' ') || '.'
        when ranked.used_last_week then 'Revisits a familiar invitation with room for a new response.'
        else 'Adds variety while fitting age, time, and family preferences.'
      end
    from (
      select scored.*, row_number() over (
        order by scored.used_last_week asc, scored.domain_score desc,
          case when prefer_embedded then scored.embedded_learning else false end desc,
          abs(scored.duration_minutes - greatest(5, least(available_minutes, 30))),
          scored.domain, scored.slug
      )::integer as rn
      from (
        select at.*,
          exists (
            select 1 from public.activity_instances recent
            where recent.plan_id = previous_id and recent.template_id = at.id
          ) as used_last_week,
          coalesce((
            select sum(
              case o.engagement when 'high' then 3 when 'medium' then 1 else -1 end
              + case when o.repeated then 2 else 0 end
              + case when o.challenge_level = 'just_right' then 1 else 0 end
            )
            from public.observations o
            join public.activity_instances observed_instance on observed_instance.id = o.activity_instance_id
            join public.activity_templates observed_template on observed_template.id = observed_instance.template_id
            where o.child_id = p_child_id
              and observed_template.domain = at.domain
              and o.created_at >= now() - interval '90 days'
          ), 0)::integer as domain_score
        from public.activity_templates at
        where at.reviewed
          and child_age_months between at.min_age_months and at.max_age_months
          and not exists (
            select 1 from public.activity_instances already_planned
            where already_planned.plan_id = new_plan_id and already_planned.template_id = at.id
          )
      ) scored
      order by scored.used_last_week asc, scored.domain_score desc,
        case when prefer_embedded then scored.embedded_learning else false end desc,
        abs(scored.duration_minutes - greatest(5, least(available_minutes, 30))),
        scored.domain, scored.slug
      limit greatest(0, 7 - existing_count)
    ) ranked;
  end if;

  return new_plan_id;
end;
$$;

revoke all on function public.generate_next_week_plan(uuid) from public;
grant execute on function public.generate_next_week_plan(uuid) to authenticated;
