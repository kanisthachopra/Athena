-- Read and correct one coherent learning-profile snapshot. No data backfill.
begin;

create function public.learning_profile_snapshot_internal(p_child_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
  with source as (
    select c.id child_id,c.family_id,c.updated_at child_version,
      (select to_jsonb(p) from public.family_preferences p where p.family_id=c.family_id) preferences,
      coalesce((select jsonb_agg(to_jsonb(a) order by a.created_at,a.id) from public.aspirations a where a.child_id=c.id),'[]'::jsonb) hopes,
      coalesce((select jsonb_agg(to_jsonb(g) order by g.created_at,g.id) from public.child_language_goals g where g.child_id=c.id),'[]'::jsonb) goals,
      coalesce((select jsonb_agg(to_jsonb(person)||jsonb_build_object('languages',
        coalesce((select jsonb_agg(to_jsonb(l) order by l.id) from public.caregiver_languages l where l.caregiver_id=person.id),'[]'::jsonb))
        order by person.created_at,person.id) from public.caregivers person where person.family_id=c.family_id),'[]'::jsonb) people
    from public.children c where c.id=p_child_id and c.archived_at is null
  )
  select jsonb_build_object(
    'childId',child_id,'familyId',family_id,
    'version',encode(sha256(convert_to(to_jsonb(source)::text,'UTF8')),'hex'),
    'configured',preferences is not null,
    'initial',jsonb_build_object(
      'screen_policy',preferences->'screen_policy','structure_level',preferences->'structure_level',
      'weekday_minutes',preferences->'weekday_minutes','weekend_minutes',preferences->'weekend_minutes',
      'prefer_embedded_learning',preferences->'prefer_embedded_learning',
      'aspirations',coalesce((select jsonb_agg(item->'title') from jsonb_array_elements(hopes) item),'[]'::jsonb),
      'languageGoals',coalesce((select jsonb_agg(item->'language_code') from jsonb_array_elements(goals) item),'[]'::jsonb),
      'caregiverName',coalesce(people->0->>'display_name',''),
      'relationship',coalesce(people->0->>'relationship',''),
      'caregiverLanguages',coalesce((select jsonb_agg(item->'language_code') from jsonb_array_elements(people->0->'languages') item),'[]'::jsonb)
    )
  ) from source;
$$;
revoke all on function public.learning_profile_snapshot_internal(uuid) from public,anon,authenticated,service_role;

create function public.get_learning_profile_snapshot(p_child_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  if auth.uid() is null or not public.can_access_child(p_child_id) then raise exception 'Family access required'; end if;
  result:=public.learning_profile_snapshot_internal(p_child_id);
  if result is null then raise exception 'MIRA_PROFILE_NOT_FOUND'; end if;
  return result;
end;
$$;
revoke all on function public.get_learning_profile_snapshot(uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_learning_profile_snapshot(uuid) to authenticated;

create function public.configure_learning_profile_checked(
  p_family_id uuid,p_child_id uuid,p_expected_version text,
  p_screen_policy text,p_structure_level text,p_weekday_minutes integer,p_weekend_minutes integer,
  p_prefer_embedded boolean,p_caregiver_name text,p_relationship text,
  p_caregiver_languages text[],p_aspirations text[],p_language_goals text[]
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare prior jsonb; result jsonb;
begin
  if auth.uid() is null or not public.can_edit_family(p_family_id) then raise exception 'Caregiver access required'; end if;
  -- All supported setup/language writers already use this family-first lock.
  perform 1 from public.families where id=p_family_id for update;
  perform 1 from public.family_members where family_id=p_family_id and user_id=auth.uid() and role in ('owner','caregiver') for share;
  if not found then raise exception 'Caregiver access required'; end if;
  perform 1 from public.children where id=p_child_id and family_id=p_family_id and archived_at is null for share;
  if not found then raise exception 'MIRA_PROFILE_NOT_FOUND'; end if;
  prior:=public.learning_profile_snapshot_internal(p_child_id);
  if p_expected_version is null or p_expected_version !~ '^[0-9a-f]{64}$' or p_expected_version<>prior->>'version' then
    raise exception 'MIRA_PROFILE_STALE';
  end if;
  perform public.configure_learning_profile(p_family_id,p_child_id,p_screen_policy,p_structure_level,
    p_weekday_minutes,p_weekend_minutes,p_prefer_embedded,p_caregiver_name,p_relationship,
    p_caregiver_languages,p_aspirations,p_language_goals);
  result:=public.learning_profile_snapshot_internal(p_child_id);
  return jsonb_build_object('version',result->>'version','createdProfile',not (prior->>'configured')::boolean);
end;
$$;
revoke all on function public.configure_learning_profile_checked(uuid,uuid,text,text,text,integer,integer,boolean,text,text,text[],text[],text[]) from public,anon,authenticated,service_role;
grant execute on function public.configure_learning_profile_checked(uuid,uuid,text,text,text,integer,integer,boolean,text,text,text[],text[],text[]) to authenticated;
revoke all on function public.configure_learning_profile(uuid,uuid,text,text,integer,integer,boolean,text,text,text[],text[],text[]) from public,anon,authenticated,service_role;
-- Do not permit a direct client write to race past the checked family lock.
revoke insert,update,delete on public.family_preferences,public.caregivers,public.caregiver_languages,public.aspirations from public,anon,authenticated,service_role;
comment on function public.get_learning_profile_snapshot(uuid) is
'One consistent parent-reported setup snapshot and opaque version; no new persisted profile, model input or content approval. Includes current saved context in the version so older forms cannot delete later details.';
notify pgrst,'reload schema';
commit;
