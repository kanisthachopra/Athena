-- Preserve the actual reviewed instructions selected for an instance.
-- No backfill: today's template cannot prove what an old family saw.
begin;
alter table public.activity_instances add column content_snapshot jsonb;
create table public.activity_content_versions (
  activity_instance_id uuid not null,
  child_id uuid not null,
  instance_revision integer not null check(instance_revision>0),
  recorded_at timestamptz not null default now(),
  scheduled_date date not null,
  template_id uuid not null references public.activity_templates(id) on delete restrict,
  personalized_title text not null,
  personalized_instructions text not null,
  selection_reason text not null,
  content_snapshot jsonb not null check(jsonb_typeof(content_snapshot)='object'),
  primary key(activity_instance_id,instance_revision),
  foreign key(activity_instance_id,child_id) references public.activity_instances(id,child_id) on delete cascade
);
alter table public.activity_content_versions enable row level security;
revoke all on public.activity_content_versions from public,anon,authenticated;
grant select on public.activity_content_versions to authenticated;
create policy "Members read activity content history" on public.activity_content_versions for select to authenticated
  using(public.can_access_child(child_id));

create function public.preserve_activity_content_internal()
returns trigger language plpgsql security definer set search_path = '' as $$
declare item public.activity_templates%rowtype; review public.activity_template_reviews%rowtype;
begin
  if tg_op='UPDATE' then
    if new.id is distinct from old.id or new.child_id is distinct from old.child_id or new.plan_id is distinct from old.plan_id then
      raise exception 'MIRA_ACTIVITY_IDENTITY_IMMUTABLE';
    end if;
    if new.template_id is not distinct from old.template_id then
      if new.content_snapshot is distinct from old.content_snapshot
        or new.personalized_title is distinct from old.personalized_title
        or new.personalized_instructions is distinct from old.personalized_instructions
        or new.selection_reason is distinct from old.selection_reason
        or new.opportunity_type is distinct from old.opportunity_type
        or new.estimated_parent_minutes is distinct from old.estimated_parent_minutes
        or new.is_optional is distinct from old.is_optional then
        raise exception 'MIRA_ACTIVITY_CONTENT_IMMUTABLE';
      end if;
      return new;
    end if;
    if new.template_id is null then raise exception 'MIRA_KEEP_ACTIVITY_HISTORY_USE_SKIP'; end if;
    if old.status<>'planned' or old.opportunity_type='open'
      or exists(select 1 from public.observations where activity_instance_id=old.id) then
      raise exception 'MIRA_ACTIVITY_NOT_REPLACEABLE';
    end if;
  end if;
  if new.template_id is null then
    new.content_snapshot:=null;
    return new;
  end if;
  select * into item from public.activity_templates where id=new.template_id for share;
  if item.id is null then raise exception 'MIRA_TEMPLATE_NOT_REVIEWED'; end if;
  select * into review from public.activity_template_reviews
    where template_id=item.id and content_version=item.content_version for share;
  if not item.reviewed or item.review_status<>'expert_reviewed' then raise exception 'MIRA_TEMPLATE_NOT_REVIEWED'; end if;
  if review.template_snapshot is distinct from to_jsonb(item) or review.reviewed_at>now()
    or review.review_due_on<greatest(current_date,new.scheduled_date) then
    raise exception 'MIRA_REVIEW_MISSING_OR_STALE';
  end if;
  -- No reviewed personalisation contract exists yet. Capture the exact accepted
  -- instructions, not client-provided alterations to safety-critical wording.
  if new.personalized_title<>item.title or new.personalized_instructions<>item.instructions then
    raise exception 'MIRA_UNREVIEWED_ACTIVITY_VARIANT';
  end if;
  if new.opportunity_type='open' or new.estimated_parent_minutes<>item.setup_minutes or not new.is_optional then
    raise exception 'MIRA_UNREVIEWED_ACTIVITY_VARIANT';
  end if;
  new.content_snapshot:=jsonb_build_object('schema_version',1,'selected_at',now(),'template',to_jsonb(item),
    'review',jsonb_build_object('content_version',review.content_version,'reviewed_at',review.reviewed_at,'review_due_on',review.review_due_on));
  return new;
end;
$$;
revoke all on function public.preserve_activity_content_internal() from public,anon,authenticated;
-- Alphabetical ordering: content is set BEFORE the revision trigger measures
-- the final row. The AFTER trigger sees the final revision and writes history.
create trigger activity_content_capture before insert or update on public.activity_instances
  for each row execute function public.preserve_activity_content_internal();

create function public.record_activity_content_internal()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.content_snapshot is null then return null; end if;
  if tg_op='UPDATE' and new.template_id is not distinct from old.template_id then return null; end if;
  insert into public.activity_content_versions(activity_instance_id,child_id,instance_revision,scheduled_date,
    template_id,personalized_title,personalized_instructions,selection_reason,content_snapshot)
    values(new.id,new.child_id,new.revision,new.scheduled_date,new.template_id,
      new.personalized_title,new.personalized_instructions,new.selection_reason,new.content_snapshot);
  return null;
end;
$$;
revoke all on function public.record_activity_content_internal() from public,anon,authenticated;
create trigger activity_content_history after insert or update on public.activity_instances
  for each row execute function public.record_activity_content_internal();

-- Read-only, exact-instance use check. Saving history never makes a withdrawn,
-- changed or expired template eligible for another offer.
create function public.get_activity_use_check(p_instance_id uuid)
returns text language plpgsql stable security definer set search_path = '' as $$
declare item public.activity_instances%rowtype; current_template jsonb;
begin
  if not public.can_access_activity_instance(p_instance_id) then raise exception 'Family access required'; end if;
  select * into item from public.activity_instances where id=p_instance_id;
  if item.template_id is null then return 'MIRA_OPEN_DAY'; end if;
  if item.content_snapshot is null then return 'MIRA_LEGACY_CONTENT_VERSION_UNKNOWN'; end if;
  select to_jsonb(t) into current_template from public.activity_templates t where id=item.template_id;
  if current_template is distinct from item.content_snapshot->'template' then return 'MIRA_SAVED_CONTENT_CHANGED'; end if;
  return public.activity_candidate_block_reason_internal(item.child_id,item.template_id,greatest(current_date,item.scheduled_date));
end;
$$;
revoke all on function public.get_activity_use_check(uuid) from public,anon,authenticated;
grant execute on function public.get_activity_use_check(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
