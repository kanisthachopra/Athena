-- MIRA Milestone 9: a learning profile that can be faithfully read and replaced.

create or replace function public.configure_learning_profile(
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
declare
  primary_caregiver_id uuid;
begin
  if not public.can_edit_family(p_family_id) then raise exception 'Caregiver access required'; end if;
  if not exists (
    select 1 from public.children
    where id = p_child_id and family_id = p_family_id and archived_at is null
  ) then raise exception 'Active child profile not found'; end if;
  if p_screen_policy not in ('minimal_child_screen', 'selective', 'no_preference') then
    raise exception 'Choose a valid screen preference';
  end if;
  if p_structure_level not in ('light', 'balanced', 'structured') then
    raise exception 'Choose a valid structure level';
  end if;
  if p_weekday_minutes not between 0 and 180 or p_weekend_minutes not between 0 and 240 then
    raise exception 'Choose a valid weekly rhythm';
  end if;
  if cardinality(coalesce(p_aspirations, '{}'::text[])) < 1
    or cardinality(coalesce(p_aspirations, '{}'::text[])) > 8 then
    raise exception 'Choose between one and eight hopes';
  end if;
  if exists (
    select 1 from unnest(coalesce(p_aspirations, '{}'::text[])) as item
    where nullif(trim(item), '') is null or char_length(trim(item)) > 80
  ) then raise exception 'Each hope must be between 1 and 80 characters'; end if;
  if cardinality(coalesce(p_caregiver_languages, '{}'::text[])) > 8
    or cardinality(coalesce(p_language_goals, '{}'::text[])) > 8 then
    raise exception 'Use no more than eight languages';
  end if;
  if exists (
    select 1
    from unnest(coalesce(p_caregiver_languages, '{}'::text[]) || coalesce(p_language_goals, '{}'::text[])) as item
    where nullif(trim(item), '') is null or char_length(trim(item)) > 60
  ) then raise exception 'Each language must be between 1 and 60 characters'; end if;
  if nullif(trim(p_caregiver_name), '') is not null and char_length(trim(p_caregiver_name)) > 60 then
    raise exception 'Caregiver name is too long';
  end if;
  if nullif(trim(p_relationship), '') is not null and char_length(trim(p_relationship)) > 60 then
    raise exception 'Relationship is too long';
  end if;

  insert into public.family_preferences
    (family_id, screen_policy, structure_level, weekday_minutes, weekend_minutes, prefer_embedded_learning, updated_at)
  values
    (p_family_id, p_screen_policy, p_structure_level, p_weekday_minutes, p_weekend_minutes, p_prefer_embedded, now())
  on conflict (family_id) do update set
    screen_policy = excluded.screen_policy,
    structure_level = excluded.structure_level,
    weekday_minutes = excluded.weekday_minutes,
    weekend_minutes = excluded.weekend_minutes,
    prefer_embedded_learning = excluded.prefer_embedded_learning,
    updated_at = now();

  delete from public.aspirations where child_id = p_child_id;
  insert into public.aspirations (child_id, title)
  select p_child_id, min(trim(item))
  from unnest(p_aspirations) as item
  group by lower(trim(item));

  delete from public.child_language_goals where child_id = p_child_id;
  insert into public.child_language_goals (child_id, language_code)
  select p_child_id, lower(trim(item))
  from unnest(coalesce(p_language_goals, '{}'::text[])) as item
  where nullif(trim(item), '') is not null
  group by lower(trim(item));

  -- The product currently models one primary learning caregiver for the household.
  -- Replacing this row prevents repeated profile edits from creating duplicates.
  delete from public.caregivers where family_id = p_family_id;
  if nullif(trim(p_caregiver_name), '') is not null then
    insert into public.caregivers (family_id, display_name, relationship)
    values (p_family_id, trim(p_caregiver_name), nullif(trim(p_relationship), ''))
    returning id into primary_caregiver_id;

    insert into public.caregiver_languages (caregiver_id, language_code)
    select primary_caregiver_id, lower(trim(item))
    from unnest(coalesce(p_caregiver_languages, '{}'::text[])) as item
    where nullif(trim(item), '') is not null
    group by lower(trim(item));
  end if;
end;
$$;

revoke all on function public.configure_learning_profile(uuid, uuid, text, text, integer, integer, boolean, text, text, text[], text[], text[]) from public;
grant execute on function public.configure_learning_profile(uuid, uuid, text, text, integer, integer, boolean, text, text, text[], text[], text[]) to authenticated;

comment on function public.configure_learning_profile(uuid, uuid, text, text, integer, integer, boolean, text, text, text[], text[], text[]) is
'Atomically replaces the editable family rhythm, child hopes, language goals, and primary caregiver profile.';
