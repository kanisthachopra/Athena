-- Replacement is an explicit, version-bound parent action. Existing activity
-- content is untouched; existing rows start with revision 1 (no fabricated history).
begin;

alter table public.activity_instances add column revision integer not null default 1 check(revision>0);
create function public.activity_instance_revision_internal()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op='INSERT' then new.revision:=1;
  elsif (to_jsonb(new)-'revision') is distinct from (to_jsonb(old)-'revision') then
    new.revision:=old.revision+1;
  else new.revision:=old.revision;
  end if;
  return new;
end;
$$;
revoke all on function public.activity_instance_revision_internal() from public,anon,authenticated;
create trigger activity_instance_revision before insert or update on public.activity_instances
  for each row execute function public.activity_instance_revision_internal();

create function public.replace_planned_activity_checked(
  p_instance_id uuid,p_template_id uuid,p_expected_revision integer,p_expected_template jsonb
) returns void language plpgsql security definer set search_path = '' as $$
declare target_plan uuid; target public.activity_instances%rowtype; replacement public.activity_templates%rowtype;
begin
  if not public.can_edit_activity_instance(p_instance_id) then raise exception 'Caregiver access required'; end if;
  if p_expected_revision is null or p_expected_revision<1
    or p_expected_template is null or jsonb_typeof(p_expected_template)<>'object' then
    raise exception 'MIRA_REPLACEMENT_CONTEXT_REQUIRED';
  end if;
  select plan_id into target_plan from public.activity_instances where id=p_instance_id;
  perform id from public.plans where id=target_plan for update;
  select * into target from public.activity_instances where id=p_instance_id for update;
  if target.id is null or target.plan_id is distinct from target_plan or target.revision<>p_expected_revision then
    raise exception 'MIRA_STALE_ACTIVITY';
  end if;
  if target.status<>'planned' or target.opportunity_type='open' then raise exception 'MIRA_ACTIVITY_NOT_REPLACEABLE'; end if;
  if exists(select 1 from public.observations where activity_instance_id=target.id) then
    raise exception 'MIRA_ACTIVITY_HAS_OBSERVATION';
  end if;
  if target.template_id is not distinct from p_template_id then raise exception 'MIRA_REPLACEMENT_UNCHANGED'; end if;
  -- The parent must accept the same content that was displayed. Hold template
  -- and review rows through commit so an editorial edit cannot race the write.
  select * into replacement from public.activity_templates where id=p_template_id for share;
  if replacement.id is null or to_jsonb(replacement) is distinct from p_expected_template then
    raise exception 'MIRA_STALE_REPLACEMENT';
  end if;
  perform template_id from public.activity_template_reviews
    where template_id=replacement.id and content_version=replacement.content_version for share;
  perform public.replace_planned_activity_internal(p_instance_id,p_template_id);
end;
$$;
revoke all on function public.replace_planned_activity_checked(uuid,uuid,integer,jsonb) from public,anon,authenticated;
grant execute on function public.replace_planned_activity_checked(uuid,uuid,integer,jsonb) to authenticated;
-- Do not leave a public unchecked alternative to the new UI path.
revoke all on function public.replace_planned_activity(uuid,uuid) from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
