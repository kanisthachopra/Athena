-- Durable reservations for profile/journal extraction. No family data changes.
-- Counts bound requests, not dollars; token reports are incomplete/untrusted
-- operational metadata, never a hard provider spend guarantee.
begin;
create table public.extraction_request_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  family_id uuid references public.families(id) on delete set null,
  feature text not null check(feature in ('profile','journal')),
  created_at timestamptz not null default clock_timestamp(),
  attempts integer not null default 0 check(attempts between 0 and 2),
  finished_at timestamptz, outcome text check(outcome in ('succeeded','failed')),
  reported_model text,
  reported_prompt_tokens integer check(reported_prompt_tokens>=0),
  reported_completion_tokens integer check(reported_completion_tokens>=0),
  reported_latency_ms integer check(reported_latency_ms>=0),
  error_code text check(error_code in ('permission','provider','validation','accounting'))
);
create index extraction_reservations_user_feature_created on public.extraction_request_reservations(user_id,feature,created_at desc);
alter table public.extraction_request_reservations enable row level security;
revoke all on public.extraction_request_reservations from public,anon,authenticated;
grant select on public.extraction_request_reservations to authenticated;
create policy "Users read their extraction request metadata" on public.extraction_request_reservations
for select to authenticated using(user_id=auth.uid());

create function public.extraction_permission_internal(p_family_id uuid,p_feature text) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.family_members m join public.family_ai_preferences p using(family_id)
    where m.family_id=p_family_id and m.user_id=auth.uid() and m.role in ('owner','caregiver')
      and p.policy_version='2026-10-01-v2'
      and case p_feature when 'profile' then p.profile_enabled when 'journal' then p.journal_enabled else false end);
$$;
revoke all on function public.extraction_permission_internal(uuid,text) from public,anon,authenticated;

create function public.reserve_extraction_request(p_family_id uuid,p_feature text) returns uuid
language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid(); request_id uuid; recent_count bigint; reported_tokens numeric; legacy_feature text; request_limit integer;
begin
  if caller is null or p_feature is null or p_feature not in ('profile','journal') then raise exception 'MIRA_EXTRACTION_PERMISSION'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(caller::text||':'||p_feature,20002));
  if not public.extraction_permission_internal(p_family_id,p_feature) then raise exception 'MIRA_EXTRACTION_PERMISSION'; end if;
  legacy_feature:=case p_feature when 'profile' then 'onboarding_extraction' else 'observation_extraction' end;
  request_limit:=case p_feature when 'profile' then 10 else 30 end;
  select (select count(*) from public.extraction_request_reservations r where r.user_id=caller and r.feature=p_feature and r.created_at>clock_timestamp()-interval '24 hours')
    +(select count(*) from public.ai_runs r where r.user_id=caller and r.feature=legacy_feature and r.created_at>clock_timestamp()-interval '24 hours') into recent_count;
  if recent_count>=request_limit then raise exception 'MIRA_EXTRACTION_ALLOWANCE_REACHED'; end if;
  if p_feature='journal' then
    -- Preserve the legacy observed-usage stop. Unknown/in-flight/failed usage
    -- cannot prove zero; this is NOT a reservation-based hard token ceiling.
    select coalesce((select sum(r.reported_prompt_tokens::bigint+r.reported_completion_tokens::bigint)
        from public.extraction_request_reservations r where r.user_id=caller and r.feature='journal' and r.created_at>clock_timestamp()-interval '24 hours'),0)
      +coalesce((select sum(r.prompt_tokens::bigint+r.completion_tokens::bigint) from public.ai_runs r
        where r.user_id=caller and r.feature=legacy_feature and r.created_at>clock_timestamp()-interval '24 hours'),0) into reported_tokens;
    if reported_tokens>=60000 then raise exception 'MIRA_EXTRACTION_REPORTED_TOKEN_LIMIT'; end if;
  end if;
  insert into public.extraction_request_reservations(user_id,family_id,feature) values(caller,p_family_id,p_feature) returning id into request_id;
  return request_id;
end;
$$;

create function public.begin_extraction_request_attempt(p_request_id uuid) returns integer
language plpgsql security definer set search_path='' as $$
declare r public.extraction_request_reservations; next_attempt integer;
begin
  select * into r from public.extraction_request_reservations where id=p_request_id and user_id=auth.uid() for update;
  if not found then raise exception 'MIRA_EXTRACTION_PERMISSION'; end if;
  if r.finished_at is not null or r.attempts>=2 or r.created_at<=clock_timestamp()-interval '5 minutes' then raise exception 'MIRA_EXTRACTION_REQUEST_CLOSED'; end if;
  if not public.extraction_permission_internal(r.family_id,r.feature) then raise exception 'MIRA_EXTRACTION_PERMISSION'; end if;
  update public.extraction_request_reservations set attempts=attempts+1 where id=r.id returning attempts into next_attempt;
  return next_attempt;
end;
$$;

create function public.finish_extraction_request(p_request_id uuid,p_outcome text,p_model text,
  p_prompt_tokens integer,p_completion_tokens integer,p_latency_ms integer,p_error_code text) returns boolean
language plpgsql security definer set search_path='' as $$
declare r public.extraction_request_reservations;
begin
  select * into r from public.extraction_request_reservations where id=p_request_id and user_id=auth.uid() for update;
  if not found then raise exception 'MIRA_EXTRACTION_PERMISSION'; end if;
  if p_outcome is null or p_outcome not in ('succeeded','failed') or length(p_model)>200
    or p_prompt_tokens<0 or p_completion_tokens<0 or p_latency_ms<0
    or (p_prompt_tokens is null)<>(p_completion_tokens is null)
    or (p_error_code is not null and p_error_code not in ('permission','provider','validation','accounting'))
    or (p_outcome='succeeded' and (r.attempts=0 or p_model is null or length(btrim(p_model))=0)) then raise exception 'MIRA_EXTRACTION_INVALID_METADATA'; end if;
  if r.finished_at is not null then return false; end if;
  update public.extraction_request_reservations set finished_at=clock_timestamp(),outcome=p_outcome,reported_model=p_model,
    reported_prompt_tokens=p_prompt_tokens,reported_completion_tokens=p_completion_tokens,reported_latency_ms=p_latency_ms,error_code=p_error_code where id=r.id;
  return true;
end;
$$;
revoke all on function public.reserve_extraction_request(uuid,text) from public,anon,authenticated;
revoke all on function public.begin_extraction_request_attempt(uuid) from public,anon,authenticated;
revoke all on function public.finish_extraction_request(uuid,text,text,integer,integer,integer,text) from public,anon,authenticated;
grant execute on function public.reserve_extraction_request(uuid,text) to authenticated;
grant execute on function public.begin_extraction_request_attempt(uuid) to authenticated;
grant execute on function public.finish_extraction_request(uuid,text,text,integer,integer,integer,text) to authenticated;
comment on table public.extraction_request_reservations is
'Profile/journal operational metadata only; no original note, hash, output or child ID. Each reservation counts for 24 hours, including failed/abandoned requests. Two dispatch authorizations max, not proof of provider receipt. Null usage is unknown; reported usage is not billing evidence. Family deletion does not erase reservations. Operational retention/export/erasure remain separate work.';
notify pgrst,'reload schema';
commit;
