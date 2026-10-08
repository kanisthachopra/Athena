-- Add one catalog language without resubmitting the whole learning profile.
-- No existing rows, plans, AI permissions or content approvals are changed.
create table public.language_add_requests (
  child_id uuid not null references public.children(id) on delete cascade,
  request_id uuid not null,
  language_code text not null,
  goal_id uuid not null,
  primary key (child_id, request_id)
);
alter table public.language_add_requests enable row level security;
revoke all on public.language_add_requests from public, anon, authenticated, service_role;
-- goal_id deliberately has no FK: retain the receipt if the goal is later removed,
-- so a delayed retry cannot recreate it. Receipts disappear with their child.

create function public.add_family_language(p_child_id uuid, p_request_id uuid, p_language_code text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare target_family uuid; language_name text; receipt public.language_add_requests%rowtype; new_goal uuid;
begin
  select family_id into target_family from public.children where id = p_child_id and archived_at is null;
  if target_family is null or not public.can_edit_family(target_family) then raise exception 'MIRA_LANGUAGE_ACCESS'; end if;
  perform 1 from public.families where id = target_family for update;
  perform 1 from public.children where id = p_child_id and family_id = target_family and archived_at is null for share;
  if not found or not public.can_edit_family(target_family) then raise exception 'MIRA_LANGUAGE_ACCESS'; end if;
  select label into language_name from (values
    ('en','English'),('hi','Hindi'),('bn','Bengali'),('ta','Tamil'),
    ('te','Telugu'),('mr','Marathi'),('gu','Gujarati'),('kn','Kannada'),
    ('ml','Malayalam'),('pa','Punjabi'),('ur','Urdu'),('or','Odia'),
    ('as','Assamese'),('ne','Nepali'),('si','Sinhala'),('kok','Konkani'),
    ('mai','Maithili'),('sd','Sindhi'),('sa','Sanskrit'),('ks','Kashmiri'),
    ('ar','Arabic'),('zh','Chinese'),('fa','Persian'),('es','Spanish'),
    ('fr','French'),('de','German'),('it','Italian'),('pt','Portuguese'),
    ('ru','Russian'),('ja','Japanese'),('ko','Korean'),('vi','Vietnamese'),
    ('th','Thai'),('id','Indonesian'),('ms','Malay'),('tr','Turkish'),
    ('sw','Swahili'),('nl','Dutch'),('pl','Polish'),('he','Hebrew')
  ) catalog(code,label) where code = p_language_code;
  if p_request_id is null or language_name is null then raise exception 'MIRA_LANGUAGE_INVALID'; end if;
  select * into receipt from public.language_add_requests where child_id = p_child_id and request_id = p_request_id;
  if found then
    if receipt.language_code <> p_language_code then raise exception 'MIRA_LANGUAGE_REQUEST_CHANGED'; end if;
    perform 1 from public.child_language_goals where id = receipt.goal_id and child_id = p_child_id and language_code = p_language_code;
    if not found then raise exception 'MIRA_LANGUAGE_REQUEST_RETIRED'; end if;
    return receipt.goal_id;
  end if;
  -- Detect an exact code or catalog-name duplicate, but never rename/merge
  -- legacy free text or guess equivalence for varieties and other scripts.
  if exists (select 1 from public.child_language_goals where child_id = p_child_id
    and lower(public.language_text_trim_internal(language_code)) in (p_language_code, lower(language_name)))
  then raise exception 'MIRA_LANGUAGE_EXISTS'; end if;
  insert into public.child_language_goals(child_id, language_code, environment)
  values (p_child_id, p_language_code,
    '{"schemaVersion":1,"role":null,"state":null,"variety":null,"oralGoal":null,"literacyGoal":null,"support":null}'::jsonb)
  returning id into new_goal;
  -- Explicitly unknown details engage the existing stale-setup deletion guard;
  -- adding a language asserts no speaker, proficiency, aspiration or routine.
  insert into public.language_add_requests values(p_child_id,p_request_id,p_language_code,new_goal);
  return new_goal;
end;
$$;
revoke all on function public.add_family_language(uuid,uuid,text) from public, anon, authenticated, service_role;
grant execute on function public.add_family_language(uuid,uuid,text) to authenticated;
comment on table public.language_add_requests is 'Private child-scoped retry receipts. No profile text. Retained after goal removal to prevent delayed recreation; deleted with the child.';
