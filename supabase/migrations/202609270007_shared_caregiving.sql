-- MIRA Milestone 6: secure family invitations and role-aware shared caregiving.

create unique index family_members_one_family_per_user_idx
on public.family_members(user_id);

create or replace function public.can_edit_family(target_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.family_members
    where family_id = target_family_id
      and user_id = auth.uid()
      and role in ('owner', 'caregiver')
  );
$$;

create or replace function public.can_edit_child(target_child_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.children c
    where c.id = target_child_id
      and public.can_edit_family(c.family_id)
  );
$$;

create or replace function public.can_edit_activity_instance(target_instance_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.activity_instances ai
    where ai.id = target_instance_id
      and public.can_edit_child(ai.child_id)
  );
$$;

revoke all on function public.can_edit_family(uuid) from public;
revoke all on function public.can_edit_child(uuid) from public;
revoke all on function public.can_edit_activity_instance(uuid) from public;
grant execute on function public.can_edit_family(uuid) to authenticated;
grant execute on function public.can_edit_child(uuid) to authenticated;
grant execute on function public.can_edit_activity_instance(uuid) to authenticated;

-- Existing SECURITY DEFINER mutations are wrapped so viewer memberships stay read-only.
alter function public.configure_learning_profile(uuid, uuid, text, text, integer, integer, boolean, text, text, text[], text[], text[])
rename to configure_learning_profile_internal;
alter function public.generate_weekly_plan(uuid) rename to generate_weekly_plan_internal;
alter function public.generate_next_week_plan(uuid) rename to generate_next_week_plan_internal;
alter function public.record_activity_feedback(uuid, text, text, boolean, text) rename to record_activity_feedback_internal;
alter function public.skip_activity(uuid) rename to skip_activity_internal;
alter function public.replace_planned_activity(uuid, uuid) rename to replace_planned_activity_internal;

revoke all on function public.configure_learning_profile_internal(uuid, uuid, text, text, integer, integer, boolean, text, text, text[], text[], text[]) from public, authenticated;
revoke all on function public.generate_weekly_plan_internal(uuid) from public, authenticated;
revoke all on function public.generate_next_week_plan_internal(uuid) from public, authenticated;
revoke all on function public.record_activity_feedback_internal(uuid, text, text, boolean, text) from public, authenticated;
revoke all on function public.skip_activity_internal(uuid) from public, authenticated;
revoke all on function public.replace_planned_activity_internal(uuid, uuid) from public, authenticated;

