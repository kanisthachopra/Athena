-- One authorized read of existing family choices. No new personal data or writes.
begin;
create function public.get_family_understanding(p_child_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  if auth.uid() is null or not public.can_access_child(p_child_id) then
    raise exception 'MIRA_UNDERSTANDING_ACCESS';
  end if;
  select jsonb_build_object(
    'schemaVersion',1,'childId',c.id,'familyId',c.family_id,
    'profile',public.learning_profile_snapshot_internal(c.id),
    'directions',public.aspiration_directions_snapshot_internal(c.id),
    'childUpdatedAt',c.updated_at,
    'preferencesUpdatedAt',(select p.updated_at from public.family_preferences p where p.family_id=c.family_id),
    'calendar',jsonb_build_object(
      'timeZone',(select s.time_zone from public.family_calendar_settings s where s.family_id=c.family_id),
      'updatedAt',(select s.updated_at from public.family_calendar_settings s where s.family_id=c.family_id)),
    'hopeDates',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'createdAt',a.created_at,
      'directionUpdatedAt',d.updated_at) order by a.created_at,a.id)
      from public.aspirations a left join public.aspiration_directions d on d.aspiration_id=a.id
      where a.child_id=c.id),'[]'::jsonb),
    'people',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.display_name,
      'relationship',p.relationship,'createdAt',p.created_at) order by p.created_at,p.id)
      from public.caregivers p where p.family_id=c.family_id),'[]'::jsonb),
    'languages',coalesce((select jsonb_agg(jsonb_build_object('id',g.id,'childId',g.child_id,
      'language',g.language_code,'environment',g.environment,'createdAt',g.created_at,
      'updatedAt',g.environment_updated_at) order by g.created_at,g.id)
      from public.child_language_goals g where g.child_id=c.id),'[]'::jsonb)
  ) into result from public.children c where c.id=p_child_id and c.archived_at is null;
  if result is null then raise exception 'MIRA_UNDERSTANDING_NOT_FOUND'; end if;
  return result;
end;
$$;
revoke all on function public.get_family_understanding(uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_family_understanding(uuid) to authenticated;
comment on function public.get_family_understanding(uuid) is
'Read-only, member-authorized coherent overview of existing profile, explicit directions and language context. No model input, journal text, inferred ability, historical edit log or new persisted summary.';
notify pgrst,'reload schema';
commit;
