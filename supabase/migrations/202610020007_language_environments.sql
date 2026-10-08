-- Parent-reported language context. No recommendations, AI transfers or backfill.
alter table public.child_language_goals
  add column environment jsonb,
  add column environment_revision integer not null default 0 check (environment_revision >= 0),
  add column environment_updated_at timestamptz;

-- Actual foreign keys protect JSON references from concurrent caregiver removal.
-- Deferred NO ACTION permits all stages of a family cascade to finish; an
-- individual caregiver deletion still fails when the transaction commits.
create table public.language_environment_caregivers (
  goal_id uuid not null references public.child_language_goals(id) on delete cascade,
  caregiver_id uuid not null references public.caregivers(id) deferrable initially deferred,
  primary key (goal_id, caregiver_id)
);
alter table public.language_environment_caregivers enable row level security;
revoke all on public.language_environment_caregivers from public, anon, authenticated, service_role;

-- Match JavaScript trim for boundary validation without rewriting stored words.
create function public.language_text_trim_internal(p_text text)
returns text language sql immutable set search_path = '' as $$
  select btrim(p_text, U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF');
$$;
revoke all on function public.language_text_trim_internal(text) from public, anon, authenticated, service_role;

create function public.valid_language_environment_internal(p_value jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare
  item jsonb;
  entry jsonb;
  field text;
  seen_ids text[] := '{}';
  seen_contexts text[];
  value_text text;
begin
  if p_value is null then return true; end if;
  if jsonb_typeof(p_value) <> 'object' then return false; end if;
  if not (p_value ?& array['schemaVersion','role','state','variety','oralGoal','literacyGoal','support'])
    or p_value - array['schemaVersion','role','state','variety','oralGoal','literacyGoal','support'] <> '{}'::jsonb
    or p_value->'schemaVersion' <> '1'::jsonb then return false; end if;
  if p_value->'role' <> 'null'::jsonb and (jsonb_typeof(p_value->'role') <> 'string'
    or p_value->>'role' not in ('family','heritage','community','additional','future')) then return false; end if;
  if p_value->'state' <> 'null'::jsonb and (jsonb_typeof(p_value->'state') <> 'string'
    or p_value->>'state' not in ('active','maintenance','future','paused')) then return false; end if;
  foreach field in array array['variety','oralGoal','literacyGoal'] loop
    if p_value->field <> 'null'::jsonb and (jsonb_typeof(p_value->field) <> 'string'
      or length(public.language_text_trim_internal(p_value->>field)) = 0
      or char_length(p_value->>field) > case when field = 'variety' then 100 else 400 end) then return false; end if;
  end loop;
  if p_value->'support' = 'null'::jsonb then return true; end if;
  if jsonb_typeof(p_value->'support') <> 'array' then return false; end if;
  if jsonb_array_length(p_value->'support') > 12 then return false; end if;
  for item in select value from jsonb_array_elements(p_value->'support') loop
    if jsonb_typeof(item) <> 'object' then return false; end if;
    if not (item ?& array['caregiverId','label','comfort','contact','contexts'])
      or item - array['caregiverId','label','comfort','contact','contexts'] <> '{}'::jsonb then return false; end if;
    if item->'caregiverId' <> 'null'::jsonb then
      if jsonb_typeof(item->'caregiverId') <> 'string' or item->>'caregiverId' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then return false; end if;
      value_text := lower(item->>'caregiverId');
      if value_text = any(seen_ids) then return false; end if;
      seen_ids := array_append(seen_ids, value_text);
    end if;
    if jsonb_typeof(item->'label') <> 'string' or length(public.language_text_trim_internal(item->>'label')) = 0 or char_length(item->>'label') > 100 then return false; end if;
    if item->'comfort' <> 'null'::jsonb and (jsonb_typeof(item->'comfort') <> 'string'
      or item->>'comfort' not in ('comfortable','learning','not_comfortable')) then return false; end if;
    if item->'contact' <> 'null'::jsonb and (jsonb_typeof(item->'contact') <> 'string'
      or item->>'contact' not in ('regular','occasional','unavailable')) then return false; end if;
    if jsonb_typeof(item->'contexts') <> 'array' then return false; end if;
    if jsonb_array_length(item->'contexts') > 8 then return false; end if;
    seen_contexts := '{}';
    for entry in select value from jsonb_array_elements(item->'contexts') loop
      if jsonb_typeof(entry) <> 'string' then return false; end if;
      value_text := entry #>> '{}';
      if length(public.language_text_trim_internal(value_text)) = 0 or char_length(value_text) > 120 then return false; end if;
      value_text := lower(public.language_text_trim_internal(value_text));
      if value_text = any(seen_contexts) then return false; end if;
      seen_contexts := array_append(seen_contexts, value_text);
    end loop;
  end loop;
  return true;
end;
$$;
revoke all on function public.valid_language_environment_internal(jsonb) from public, anon, authenticated, service_role;
alter table public.child_language_goals add constraint valid_language_environment
  check (public.valid_language_environment_internal(environment));

-- Legacy setup may remove plain goals, but cannot erase richer context implicitly.
create function public.protect_language_context_internal()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    if old.environment is not null and exists (
      select 1 from public.children c join public.families f on f.id = c.family_id where c.id = old.child_id
    ) then raise exception 'MIRA_LANGUAGE_CLEAR_CONTEXT_FIRST'; end if;
    return old;
  end if;
  if old.environment is not null and (new.id <> old.id or new.child_id <> old.child_id or new.language_code <> old.language_code) then
    raise exception 'MIRA_LANGUAGE_IDENTITY';
  end if;
  return new;
end;
$$;
create trigger protect_language_context before delete or update on public.child_language_goals
for each row execute function public.protect_language_context_internal();

create function public.protect_language_caregiver_internal()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.family_id <> old.family_id and exists (
    select 1 from public.language_environment_caregivers where caregiver_id = old.id
  ) then raise exception 'MIRA_LANGUAGE_CAREGIVER_LINK'; end if;
  return new;
end;
$$;
create trigger protect_language_caregiver before update on public.caregivers
for each row execute function public.protect_language_caregiver_internal();

-- Update references for privileged writes too. Locks block conflicting moves/deletes.
create function public.link_language_caregivers_internal()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target_family uuid; person jsonb; linked_family uuid;
begin
  select family_id into target_family from public.children where id = new.child_id for share;
  delete from public.language_environment_caregivers where goal_id = new.id;
  if new.environment is not null and jsonb_typeof(new.environment->'support') = 'array' then
    for person in select value from jsonb_array_elements(new.environment->'support') loop
      if person->>'caregiverId' is not null then
        select family_id into linked_family from public.caregivers where id = (person->>'caregiverId')::uuid for share;
        if linked_family is null or linked_family <> target_family then raise exception 'MIRA_LANGUAGE_CAREGIVER_LINK'; end if;
        insert into public.language_environment_caregivers(goal_id,caregiver_id) values(new.id,(person->>'caregiverId')::uuid);
      end if;
    end loop;
  end if;
  return new;
end;
$$;
create trigger link_language_caregivers after insert or update of environment on public.child_language_goals
for each row execute function public.link_language_caregivers_internal();

-- Keep the child in its family while it carries linked language context.
create function public.protect_language_child_internal()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.family_id <> old.family_id and exists (
    select 1 from public.child_language_goals where child_id = old.id and environment is not null
  ) then raise exception 'MIRA_LANGUAGE_IDENTITY'; end if;
  return new;
end;
$$;
create trigger protect_language_child before update on public.children
for each row execute function public.protect_language_child_internal();

create function public.save_language_environment(p_child_id uuid, p_goal_id uuid, p_expected_revision integer, p_environment jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare target_family uuid; saved public.child_language_goals%rowtype;
begin
  select family_id into target_family from public.children where id = p_child_id and archived_at is null;
  if target_family is null or not public.can_edit_family(target_family) then raise exception 'MIRA_LANGUAGE_ACCESS'; end if;
  -- Same order as setup: family, then child/goal. Never accepts a caller family ID.
  perform 1 from public.families where id = target_family for update;
  perform 1 from public.children where id = p_child_id and family_id = target_family and archived_at is null for share;
  if not found or not public.can_edit_family(target_family) then raise exception 'MIRA_LANGUAGE_ACCESS'; end if;
  select * into saved from public.child_language_goals where id = p_goal_id and child_id = p_child_id for update;
  if not found then raise exception 'MIRA_LANGUAGE_NOT_FOUND'; end if;
  if p_expected_revision is null or p_expected_revision < 0 or not public.valid_language_environment_internal(p_environment) then raise exception 'MIRA_LANGUAGE_INVALID'; end if;
  -- A just-completed identical retry is a no-op; arbitrary stale/ABA writes fail.
  if saved.environment is not distinct from p_environment and (
    p_expected_revision = saved.environment_revision or p_expected_revision::bigint + 1 = saved.environment_revision
  ) then return saved.environment_revision; end if;
  if p_expected_revision <> saved.environment_revision then raise exception 'MIRA_LANGUAGE_STALE'; end if;
  update public.child_language_goals set environment = p_environment,
    environment_revision = environment_revision + 1, environment_updated_at = now() where id = saved.id;
  return saved.environment_revision + 1;
end;
$$;

-- Existing setup's SECURITY DEFINER function retains its bounded legacy writes.
-- Clients cannot forge revisions, bypass validation, or silently delete context.
revoke insert, update, delete, truncate, references, trigger on public.child_language_goals from public, anon, authenticated, service_role;
revoke all on function public.protect_language_context_internal(), public.protect_language_caregiver_internal(), public.link_language_caregivers_internal(), public.protect_language_child_internal() from public, anon, authenticated, service_role;
revoke all on function public.save_language_environment(uuid,uuid,integer,jsonb) from public, anon, authenticated, service_role;
grant execute on function public.save_language_environment(uuid,uuid,integer,jsonb) to authenticated;
comment on column public.child_language_goals.environment is 'Optional exact parent report. NULL means no saved context; support:null is unknown, support:[] explicitly identifies no support. Not child proficiency, a reviewed activity or AI input.';
