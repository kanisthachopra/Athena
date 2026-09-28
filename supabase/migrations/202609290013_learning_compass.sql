-- MIRA Milestone 13: an explainable learning compass and balanced deterministic planning.

create or replace function public.get_learning_compass(p_child_id uuid)
returns table (
  domain text,
  activity_signals bigint,
  everyday_signals bigint,
  high_interest bigint,
  repeated_count bigint,
  easy_count bigint,
  stretch_count bigint,
  signal_score bigint,
  last_signal_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.can_access_child(p_child_id) then
    raise exception 'Access denied';
  end if;

  return query
  with domains(domain_key) as (
    values
      ('language'), ('movement'), ('sensory'), ('maths'),
      ('creative'), ('life_skills'), ('nature'), ('everyday')
  ),
  activity_evidence as (
    select
      at.domain as domain_key,
      count(*) as activity_signals,
      count(*) filter (where o.engagement = 'high') as high_interest,
      count(*) filter (where o.repeated) as repeated_count,
      count(*) filter (where o.challenge_level = 'easy') as easy_count,
      count(*) filter (where o.challenge_level = 'stretch') as stretch_count,
      sum(
        case o.engagement when 'high' then 3 when 'medium' then 1 else -1 end
        + case when o.repeated then 2 else 0 end
        + case when o.challenge_level = 'just_right' then 1 else 0 end
      )::bigint as signal_score,
      max(o.updated_at) as last_signal_at
    from public.observations o
    join public.activity_instances ai on ai.id = o.activity_instance_id
    join public.activity_templates at on at.id = ai.template_id
    where o.child_id = p_child_id
      and o.updated_at >= now() - interval '90 days'
    group by at.domain
  ),
  everyday_evidence as (
    select
      lm.domain as domain_key,
      count(*) as everyday_signals,
      (count(*) * 2)::bigint as signal_score,
      max(lm.created_at) as last_signal_at
    from public.learning_moments lm
    where lm.child_id = p_child_id
      and lm.occurred_on >= current_date - 90
    group by lm.domain
  )
  select
    d.domain_key,
    coalesce(a.activity_signals, 0),
    coalesce(e.everyday_signals, 0),
    coalesce(a.high_interest, 0),
    coalesce(a.repeated_count, 0),
    coalesce(a.easy_count, 0),
    coalesce(a.stretch_count, 0),
    coalesce(a.signal_score, 0) + coalesce(e.signal_score, 0),
    greatest(a.last_signal_at, e.last_signal_at)
  from domains d
  left join activity_evidence a on a.domain_key = d.domain_key
  left join everyday_evidence e on e.domain_key = d.domain_key
  order by d.domain_key;
end;
$$;

revoke all on function public.get_learning_compass(uuid) from public;
grant execute on function public.get_learning_compass(uuid) to authenticated;

comment on function public.get_learning_compass(uuid) is
'Returns explainable 90-day learning signals for one child. These are interests and experiences, not scores or developmental assessments.';

-- Initial plans deliberately cover as many domains as the age-filtered library allows
-- before repeating a domain. This makes the first week broad rather than alphabetical.
create or replace function public.generate_weekly_plan_internal(p_child_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_plan_id uuid;
  child_age_months integer;
  prefer_embedded boolean := true;
  available_minutes integer := 15;
  monday date := current_date - (extract(isodow from current_date)::integer - 1);
begin
  if not public.can_access_child(p_child_id) then raise exception 'Access denied'; end if;

  select greatest(0, extract(year from age(current_date, make_date(birth_year, birth_month, 1)))::integer * 12
    + extract(month from age(current_date, make_date(birth_year, birth_month, 1)))::integer)
    into child_age_months from public.children where id = p_child_id;

  select fp.prefer_embedded_learning, greatest(fp.weekday_minutes, fp.weekend_minutes)
    into prefer_embedded, available_minutes
    from public.family_preferences fp
    join public.children c on c.family_id = fp.family_id
    where c.id = p_child_id;

  insert into public.plans (child_id, week_start, generation_method, adaptation_summary)
  values (p_child_id, monday, 'balanced_deterministic_v2',
    'A broad first week balanced across age-appropriate learning areas and your family rhythm.')
  on conflict (child_id, week_start) do update set status = 'active'
  returning id into new_plan_id;

  with available_days as (
    select
      (monday + day_offset)::date as scheduled_date,
      row_number() over (order by day_offset)::integer as rn
    from generate_series(0, 6) as day_offset
    where not exists (
      select 1 from public.activity_instances ai
      where ai.plan_id = new_plan_id and ai.scheduled_date = (monday + day_offset)::date
    )
  ),
  domain_ranked as (
    select at.*,
      row_number() over (
        partition by at.domain
        order by
          case when prefer_embedded then at.embedded_learning else false end desc,
          abs(at.duration_minutes - greatest(5, least(available_minutes, 30))),
          at.slug
      )::integer as domain_rank
    from public.activity_templates at
    where at.reviewed
      and child_age_months between at.min_age_months and at.max_age_months
      and not exists (
        select 1 from public.activity_instances ai
        where ai.plan_id = new_plan_id and ai.template_id = at.id
      )
  ),
  selected as (
    select domain_ranked.*,
      row_number() over (
        order by domain_rank,
          case when prefer_embedded then embedded_learning else false end desc,
          abs(duration_minutes - greatest(5, least(available_minutes, 30))),
          domain, slug
      )::integer as rn
    from domain_ranked
  )
  insert into public.activity_instances
    (plan_id, child_id, template_id, scheduled_date, personalized_title, personalized_instructions, selection_reason)
  select new_plan_id, p_child_id, selected.id, available_days.scheduled_date,
    selected.title, selected.instructions,
    case when selected.domain_rank = 1
      then 'Adds balanced experience in ' || replace(selected.domain, '_', ' ') || ' while fitting age and family rhythm.'
      else 'Adds a second, distinct invitation in ' || replace(selected.domain, '_', ' ') || ' after covering the available learning areas.'
    end
  from selected
  join available_days using (rn)
  where selected.rn <= 7;

  return new_plan_id;
end;
$$;

-- Later plans combine planned-activity feedback and spontaneous learning moments.
-- Domain diversity is considered before interest strength, preventing a narrow
-- feedback loop where one popular area crowds every other experience out.
create or replace function public.generate_next_week_plan_internal(p_child_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_plan_id uuid;
  previous_id uuid;
  child_age_months integer;
  prefer_embedded boolean := true;
  available_minutes integer := 15;
  observation_count integer := 0;
  moment_count integer := 0;
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
  from public.observations
  where child_id = p_child_id and updated_at >= now() - interval '90 days';

  select count(*)::integer into moment_count
  from public.learning_moments
  where child_id = p_child_id and occurred_on >= current_date - 90;

  insert into public.plans as target_plan
    (child_id, week_start, previous_plan_id, generation_method, adaptation_summary)
  values
    (p_child_id, target_week, previous_id, 'balanced_deterministic_v2',
      case when observation_count + moment_count = 0
        then 'A balanced week shaped by age and family rhythm. Future observations will add gentle personalization.'
        else format(
          'Balanced across learning areas and shaped by %s planned observation%s plus %s everyday moment%s.',
          observation_count, case when observation_count = 1 then '' else 's' end,
          moment_count, case when moment_count = 1 then '' else 's' end
        )
      end)
  on conflict (child_id, week_start) do update set
    previous_plan_id = excluded.previous_plan_id,
    adaptation_summary = case
      when not exists (select 1 from public.activity_instances where plan_id = target_plan.id)
      then excluded.adaptation_summary else target_plan.adaptation_summary end,
    generation_method = case
      when not exists (select 1 from public.activity_instances where plan_id = target_plan.id)
      then excluded.generation_method else target_plan.generation_method end
  returning id into new_plan_id;

  with available_days as (
    select
      (target_week + day_offset)::date as scheduled_date,
      row_number() over (order by day_offset)::integer as rn
    from generate_series(0, 6) as day_offset
    where not exists (
      select 1 from public.activity_instances ai
      where ai.plan_id = new_plan_id and ai.scheduled_date = (target_week + day_offset)::date
    )
  ),
  signals as (
    select at.*,
      exists (
        select 1 from public.activity_instances recent
        where recent.plan_id = previous_id and recent.template_id = at.id
      ) as used_last_week,
      (select count(*) from public.activity_instances recent
        where recent.child_id = p_child_id and recent.template_id = at.id
          and recent.scheduled_date >= current_date - 28) as recent_uses,
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
          and o.updated_at >= now() - interval '90 days'
      ), 0)::integer as observation_score,
      (select count(*)::integer from public.learning_moments lm
        where lm.child_id = p_child_id and lm.domain = at.domain
          and lm.occurred_on >= current_date - 90) as moment_signals
    from public.activity_templates at
    where at.reviewed
      and child_age_months between at.min_age_months and at.max_age_months
      and not exists (
        select 1 from public.activity_instances already_planned
        where already_planned.plan_id = new_plan_id and already_planned.template_id = at.id
      )
  ),
  domain_ranked as (
    select signals.*,
      (observation_score + moment_signals * 2) as domain_score,
      row_number() over (
        partition by domain
        order by used_last_week asc, recent_uses asc,
          case when prefer_embedded then embedded_learning else false end desc,
          abs(duration_minutes - greatest(5, least(available_minutes, 30))), slug
      )::integer as domain_rank
    from signals
  ),
  selected as (
    select domain_ranked.*,
      row_number() over (
        order by domain_rank asc, used_last_week asc, domain_score desc, recent_uses asc,
          case when prefer_embedded then embedded_learning else false end desc,
          abs(duration_minutes - greatest(5, least(available_minutes, 30))), domain, slug
      )::integer as rn
    from domain_ranked
  )
  insert into public.activity_instances
    (plan_id, child_id, template_id, scheduled_date, personalized_title, personalized_instructions, selection_reason)
  select new_plan_id, p_child_id, selected.id, available_days.scheduled_date,
    selected.title, selected.instructions,
    case
      when selected.moment_signals > 0 and selected.observation_score <= 0
        then 'Connects with ' || replace(selected.domain, '_', ' ') || ' noticed in everyday family life.'
      when selected.domain_score >= 4
        then 'Builds on a current interest in ' || replace(selected.domain, '_', ' ') || ' without narrowing the week.'
      when selected.domain_score > 0
        then 'Gently returns to an emerging interest in ' || replace(selected.domain, '_', ' ') || '.'
      when selected.used_last_week
        then 'Revisits a familiar invitation with room for a different response.'
      else 'Adds balanced variety while fitting age, time, and family preferences.'
    end
  from selected
  join available_days using (rn)
  where selected.rn <= 7;

  return new_plan_id;
end;
$$;

revoke all on function public.generate_weekly_plan_internal(uuid) from public, authenticated;
revoke all on function public.generate_next_week_plan_internal(uuid) from public, authenticated;

comment on function public.generate_next_week_plan_internal(uuid) is
'Builds a seven-day plan with domain diversity first, then recent caregiver signals, family rhythm, and repetition avoidance.';
