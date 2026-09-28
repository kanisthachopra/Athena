-- MIRA Milestone 11: child-specific saved activities from the reviewed library.

create table public.saved_activities (
  child_id uuid not null references public.children(id) on delete cascade,
  template_id uuid not null references public.activity_templates(id) on delete cascade,
  saved_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (child_id, template_id)
);

create index saved_activities_child_created_idx
on public.saved_activities(child_id, created_at desc);

alter table public.saved_activities enable row level security;

create policy "Members read saved activities"
on public.saved_activities for select to authenticated
using (public.can_access_child(child_id));

revoke insert, update, delete on public.saved_activities from authenticated;

create or replace function public.set_activity_saved(
  p_child_id uuid,
  p_template_id uuid,
  p_saved boolean
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  child_age_months integer;
begin
  if not public.can_edit_child(p_child_id) then raise exception 'Caregiver access required'; end if;

  select greatest(0,
    extract(year from age(current_date, make_date(birth_year, birth_month, 1)))::integer * 12
    + extract(month from age(current_date, make_date(birth_year, birth_month, 1)))::integer
  ) into child_age_months
  from public.children
  where id = p_child_id and archived_at is null;
  if child_age_months is null then raise exception 'Active child profile not found'; end if;

  if not exists (
    select 1 from public.activity_templates
    where id = p_template_id and reviewed
      and child_age_months between min_age_months and max_age_months
  ) then raise exception 'This activity is not suitable for the active child'; end if;

  if p_saved then
    insert into public.saved_activities (child_id, template_id, saved_by)
    values (p_child_id, p_template_id, auth.uid())
    on conflict (child_id, template_id) do nothing;
  else
    delete from public.saved_activities
    where child_id = p_child_id and template_id = p_template_id;
  end if;
end;
$$;

revoke all on function public.set_activity_saved(uuid, uuid, boolean) from public;
grant execute on function public.set_activity_saved(uuid, uuid, boolean) to authenticated;

comment on table public.saved_activities is
'Reviewed activity ideas a caregiver saved for a specific child.';
