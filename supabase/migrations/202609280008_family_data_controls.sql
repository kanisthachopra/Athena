-- MIRA Milestone 7: editable profiles, reversible archiving, and safer data controls.

alter table public.children
add column archived_at timestamptz;

-- Child changes go through audited, role-aware functions rather than direct table updates.
revoke update on public.children from authenticated;

create or replace function public.update_family_name(p_family_id uuid, p_display_name text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.family_members
    where family_id = p_family_id and user_id = auth.uid() and role = 'owner'
  ) then raise exception 'Only the family owner can rename the family'; end if;
  if nullif(trim(p_display_name), '') is null or char_length(trim(p_display_name)) > 80 then
    raise exception 'Family name must be between 1 and 80 characters';
  end if;
  update public.families
  set display_name = trim(p_display_name), updated_at = now()
  where id = p_family_id;
end;
$$;

create or replace function public.update_child_profile(
  p_child_id uuid,
  p_nickname text,
  p_birth_year integer,
  p_birth_month integer
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.can_edit_child(p_child_id) then raise exception 'Caregiver access required'; end if;
  if nullif(trim(p_nickname), '') is null or char_length(trim(p_nickname)) > 60 then
    raise exception 'Enter a valid first name or nickname';
  end if;
  if p_birth_month not between 1 and 12
    or p_birth_year not between extract(year from current_date)::integer - 18 and extract(year from current_date)::integer then
    raise exception 'Enter a valid birth month and year';
  end if;
  update public.children
  set nickname = trim(p_nickname), birth_year = p_birth_year,
      birth_month = p_birth_month, updated_at = now()
  where id = p_child_id;
end;
$$;

create or replace function public.archive_child_profile(p_child_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  target_family_id uuid;
begin
  select family_id into target_family_id from public.children
  where id = p_child_id and archived_at is null;
  if target_family_id is null then raise exception 'Child profile not found'; end if;
  if not exists (
    select 1 from public.family_members
    where family_id = target_family_id and user_id = auth.uid() and role = 'owner'
  ) then raise exception 'Only the family owner can archive a child profile'; end if;
  if (select count(*) from public.children where family_id = target_family_id and archived_at is null) <= 1 then
    raise exception 'A family must keep at least one active child profile';
  end if;
  update public.children set archived_at = now(), updated_at = now() where id = p_child_id;
  update public.user_settings set active_child_id = null, updated_at = now()
  where active_child_id = p_child_id;
end;
$$;

create or replace function public.restore_child_profile(p_child_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  target_family_id uuid;
begin
  select family_id into target_family_id from public.children where id = p_child_id;
  if target_family_id is null then raise exception 'Child profile not found'; end if;
  if not exists (
    select 1 from public.family_members
    where family_id = target_family_id and user_id = auth.uid() and role = 'owner'
  ) then raise exception 'Only the family owner can restore a child profile'; end if;
  update public.children set archived_at = null, updated_at = now() where id = p_child_id;
end;
$$;

create or replace function public.set_active_child(p_child_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.can_access_child(p_child_id)
    or not exists (select 1 from public.children where id = p_child_id and archived_at is null) then
    raise exception 'Active child profile not found or access denied';
  end if;
  insert into public.user_settings (user_id, active_child_id, updated_at)
  values (auth.uid(), p_child_id, now())
  on conflict (user_id) do update
  set active_child_id = excluded.active_child_id, updated_at = now();
end;
$$;

revoke all on function public.update_family_name(uuid, text) from public;
revoke all on function public.update_child_profile(uuid, text, integer, integer) from public;
revoke all on function public.archive_child_profile(uuid) from public;
revoke all on function public.restore_child_profile(uuid) from public;
grant execute on function public.update_family_name(uuid, text) to authenticated;
grant execute on function public.update_child_profile(uuid, text, integer, integer) to authenticated;
grant execute on function public.archive_child_profile(uuid) to authenticated;
grant execute on function public.restore_child_profile(uuid) to authenticated;

comment on column public.children.archived_at is
'A reversible archive marker. Related plans and observations remain intact.';
