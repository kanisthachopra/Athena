-- Guard corrections with the exact saved version. No existing rows are rewritten.
begin;

create or replace function public.advance_child_profile_version_internal()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- Archive/restore and other privileged edits must also invalidate older forms.
  new.updated_at := greatest(clock_timestamp(), old.updated_at + interval '1 microsecond');
  return new;
end;
$$;
revoke all on function public.advance_child_profile_version_internal() from public, anon, authenticated;
create trigger advance_child_profile_version
before update on public.children for each row
execute function public.advance_child_profile_version_internal();

create or replace function public.update_child_profile_checked(
  p_child_id uuid, p_expected_updated_at timestamptz,
  p_nickname text, p_birth_year integer, p_birth_month integer
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  saved public.children%rowtype;
  family_today date;
begin
  if auth.uid() is null or not public.can_edit_child(p_child_id) then
    raise exception 'Caregiver access required';
  end if;
  select * into saved from public.children where id = p_child_id for update;
  if not found or saved.archived_at is not null then raise exception 'MIRA_CHILD_NOT_ACTIVE'; end if;
  if p_expected_updated_at is null or saved.updated_at <> p_expected_updated_at then
    raise exception 'MIRA_STALE_CHILD_PROFILE';
  end if;
  if nullif(trim(p_nickname), '') is null or char_length(trim(p_nickname)) > 60 then
    raise exception 'MIRA_INVALID_CHILD_NAME';
  end if;
  family_today := public.child_today_internal(p_child_id);
  if p_birth_month is null or p_birth_year is null
    or p_birth_month not between 1 and 12
    or p_birth_year not between extract(year from family_today)::integer - 18 and extract(year from family_today)::integer then
    raise exception 'MIRA_INVALID_BIRTH_CONTEXT';
  end if;
  if make_date(p_birth_year, p_birth_month, 1) > family_today then
    raise exception 'MIRA_FUTURE_BIRTH_MONTH';
  end if;
  update public.children set nickname = trim(p_nickname), birth_year = p_birth_year, birth_month = p_birth_month
  where id = p_child_id returning * into saved;
  return jsonb_build_object('updatedAt', saved.updated_at);
end;
$$;
revoke all on function public.update_child_profile_checked(uuid,timestamptz,text,integer,integer) from public, anon, authenticated;
grant execute on function public.update_child_profile_checked(uuid,timestamptz,text,integer,integer) to authenticated;
-- Older clients cannot bypass the version check. They must reload.
revoke all on function public.update_child_profile(uuid,text,integer,integer) from public, anon, authenticated;
commit;
