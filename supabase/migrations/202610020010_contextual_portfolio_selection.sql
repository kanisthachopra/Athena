-- Correct selection heuristics for NEW plans only. No content approvals, data
-- backfill, AI calls, or changes to existing plans/observations/language goals.
begin;

create or replace function public.populate_weekly_portfolio_internal(
  p_plan_id uuid, p_child_id uuid, p_week_start date, p_previous_plan_id uuid default null
) returns void language plpgsql security definer set search_path = '' as $$
declare
  desired_type text;
  chosen record;
  slot_index integer;
  target_date date;
begin
  if not public.can_edit_child(p_child_id) then raise exception 'Caregiver access required'; end if;
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
      select t.*,
        (select count(*) from public.activity_instances x
          join public.activity_templates xt on xt.id=x.template_id
          where x.plan_id=p_plan_id and xt.domain=t.domain) as portfolio_domain_count,
        coalesce(feedback.engagement='high' and feedback.repeated=true,false) as repeat_supported
      into chosen
      from public.activity_templates t
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
          || case when chosen.repeat_supported then 'Your latest recent report for this version recorded high engagement and repetition. '
            else 'No recent report of both high engagement and repetition for this version was used. ' end
          || 'Among eligible options, the order favours less-represented areas, reported repetition, less recent use, then lower preparation and duration. These are planning heuristics, not an assessment of your child.',
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
    else 'Eligible options were ordered for variety within this week, recent reports about the exact activity version, recent use and preparation effort. Two days are deliberately open; every option is optional. No separate language task or daily domain quota was imposed. This is not an assessment of ability or a complete picture of family life.'
    end where id=p_plan_id;
end;
$$;
revoke all on function public.record_new_plan_selection_internal(uuid) from public,anon,authenticated;

do $$ declare definition text; signature text; begin
  foreach signature in array array['public.generate_weekly_plan_internal(uuid)','public.generate_next_week_plan_internal(uuid)'] loop
    select pg_get_functiondef(signature::regprocedure) into definition;
    if position('''reviewed_portfolio_v3''' in definition)=0 then raise exception 'MIRA_PLANNER_REVIEW_REQUIRED: unexpected generation version'; end if;
    execute replace(definition,'''reviewed_portfolio_v3''','''reviewed_portfolio_v4''');
  end loop;
end; $$;
revoke all on function public.generate_weekly_plan_internal(uuid) from public,anon,authenticated;
revoke all on function public.generate_next_week_plan_internal(uuid) from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
