-- Corrections and removal of the exact everyday note a caregiver reviewed.
-- No existing notes, activity observations or plans are rewritten.
begin;

create function public.advance_learning_moment_version_internal()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  new.updated_at := greatest(clock_timestamp(), old.updated_at + interval '1 microsecond');
  return new;
end;
$$;
revoke all on function public.advance_learning_moment_version_internal() from public,anon,authenticated;
create trigger advance_learning_moment_version before update on public.learning_moments
for each row execute function public.advance_learning_moment_version_internal();

create function public.update_learning_moment_checked(
  p_moment_id uuid,p_child_id uuid,p_expected_updated_at timestamptz,
  p_occurred_on date,p_domain text,p_title text,p_note text
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare saved public.learning_moments%rowtype; family_today date;
begin
  if auth.uid() is null or not public.can_edit_child(p_child_id) then raise exception 'Caregiver access required'; end if;
  perform 1 from public.family_members fm join public.children c on c.family_id=fm.family_id
    where c.id=p_child_id and fm.user_id=auth.uid() and fm.role in ('owner','caregiver') for share of fm;
  if not found then raise exception 'Caregiver access required'; end if;
  select * into saved from public.learning_moments where id=p_moment_id and child_id=p_child_id for update;
  if not found then raise exception 'MIRA_MOMENT_NOT_FOUND'; end if;
  if p_expected_updated_at is null or saved.updated_at<>p_expected_updated_at then raise exception 'MIRA_STALE_MOMENT'; end if;
  family_today:=public.child_today_internal(p_child_id);
  -- An old note may be corrected without moving its original date into the
  -- capture window. A changed date follows the existing new-note date policy.
  if p_occurred_on is null or (p_occurred_on is distinct from saved.occurred_on and
    (p_occurred_on>family_today or p_occurred_on<family_today-365)) then raise exception 'MIRA_MOMENT_DATE_INVALID'; end if;
  if p_domain is null or p_domain not in ('everyday','language','movement','sensory','maths','creative','life_skills','nature') then raise exception 'MIRA_MOMENT_AREA_INVALID'; end if;
  if nullif(btrim(p_title),'') is null or char_length(btrim(p_title))>100 then raise exception 'MIRA_MOMENT_TITLE_INVALID'; end if;
  if nullif(btrim(p_note),'') is null or char_length(p_note)>1200 then raise exception 'MIRA_MOMENT_NOTE_INVALID'; end if;
  update public.learning_moments set occurred_on=p_occurred_on,domain=p_domain,title=btrim(p_title),note=p_note
    where id=saved.id returning * into saved;
  -- Keep created_at and recorded_by; never invent a second observation or change
  -- the creation receipt. Retrying creation must not restore the earlier text.
  return jsonb_build_object('updatedAt',saved.updated_at);
end;
$$;

create function public.delete_learning_moment_checked(p_moment_id uuid,p_child_id uuid,p_expected_updated_at timestamptz)
returns boolean language plpgsql security definer set search_path='' as $$
declare saved public.learning_moments%rowtype;
begin
  if auth.uid() is null or not public.can_edit_child(p_child_id) then raise exception 'Caregiver access required'; end if;
  perform 1 from public.family_members fm join public.children c on c.family_id=fm.family_id
    where c.id=p_child_id and fm.user_id=auth.uid() and fm.role in ('owner','caregiver') for share of fm;
  if not found then raise exception 'Caregiver access required'; end if;
  select * into saved from public.learning_moments where id=p_moment_id and child_id=p_child_id for update;
  if not found then raise exception 'MIRA_MOMENT_NOT_FOUND'; end if;
  if p_expected_updated_at is null or saved.updated_at<>p_expected_updated_at then raise exception 'MIRA_STALE_MOMENT'; end if;
  delete from public.learning_moments where id=saved.id;
  -- Existing creation receipts become tombstones through their SET NULL FK.
  return true;
end;
$$;
revoke insert,update,delete on public.learning_moments from public,anon,authenticated;
revoke all on function public.delete_learning_moment(uuid) from public,anon,authenticated;
revoke all on function public.update_learning_moment_checked(uuid,uuid,timestamptz,date,text,text,text) from public,anon,authenticated;
revoke all on function public.delete_learning_moment_checked(uuid,uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.update_learning_moment_checked(uuid,uuid,timestamptz,date,text,text,text) to authenticated;
grant execute on function public.delete_learning_moment_checked(uuid,uuid,timestamptz) to authenticated;
notify pgrst,'reload schema';
commit;
