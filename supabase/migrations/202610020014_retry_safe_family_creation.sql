-- Atomic, retry-safe first-family and additional-child creation.
-- No existing family/child/plan rows are rewritten.
begin;
create table public.profile_creation_requests (
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  operation text not null check(operation in ('family','child')),
  family_id uuid references public.families(id) on delete set null,
  child_id uuid references public.children(id) on delete set null,
  payload_digest text not null,
  created_at timestamptz not null default now(),
  primary key(user_id,request_id)
);
alter table public.profile_creation_requests enable row level security;
revoke all on public.profile_creation_requests from public,anon,authenticated,service_role;

create function public.validate_birth_context_internal(p_year integer,p_month integer,p_today date)
returns void language plpgsql security definer set search_path='' as $$
begin
  if p_today is null or p_year is null or p_month is null or p_month not between 1 and 12
    or p_year not between extract(year from p_today)::integer-18 and extract(year from p_today)::integer then
    raise exception 'MIRA_INVALID_BIRTH_CONTEXT';
  end if;
  if make_date(p_year,p_month,1)>p_today then raise exception 'MIRA_FUTURE_BIRTH_MONTH'; end if;
end;
$$;
revoke all on function public.validate_birth_context_internal(integer,integer,date) from public,anon,authenticated,service_role;

create function public.create_family_with_child_checked(
  p_request_id uuid,p_display_name text,p_child_nickname text,p_birth_year integer,p_birth_month integer
)
returns uuid language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid(); receipt public.profile_creation_requests%rowtype;
  payload text; new_family uuid; new_child uuid;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  if p_request_id is null then raise exception 'MIRA_CREATION_REQUEST_REQUIRED'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(caller::text,20014));
  -- Salt the digest with the request ID; do not retain another copy of names.
  payload:=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
    jsonb_build_array(caller,p_request_id,'family',btrim(p_display_name),btrim(p_child_nickname),p_birth_year,p_birth_month)::text,'UTF8')),'hex');
  select * into receipt from public.profile_creation_requests where user_id=caller and request_id=p_request_id;
  if found then
    if receipt.operation<>'family' or receipt.payload_digest<>payload then raise exception 'MIRA_CREATION_REQUEST_CHANGED'; end if;
    if receipt.family_id is null or receipt.child_id is null then raise exception 'MIRA_CREATION_REMOVED'; end if;
    if not exists(select 1 from public.family_members where family_id=receipt.family_id and user_id=caller and role='owner') then
      raise exception 'Family owner access required';
    end if;
    -- Recovery does not overwrite later edits, restore an archive or switch children.
    return receipt.family_id;
  end if;
  if exists(select 1 from public.family_members where user_id=caller) then raise exception 'MIRA_FAMILY_ALREADY_EXISTS'; end if;
  if nullif(btrim(p_display_name),'') is null or char_length(btrim(p_display_name))>80
    or nullif(btrim(p_child_nickname),'') is null or char_length(btrim(p_child_nickname))>60 then
    raise exception 'MIRA_INVALID_PROFILE_NAMES';
  end if;
  -- No family setting exists yet. Initial setup uses explicitly disclosed UTC.
  perform public.validate_birth_context_internal(p_birth_year,p_birth_month,(now() at time zone 'UTC')::date);
  insert into public.families(display_name) values(btrim(p_display_name)) returning id into new_family;
  -- Existing unique user membership index is the final boundary against a
  -- concurrent invitation or another creation path. A conflict rolls back all.
  insert into public.family_members(family_id,user_id,role) values(new_family,caller,'owner');
  insert into public.children(family_id,nickname,birth_year,birth_month)
    values(new_family,btrim(p_child_nickname),p_birth_year,p_birth_month) returning id into new_child;
  insert into public.user_settings(user_id,active_child_id) values(caller,new_child)
    on conflict(user_id) do update set active_child_id=excluded.active_child_id,updated_at=now();
  insert into public.profile_creation_requests values(caller,p_request_id,'family',new_family,new_child,payload,now());
  return new_family;
end;
$$;

create function public.add_child_to_family_checked(
  p_request_id uuid,p_family_id uuid,p_nickname text,p_birth_year integer,p_birth_month integer
)
returns uuid language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid(); receipt public.profile_creation_requests%rowtype; payload text; new_child uuid;
begin
  if caller is null or not public.can_edit_family(p_family_id) then raise exception 'Caregiver access required'; end if;
  if p_request_id is null then raise exception 'MIRA_CREATION_REQUEST_REQUIRED'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(caller::text,20014));
  -- Lock the current membership so access cannot be removed halfway through.
  perform 1 from public.family_members where family_id=p_family_id and user_id=caller and role in ('owner','caregiver') for share;
  if not found then raise exception 'Caregiver access required'; end if;
  payload:=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
    jsonb_build_array(caller,p_request_id,'child',p_family_id,btrim(p_nickname),p_birth_year,p_birth_month)::text,'UTF8')),'hex');
  select * into receipt from public.profile_creation_requests where user_id=caller and request_id=p_request_id;
  if found then
    if receipt.operation<>'child' or receipt.payload_digest<>payload then raise exception 'MIRA_CREATION_REQUEST_CHANGED'; end if;
    if receipt.child_id is null or receipt.family_id is null then raise exception 'MIRA_CREATION_REMOVED'; end if;
    return receipt.child_id;
  end if;
  if nullif(btrim(p_nickname),'') is null or char_length(btrim(p_nickname))>60 then raise exception 'MIRA_INVALID_PROFILE_NAMES'; end if;
  perform public.validate_birth_context_internal(p_birth_year,p_birth_month,public.family_today_internal(p_family_id));
  insert into public.children(family_id,nickname,birth_year,birth_month)
    values(p_family_id,btrim(p_nickname),p_birth_year,p_birth_month) returning id into new_child;
  insert into public.user_settings(user_id,active_child_id) values(caller,new_child)
    on conflict(user_id) do update set active_child_id=excluded.active_child_id,updated_at=now();
  insert into public.profile_creation_requests values(caller,p_request_id,'child',p_family_id,new_child,payload,now());
  return new_child;
end;
$$;
revoke all on function public.create_family_with_child_checked(uuid,text,text,integer,integer) from public,anon,authenticated,service_role;
revoke all on function public.add_child_to_family_checked(uuid,uuid,text,integer,integer) from public,anon,authenticated,service_role;
grant execute on function public.create_family_with_child_checked(uuid,text,text,integer,integer) to authenticated;
grant execute on function public.add_child_to_family_checked(uuid,uuid,text,integer,integer) to authenticated;
revoke all on function public.create_family_with_child(text,text,smallint,smallint) from public,anon,authenticated;
revoke all on function public.add_child_to_family(uuid,text,integer,integer) from public,anon,authenticated;
revoke insert on public.children from public,anon,authenticated;
comment on table public.profile_creation_requests is
'Private retry receipts with salted digests, not anonymized data. No duplicate name text. Removed family/child IDs become tombstones to prevent recreation by delayed retries; account deletion cascades receipts. Retention/erasure policy remains release work.';
notify pgrst,'reload schema';
commit;
