-- Reviewed context questions + explicit caregiver reports. No defaults/backfill,
-- content approvals or changes to existing plans/observations.
begin;
alter table public.activity_templates add column context_requirements jsonb;

create function public.activity_context_contract_valid_internal(c jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare q jsonb; category text; ids text[]:='{}'; covered text[]:='{}'; reason jsonb;
begin
  if c is null or jsonb_typeof(c)<>'object' then return false; end if;
  if (select array_agg(k order by k) from jsonb_object_keys(c) k) is distinct from array['checks','max_valid_days','not_required','schema_version'] then return false; end if;
  if c->'schema_version'<>'1'::jsonb or jsonb_typeof(c->'max_valid_days')<>'number' or (c->>'max_valid_days')!~'^[1-7]$'
    or jsonb_typeof(c->'checks')<>'array' or jsonb_typeof(c->'not_required')<>'object' then return false; end if;
  if jsonb_array_length(c->'checks') not between 1 and 12 then return false; end if;
  for q in select value from jsonb_array_elements(c->'checks') loop
    if jsonb_typeof(q)<>'object' then return false; end if;
    if (select array_agg(k order by k) from jsonb_object_keys(q) k) is distinct from array['category','id','statement'] then return false; end if;
    if jsonb_typeof(q->'id')<>'string' or (q->>'id')!~'^[a-z][a-z0-9_]{0,59}$' or q->>'id'=any(ids)
      or jsonb_typeof(q->'category')<>'string' or q->>'category' not in ('materials','environment','supervision','readiness','restrictions')
      or jsonb_typeof(q->'statement')<>'string' or length(btrim(q->>'statement')) not between 1 and 600 then return false; end if;
    ids:=array_append(ids,q->>'id'); covered:=array_append(covered,q->>'category');
  end loop;
  if not ('supervision'=any(covered)) then return false; end if;
  for category,reason in select key,value from jsonb_each(c->'not_required') loop
    if category not in ('materials','environment','supervision','readiness','restrictions') or category=any(covered)
      or jsonb_typeof(reason)<>'string' or length(btrim(reason#>>'{}')) not between 1 and 1200 then return false; end if;
  end loop;
  foreach category in array array['materials','environment','supervision','readiness','restrictions'] loop
    if not (category=any(covered)) and not (c->'not_required' ? category) then return false; end if;
  end loop;
  return true;
end;
$$;
revoke all on function public.activity_context_contract_valid_internal(jsonb) from public,anon,authenticated;

create table public.activity_context_confirmations (
  child_id uuid not null references public.children(id) on delete cascade,
  template_id uuid not null references public.activity_templates(id) on delete cascade,
  content_version integer not null check(content_version>0),
  contract jsonb not null,
  answers jsonb not null check(jsonb_typeof(answers)='object'),
  valid_from date not null, valid_until date not null check(valid_until>=valid_from and valid_until-valid_from<=6),
  revision integer not null check(revision>0),
  confirmed_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key(child_id,template_id)
);
alter table public.activity_context_confirmations enable row level security;
revoke all on public.activity_context_confirmations from public,anon,authenticated;
grant select on public.activity_context_confirmations to authenticated;
create policy "Members read child activity context" on public.activity_context_confirmations for select to authenticated using(public.can_access_child(child_id));

create function public.advance_context_version_internal() returns trigger
language plpgsql set search_path='' as $$
begin
  if new.context_requirements is distinct from old.context_requirements then
    new.content_version:=greatest(new.content_version,old.content_version+1);
  end if;
  return new;
end;
$$;
revoke all on function public.advance_context_version_internal() from public,anon,authenticated;
create trigger activity_context_version before update on public.activity_templates for each row execute function public.advance_context_version_internal();

create function public.activity_context_block_reason_internal(p_child_id uuid,p_template_id uuid,p_on_date date)
returns text language plpgsql stable security definer set search_path='' as $$
declare t public.activity_templates; r public.activity_context_confirmations;
begin
  select * into t from public.activity_templates where id=p_template_id;
  if not public.activity_context_contract_valid_internal(t.context_requirements) then return 'MIRA_CONTEXT_REQUIREMENTS_UNREVIEWED'; end if;
  select * into r from public.activity_context_confirmations where child_id=p_child_id and template_id=p_template_id;
  if r.child_id is null or r.content_version<>t.content_version or r.contract is distinct from t.context_requirements
    or p_on_date is null or r.valid_from>p_on_date or r.valid_until<greatest(current_date,p_on_date)
    or r.valid_until-r.valid_from>= (t.context_requirements->>'max_valid_days')::integer then return 'MIRA_CONTEXT_REQUIRED'; end if;
  if exists(select 1 from jsonb_array_elements(t.context_requirements->'checks') q where r.answers->(q->>'id') is distinct from 'true'::jsonb) then return 'MIRA_CONTEXT_NOT_CONFIRMED'; end if;
  return null;
end;
$$;
revoke all on function public.activity_context_block_reason_internal(uuid,uuid,date) from public,anon,authenticated;

-- All candidate paths (planner, replacement, bookmark, Guide, current-use check)
-- share this final context guard. Do not weaken the earlier checks.
do $$ declare definition text; begin
  select pg_get_functiondef('public.activity_candidate_block_reason_internal(uuid,uuid,date)'::regprocedure) into definition;
  if position('  return null;' in definition)=0 or position('MIRA_SCREEN_PREFERENCE' in definition)=0 then raise exception 'MIRA_CONTEXT_MIGRATION_CHANGED'; end if;
  definition:=replace(definition,'  return null;','  return public.activity_context_block_reason_internal(p_child_id,p_template_id,p_on_date);'); execute definition;
end; $$;
revoke all on function public.activity_candidate_block_reason_internal(uuid,uuid,date) from public,anon,authenticated;

create function public.get_activity_context_options(p_child_id uuid,p_on_date date default current_date)
returns table(template_id uuid,title text,content_version integer,contract jsonb,confirmation jsonb)
language plpgsql stable security definer set search_path='' as $$
begin
  if not public.can_access_child(p_child_id) then raise exception 'Family access required'; end if;
  if p_on_date is null then raise exception 'Choose an activity date'; end if;
  return query select t.id,t.title,t.content_version,t.context_requirements,
    case when r.child_id is null then null else jsonb_build_object('revision',r.revision,'content_version',r.content_version,'answers',r.answers,'valid_from',r.valid_from,'valid_until',r.valid_until) end
    from public.activity_templates t left join public.activity_context_confirmations r on r.child_id=p_child_id and r.template_id=t.id
    where coalesce(public.activity_candidate_block_reason_internal(p_child_id,t.id,p_on_date),'') in ('','MIRA_CONTEXT_REQUIRED','MIRA_CONTEXT_NOT_CONFIRMED') order by t.title,t.id;
end;
$$;
revoke all on function public.get_activity_context_options(uuid,date) from public,anon,authenticated;
grant execute on function public.get_activity_context_options(uuid,date) to authenticated;

create function public.save_activity_context(p_child_id uuid,p_template_id uuid,p_content_version integer,
  p_expected_contract jsonb,p_expected_revision integer,p_valid_from date,p_valid_until date,p_answers jsonb)
returns integer language plpgsql security definer set search_path='' as $$
declare t public.activity_templates; r public.activity_context_confirmations; reason text; next_revision integer;
begin
  if not public.can_edit_child(p_child_id) then raise exception 'Caregiver access required'; end if;
  select * into t from public.activity_templates where id=p_template_id for share;
  if t.id is null or p_content_version is distinct from t.content_version or p_expected_contract is distinct from t.context_requirements then raise exception 'MIRA_CONTEXT_TEMPLATE_CHANGED'; end if;
  if not public.activity_context_contract_valid_internal(t.context_requirements) then raise exception 'MIRA_CONTEXT_REQUIREMENTS_UNREVIEWED'; end if;
  if p_valid_from is null or p_valid_until is null or p_valid_from<current_date or p_valid_from>current_date+14
    or p_valid_until<p_valid_from or p_valid_until-p_valid_from>=(t.context_requirements->>'max_valid_days')::integer then raise exception 'MIRA_CONTEXT_INVALID_DATES'; end if;
  if p_expected_revision is null or p_expected_revision<0 or p_answers is null or jsonb_typeof(p_answers)<>'object' then raise exception 'MIRA_CONTEXT_INVALID_ANSWERS'; end if;
  if (select count(*) from jsonb_object_keys(p_answers))<>jsonb_array_length(t.context_requirements->'checks')
    or exists(select 1 from jsonb_array_elements(t.context_requirements->'checks') q where not(p_answers ? (q->>'id')) or jsonb_typeof(p_answers->(q->>'id')) not in ('boolean','null')) then raise exception 'MIRA_CONTEXT_INVALID_ANSWERS'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_child_id::text||p_template_id::text,13013));
  select * into r from public.activity_context_confirmations where child_id=p_child_id and template_id=p_template_id for update;
  if coalesce(r.revision,0)<>p_expected_revision then raise exception 'MIRA_CONTEXT_STALE'; end if;
  reason:=public.activity_candidate_block_reason_internal(p_child_id,p_template_id,p_valid_from);
  if reason is not null and reason not in ('MIRA_CONTEXT_REQUIRED','MIRA_CONTEXT_NOT_CONFIRMED') then raise exception '%',reason; end if;
  next_revision:=coalesce(r.revision,0)+1;
  insert into public.activity_context_confirmations(child_id,template_id,content_version,contract,answers,valid_from,valid_until,revision,confirmed_by)
    values(p_child_id,p_template_id,t.content_version,t.context_requirements,p_answers,p_valid_from,p_valid_until,next_revision,auth.uid())
    on conflict(child_id,template_id) do update set content_version=excluded.content_version,contract=excluded.contract,answers=excluded.answers,
      valid_from=excluded.valid_from,valid_until=excluded.valid_until,revision=excluded.revision,confirmed_by=excluded.confirmed_by,updated_at=now();
  return next_revision;
end;
$$;
revoke all on function public.save_activity_context(uuid,uuid,integer,jsonb,integer,date,date,jsonb) from public,anon,authenticated;
grant execute on function public.save_activity_context(uuid,uuid,integer,jsonb,integer,date,date,jsonb) to authenticated;

-- New selections preserve the caregiver's actual answers as provenance. Never
-- infer old answers or rewrite historical snapshots. Locks serialize a context
-- update with this selection; the deferred candidate guard rechecks eligibility.
do $$ declare definition text; begin
  select pg_get_functiondef('public.preserve_activity_content_internal()'::regprocedure) into definition;
  if position('  -- No reviewed personalisation contract exists yet.' in definition)=0 or position('''schema_version'',2,' in definition)=0 then raise exception 'MIRA_CONTEXT_CAPTURE_CHANGED'; end if;
  definition:=replace(definition,'  -- No reviewed personalisation contract exists yet.',E'  perform child_id from public.activity_context_confirmations where child_id=new.child_id and template_id=item.id for share;\n  evidence_reason:=public.activity_context_block_reason_internal(new.child_id,item.id,new.scheduled_date);\n  if evidence_reason is not null then raise exception ''%'',evidence_reason; end if;\n  -- No reviewed personalisation contract exists yet.');
  definition:=replace(definition,'''schema_version'',2,','''schema_version'',2,''family_context'',(select to_jsonb(c) from public.activity_context_confirmations c where c.child_id=new.child_id and c.template_id=item.id),');
  execute definition;
end; $$;
revoke all on function public.preserve_activity_content_internal() from public,anon,authenticated;
comment on column public.activity_templates.context_requirements is 'Exact-version reviewed questions and explicit not-required rationales. Missing contract blocks new selection. Parent confirmations report context; they cannot approve content or relax hazards.';
-- New explanations name the actual expanded gate. Stored explanations stay intact.
do $$ declare definition text; begin
  select pg_get_functiondef('public.populate_weekly_portfolio_internal(uuid,uuid,date,uuid)'::regprocedure) into definition;
  definition:=replace(definition,'Selected from version-reviewed options within the saved age range, this day’s time and screen preferences.',
    'Selected from version-reviewed options within the saved age range, this day’s time and screen preferences, and the caregiver-confirmed context window.');
  definition:=replace(definition,'No version-reviewed activity met the current age, day-specific time and screen checks. No substitute was invented.',
    'No reviewed activity passed all current eligibility checks, including required family context. No substitute was invented.');
  execute definition;
end; $$;
revoke all on function public.populate_weekly_portfolio_internal(uuid,uuid,date,uuid) from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
