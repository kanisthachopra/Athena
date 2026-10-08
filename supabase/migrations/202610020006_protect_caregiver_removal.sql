-- A blank name must not remove successive caregivers on retries.
-- Replaces only the save function; no existing records are changed.
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
  normalized_hopes text[];
  normalized_goals text[];
  normalized_languages text[];
begin
  if not public.can_edit_family(p_family_id) then raise exception 'Caregiver access required'; end if;
  -- Serialize profile saves for this family, including first-time caregiver creation.
  perform 1 from public.families where id = p_family_id for update;
  if not public.can_edit_family(p_family_id) then raise exception 'Caregiver access required'; end if;
  if not exists (
    select 1 from public.children
    where id = p_child_id and family_id = p_family_id and archived_at is null
  ) then raise exception 'Active child profile not found'; end if;
  if p_screen_policy is null or p_screen_policy not in ('minimal_child_screen', 'selective', 'no_preference') then
    raise exception 'Choose a valid screen preference';
  end if;
  if p_structure_level is null or p_structure_level not in ('light', 'balanced', 'structured') then
    raise exception 'Choose a valid structure level';
  end if;
  if p_weekday_minutes is null or p_weekend_minutes is null or p_prefer_embedded is null
    or p_weekday_minutes not between 0 and 180 or p_weekend_minutes not between 0 and 240 then
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

  select coalesce(array_agg(min_name), '{}'::text[]) into normalized_hopes
  from (select min(trim(item)) min_name from unnest(p_aspirations) item group by lower(trim(item))) names;
  select coalesce(array_agg(distinct lower(trim(item))), '{}'::text[]) into normalized_goals
  from unnest(coalesce(p_language_goals, '{}'::text[])) item;
  select coalesce(array_agg(distinct lower(trim(item))), '{}'::text[]) into normalized_languages
  from unnest(coalesce(p_caregiver_languages, '{}'::text[])) item;
  if nullif(trim(p_caregiver_name), '') is null and cardinality(normalized_languages) > 0 then
    raise exception 'Name the caregiver for these languages';
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

  -- Explicit removals remain removals; retained rows keep identity and metadata.
  delete from public.aspirations a where a.child_id = p_child_id
    and not exists (select 1 from unnest(normalized_hopes) item where lower(trim(a.title)) = lower(item));
  insert into public.aspirations (child_id, title)
  select p_child_id, item from unnest(normalized_hopes) item
  where not exists (select 1 from public.aspirations a where a.child_id = p_child_id and lower(trim(a.title)) = lower(item));

  delete from public.child_language_goals g where g.child_id = p_child_id
    and not (lower(trim(g.language_code)) = any(normalized_goals));
  insert into public.child_language_goals (child_id, language_code)
  select p_child_id, item from unnest(normalized_goals) item
  where not exists (select 1 from public.child_language_goals g where g.child_id = p_child_id and lower(trim(g.language_code)) = item);

  -- The current setup form edits only the oldest caregiver, not all caregivers.
  -- Tie-breaking matches the page loader; no secondary caregiver is replaced.
  select id into primary_caregiver_id from public.caregivers
    where family_id = p_family_id order by created_at, id limit 1 for update;
  if nullif(trim(p_caregiver_name), '') is null then
    if primary_caregiver_id is not null then
      raise exception 'Keep a name for this caregiver. Removing a caregiver requires a separate action.';
    end if;
  else
    if primary_caregiver_id is null then
      insert into public.caregivers (family_id, display_name, relationship)
      values (p_family_id, trim(p_caregiver_name), nullif(trim(p_relationship), ''))
      returning id into primary_caregiver_id;
    else
      update public.caregivers set display_name = trim(p_caregiver_name),
        relationship = nullif(trim(p_relationship), '') where id = primary_caregiver_id;
    end if;
    delete from public.caregiver_languages l where l.caregiver_id = primary_caregiver_id
      and not (lower(trim(l.language_code)) = any(normalized_languages));
    insert into public.caregiver_languages (caregiver_id, language_code, proficiency, proficiency_reported)
    select primary_caregiver_id, item, null, false from unnest(normalized_languages) item
    where not exists (select 1 from public.caregiver_languages l
      where l.caregiver_id = primary_caregiver_id and lower(trim(l.language_code)) = item);
  end if;
end;
$$;

revoke all on function public.configure_learning_profile(uuid, uuid, text, text, integer, integer, boolean, text, text, text[], text[], text[]) from public, anon, service_role;
grant execute on function public.configure_learning_profile(uuid, uuid, text, text, integer, integer, boolean, text, text, text[], text[], text[]) to authenticated;

comment on function public.configure_learning_profile(uuid, uuid, text, text, integer, integer, boolean, text, text, text[], text[], text[]) is
'Atomically updates retained profile identities without deleting caregivers. Blank existing-caregiver names fail without changes. Language comfort is unknown until explicitly reported. Does not mutate plans.';
