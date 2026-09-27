-- MIRA Milestone 5: persistent active-child selection and secure child creation.

create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active_child_id uuid references public.children(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "Users manage their own family settings" on public.user_settings
for all to authenticated
using (user_id = auth.uid() and (active_child_id is null or public.can_access_child(active_child_id)))
with check (user_id = auth.uid() and (active_child_id is null or public.can_access_child(active_child_id)));

create or replace function public.set_active_child(p_child_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.can_access_child(p_child_id) then raise exception 'Access denied'; end if;
  insert into public.user_settings (user_id, active_child_id, updated_at)
  values (auth.uid(), p_child_id, now())
  on conflict (user_id) do update set active_child_id = excluded.active_child_id, updated_at = now();
end;
$$;

create or replace function public.add_child_to_family(
  p_family_id uuid,
  p_nickname text,
  p_birth_year integer,
  p_birth_month integer
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  new_child_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists (
    select 1 from public.family_members
    where family_id = p_family_id and user_id = auth.uid() and role in ('owner', 'caregiver')
  ) then raise exception 'Only owners and caregivers can add a child'; end if;
  if nullif(trim(p_nickname), '') is null or char_length(trim(p_nickname)) > 60 then raise exception 'Invalid nickname'; end if;
  if p_birth_month not between 1 and 12 or p_birth_year not between extract(year from current_date)::integer - 18 and extract(year from current_date)::integer then raise exception 'Invalid birth date'; end if;

  insert into public.children (family_id, nickname, birth_year, birth_month)
  values (p_family_id, trim(p_nickname), p_birth_year, p_birth_month)
  returning id into new_child_id;

  insert into public.user_settings (user_id, active_child_id, updated_at)
  values (auth.uid(), new_child_id, now())
  on conflict (user_id) do update set active_child_id = excluded.active_child_id, updated_at = now();
  return new_child_id;
end;
$$;

revoke all on function public.set_active_child(uuid) from public;
revoke all on function public.add_child_to_family(uuid, text, integer, integer) from public;
grant execute on function public.set_active_child(uuid) to authenticated;
grant execute on function public.add_child_to_family(uuid, text, integer, integer) to authenticated;
