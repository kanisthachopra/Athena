-- Every linked plan/activity/observation must refer to the same child.
-- No rows are rewritten or deleted. Existing inconsistent links abort the repair.
begin;

do $$
begin
  if exists (
    select 1 from public.activity_instances a join public.plans p on p.id = a.plan_id
    where a.child_id <> p.child_id
  ) or exists (
    select 1 from public.observations o join public.activity_instances a on a.id = o.activity_instance_id
    where o.child_id <> a.child_id
  ) then
    raise exception 'MIRA_LINK_AUDIT_REQUIRED: existing child links differ; no data changed. Review those links before applying this migration.';
  end if;
end;
$$;

create unique index if not exists plans_id_child_integrity_idx on public.plans(id, child_id);
create unique index if not exists activity_instances_id_child_integrity_idx on public.activity_instances(id, child_id);

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.activity_instances'::regclass and conname = 'activity_instances_plan_child_fk') then
    alter table public.activity_instances add constraint activity_instances_plan_child_fk
      foreign key (plan_id, child_id) references public.plans(id, child_id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.observations'::regclass and conname = 'observations_instance_child_fk') then
    alter table public.observations add constraint observations_instance_child_fk
      foreign key (activity_instance_id, child_id) references public.activity_instances(id, child_id) on delete cascade;
  end if;
end;
$$;

alter table public.activity_instances validate constraint activity_instances_plan_child_fk;
alter table public.observations validate constraint observations_instance_child_fk;
notify pgrst, 'reload schema';
commit;
