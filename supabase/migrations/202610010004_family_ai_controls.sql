-- Explicit feature permissions, default off. This is an application control,
-- not certification of provider retention or legal consent.
begin;
create table public.family_ai_preferences (
  family_id uuid primary key references public.families(id) on delete cascade,
  guide_enabled boolean not null default false,
  profile_enabled boolean not null default false,
  journal_enabled boolean not null default false,
  policy_version text,
  revision integer not null default 0 check (revision >= 0),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.family_ai_preferences enable row level security;
revoke all on public.family_ai_preferences from anon, authenticated;
grant select on public.family_ai_preferences to authenticated;
create policy "Members read family AI choices" on public.family_ai_preferences
for select to authenticated using (public.can_access_family(family_id));

create function public.set_family_ai_preferences(
  p_family_id uuid, p_expected_revision integer,
  p_guide_enabled boolean, p_profile_enabled boolean, p_journal_enabled boolean,
  p_policy_version text
) returns integer language plpgsql security definer set search_path = '' as $$
declare current_revision integer;
begin
  if not exists (select 1 from public.family_members where family_id = p_family_id and user_id = auth.uid() and role = 'owner') then
    raise exception 'Only the family owner can change AI permissions';
  end if;
  if p_expected_revision is null or p_expected_revision < 0 or p_guide_enabled is null or p_profile_enabled is null or p_journal_enabled is null then
    raise exception 'Invalid AI preferences';
  end if;
  if (p_guide_enabled or p_profile_enabled or p_journal_enabled) and p_policy_version is distinct from '2026-10-01-v1' then
    raise exception 'Review the current AI information before enabling a feature';
  end if;
  -- Serialize creation and changes, including the initially absent preferences row.
  perform id from public.families where id = p_family_id for update;
  select revision into current_revision from public.family_ai_preferences where family_id = p_family_id;
  if coalesce(current_revision, 0) <> p_expected_revision then raise exception 'MIRA_STALE_AI_PREFERENCES'; end if;
  insert into public.family_ai_preferences (family_id, guide_enabled, profile_enabled, journal_enabled, policy_version, revision, updated_by)
  values (p_family_id, p_guide_enabled, p_profile_enabled, p_journal_enabled,
    case when p_guide_enabled or p_profile_enabled or p_journal_enabled then p_policy_version else null end,
    coalesce(current_revision, 0) + 1, auth.uid())
  on conflict (family_id) do update set guide_enabled = excluded.guide_enabled,
    profile_enabled = excluded.profile_enabled, journal_enabled = excluded.journal_enabled,
    policy_version = excluded.policy_version, revision = excluded.revision,
    updated_by = excluded.updated_by, updated_at = now();
  return coalesce(current_revision, 0) + 1;
end;
$$;
revoke all on function public.set_family_ai_preferences(uuid,integer,boolean,boolean,boolean,text) from public, anon, authenticated;
grant execute on function public.set_family_ai_preferences(uuid,integer,boolean,boolean,boolean,text) to authenticated;
notify pgrst, 'reload schema';
commit;