create function public.configure_learning_profile(
  p_family_id uuid,
  p_child_id uuid,
  p_screen_policy text,
  p_structure_level text,
  p_weekday_minutes integer,
  p_weekend_minutes integer,
  p_prefer_embedded boolean,
  p_caregiver_name text,
  p_relationship text,
  p_caregiver_languages text[],
  p_aspirations text[],
  p_language_goals text[]
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.can_edit_family(p_family_id) then raise exception 'Caregiver access required'; end if;
  perform public.configure_learning_profile_internal(
    p_family_id, p_child_id, p_screen_policy, p_structure_level,
    p_weekday_minutes, p_weekend_minutes, p_prefer_embedded,
    p_caregiver_name, p_relationship, p_caregiver_languages,
    p_aspirations, p_language_goals
  );
end;
$$;

create function public.generate_weekly_plan(p_child_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
begin
  if not public.can_edit_child(p_child_id) then raise exception 'Caregiver access required'; end if;
  return public.generate_weekly_plan_internal(p_child_id);
end;
$$;

create function public.generate_next_week_plan(p_child_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
begin
  if not public.can_edit_child(p_child_id) then raise exception 'Caregiver access required'; end if;
  return public.generate_next_week_plan_internal(p_child_id);
end;
$$;

create function public.record_activity_feedback(
  p_instance_id uuid,
  p_engagement text,
  p_challenge_level text,
  p_repeated boolean,
  p_parent_note text default null
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.can_edit_activity_instance(p_instance_id) then raise exception 'Caregiver access required'; end if;
  perform public.record_activity_feedback_internal(p_instance_id, p_engagement, p_challenge_level, p_repeated, p_parent_note);
end;
$$;

create function public.skip_activity(p_instance_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.can_edit_activity_instance(p_instance_id) then raise exception 'Caregiver access required'; end if;
  perform public.skip_activity_internal(p_instance_id);
end;
$$;

create function public.replace_planned_activity(p_instance_id uuid, p_template_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.can_edit_activity_instance(p_instance_id) then raise exception 'Caregiver access required'; end if;
  perform public.replace_planned_activity_internal(p_instance_id, p_template_id);
end;
$$;

revoke all on function public.configure_learning_profile(uuid, uuid, text, text, integer, integer, boolean, text, text, text[], text[], text[]) from public;
revoke all on function public.generate_weekly_plan(uuid) from public;
revoke all on function public.generate_next_week_plan(uuid) from public;
revoke all on function public.record_activity_feedback(uuid, text, text, boolean, text) from public;
revoke all on function public.skip_activity(uuid) from public;
revoke all on function public.replace_planned_activity(uuid, uuid) from public;
grant execute on function public.configure_learning_profile(uuid, uuid, text, text, integer, integer, boolean, text, text, text[], text[], text[]) to authenticated;
grant execute on function public.generate_weekly_plan(uuid) to authenticated;
grant execute on function public.generate_next_week_plan(uuid) to authenticated;
grant execute on function public.record_activity_feedback(uuid, text, text, boolean, text) to authenticated;
grant execute on function public.skip_activity(uuid) to authenticated;
grant execute on function public.replace_planned_activity(uuid, uuid) to authenticated;

-- Replace broad write policies with a read policy for every member and an editor policy.
drop policy "Members manage family preferences" on public.family_preferences;
drop policy "Members manage caregivers" on public.caregivers;
drop policy "Members manage caregiver languages" on public.caregiver_languages;
drop policy "Members manage aspirations" on public.aspirations;
drop policy "Members manage language goals" on public.child_language_goals;
drop policy "Members manage plans" on public.plans;
drop policy "Members manage activity instances" on public.activity_instances;
drop policy "Members manage observations" on public.observations;

create policy "Members read family preferences" on public.family_preferences for select to authenticated
using (public.can_access_family(family_id));
create policy "Editors manage family preferences" on public.family_preferences for all to authenticated
using (public.can_edit_family(family_id)) with check (public.can_edit_family(family_id));

create policy "Members read caregivers" on public.caregivers for select to authenticated
using (public.can_access_family(family_id));
create policy "Editors manage caregivers" on public.caregivers for all to authenticated
using (public.can_edit_family(family_id)) with check (public.can_edit_family(family_id));

create policy "Members read caregiver languages" on public.caregiver_languages for select to authenticated
using (exists (select 1 from public.caregivers c where c.id = caregiver_id and public.can_access_family(c.family_id)));
create policy "Editors manage caregiver languages" on public.caregiver_languages for all to authenticated
using (exists (select 1 from public.caregivers c where c.id = caregiver_id and public.can_edit_family(c.family_id)))
with check (exists (select 1 from public.caregivers c where c.id = caregiver_id and public.can_edit_family(c.family_id)));

create policy "Members read aspirations" on public.aspirations for select to authenticated
using (public.can_access_child(child_id));
create policy "Editors manage aspirations" on public.aspirations for all to authenticated
using (public.can_edit_child(child_id)) with check (public.can_edit_child(child_id));

create policy "Members read language goals" on public.child_language_goals for select to authenticated
using (public.can_access_child(child_id));
create policy "Editors manage language goals" on public.child_language_goals for all to authenticated
using (public.can_edit_child(child_id)) with check (public.can_edit_child(child_id));

create policy "Members read plans" on public.plans for select to authenticated
using (public.can_access_child(child_id));
create policy "Editors manage plans" on public.plans for all to authenticated
using (public.can_edit_child(child_id)) with check (public.can_edit_child(child_id));

create policy "Members read activity instances" on public.activity_instances for select to authenticated
using (public.can_access_child(child_id));
create policy "Editors manage activity instances" on public.activity_instances for all to authenticated
using (public.can_edit_child(child_id)) with check (public.can_edit_child(child_id));

create policy "Members read observations" on public.observations for select to authenticated
using (public.can_access_child(child_id));
create policy "Editors manage observations" on public.observations for all to authenticated
using (public.can_edit_child(child_id)) with check (public.can_edit_child(child_id));

create table public.family_invitations (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  invited_email text not null check (char_length(invited_email) between 3 and 320),
  role text not null check (role in ('caregiver', 'viewer')),
  token uuid not null unique default gen_random_uuid(),
  invited_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz
);

create index family_invitations_family_id_idx on public.family_invitations(family_id);
create index family_invitations_email_idx on public.family_invitations(lower(invited_email));

alter table public.family_invitations enable row level security;

create policy "Owners read family invitations" on public.family_invitations for select to authenticated
using (exists (
  select 1 from public.family_members fm
  where fm.family_id = family_invitations.family_id
    and fm.user_id = auth.uid()
    and fm.role = 'owner'
));

create or replace function public.create_family_invitation(
  p_family_id uuid,
  p_email text,
  p_role text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  normalized_email text := lower(trim(p_email));
  new_token uuid;
begin
  if not exists (
    select 1 from public.family_members
    where family_id = p_family_id and user_id = auth.uid() and role = 'owner'
  ) then raise exception 'Only the family owner can invite members'; end if;
  if normalized_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Enter a valid email address';
  end if;
  if p_role not in ('caregiver', 'viewer') then raise exception 'Invalid family role'; end if;
  if exists (
    select 1 from public.family_members fm
    join auth.users u on u.id = fm.user_id
    where fm.family_id = p_family_id and lower(u.email) = normalized_email
  ) then raise exception 'This person already belongs to the family'; end if;

  update public.family_invitations
  set revoked_at = now()
  where family_id = p_family_id
    and lower(invited_email) = normalized_email
    and accepted_at is null and revoked_at is null;

  insert into public.family_invitations (family_id, invited_email, role, invited_by)
  values (p_family_id, normalized_email, p_role, auth.uid())
  returning token into new_token;
  return new_token;
end;
$$;

create or replace function public.preview_family_invitation(p_token uuid)
returns table(family_name text, invited_email text, role text, expires_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select f.display_name, fi.invited_email, fi.role, fi.expires_at
  from public.family_invitations fi
  join public.families f on f.id = fi.family_id
  where fi.token = p_token
    and fi.accepted_at is null
    and fi.revoked_at is null
    and fi.expires_at > now()
    and lower(fi.invited_email) = lower(coalesce(auth.jwt()->>'email', ''));
$$;

create or replace function public.accept_family_invitation(p_token uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  invitation public.family_invitations%rowtype;
  existing_family_id uuid;
  current_email text := lower(coalesce(auth.jwt()->>'email', ''));
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into invitation from public.family_invitations
  where token = p_token for update;
  if invitation.id is null or invitation.accepted_at is not null or invitation.revoked_at is not null or invitation.expires_at <= now() then
    raise exception 'This invitation is no longer available';
  end if;
  if current_email = '' or current_email <> lower(invitation.invited_email) then
    raise exception 'Sign in with the email address that received this invitation';
  end if;

  select family_id into existing_family_id from public.family_members
  where user_id = auth.uid() limit 1;
  if existing_family_id is not null and existing_family_id <> invitation.family_id then
    raise exception 'This account already belongs to another family';
  end if;
  if existing_family_id is null then
    insert into public.family_members (family_id, user_id, role)
    values (invitation.family_id, auth.uid(), invitation.role);
  end if;

  update public.family_invitations
  set accepted_at = now(), accepted_by = auth.uid()
  where id = invitation.id;
  return invitation.family_id;
end;
$$;

create or replace function public.revoke_family_invitation(p_invitation_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.family_invitations fi
  set revoked_at = now()
  where fi.id = p_invitation_id
    and fi.accepted_at is null
    and exists (
      select 1 from public.family_members fm
      where fm.family_id = fi.family_id and fm.user_id = auth.uid() and fm.role = 'owner'
    );
  if not found then raise exception 'Invitation not found or access denied'; end if;
end;
$$;

create or replace function public.list_family_members(p_family_id uuid)
returns table(user_id uuid, email text, role text, joined_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select fm.user_id, u.email::text, fm.role, fm.created_at
  from public.family_members fm
  join auth.users u on u.id = fm.user_id
  where fm.family_id = p_family_id
    and public.can_access_family(p_family_id)
  order by case fm.role when 'owner' then 1 when 'caregiver' then 2 else 3 end, fm.created_at;
$$;

create or replace function public.remove_family_member(p_family_id uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.family_members
    where family_id = p_family_id and user_id = auth.uid() and role = 'owner'
  ) then raise exception 'Only the family owner can remove members'; end if;
  if p_user_id = auth.uid() then raise exception 'The owner cannot remove themselves'; end if;
  delete from public.family_members
  where family_id = p_family_id and user_id = p_user_id and role <> 'owner';
  if not found then raise exception 'Family member not found'; end if;
end;
$$;

revoke all on function public.create_family_invitation(uuid, text, text) from public;
revoke all on function public.preview_family_invitation(uuid) from public;
revoke all on function public.accept_family_invitation(uuid) from public;
revoke all on function public.revoke_family_invitation(uuid) from public;
revoke all on function public.list_family_members(uuid) from public;
revoke all on function public.remove_family_member(uuid, uuid) from public;
grant execute on function public.create_family_invitation(uuid, text, text) to authenticated;
grant execute on function public.preview_family_invitation(uuid) to authenticated;
grant execute on function public.accept_family_invitation(uuid) to authenticated;
grant execute on function public.revoke_family_invitation(uuid) to authenticated;
grant execute on function public.list_family_members(uuid) to authenticated;
grant execute on function public.remove_family_member(uuid, uuid) to authenticated;

comment on table public.family_invitations is
'Email-specific, seven-day invitation links for joining an existing MIRA family.';
