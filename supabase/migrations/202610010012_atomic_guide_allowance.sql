-- Guide request reservations, not a dollar-spend guarantee. No family plans change.
begin;
create table public.guide_request_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Family deletion must not reset this user's rolling allowance.
  family_id uuid references public.families(id) on delete set null,
  created_at timestamptz not null default clock_timestamp(),
  attempts integer not null default 0 check (attempts between 0 and 2),
  finished_at timestamptz,
  outcome text check (outcome in ('succeeded','failed')),
  reported_model text,
  reported_prompt_tokens integer check (reported_prompt_tokens >= 0),
  reported_completion_tokens integer check (reported_completion_tokens >= 0),
  reported_latency_ms integer check (reported_latency_ms >= 0),
  error_code text check (error_code in ('permission','context_changed','provider','validation','accounting'))
);
create index guide_reservations_user_created on public.guide_request_reservations(user_id, created_at desc);
alter table public.guide_request_reservations enable row level security;
revoke all on public.guide_request_reservations from public, anon, authenticated;
grant select on public.guide_request_reservations to authenticated;
create policy "Users read their own Guide request metadata" on public.guide_request_reservations
for select to authenticated using (user_id = auth.uid());

create function public.reserve_guide_request(p_family_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare caller uuid := auth.uid(); request_id uuid; recent_count integer;
begin
  if caller is null then raise exception 'MIRA_GUIDE_PERMISSION'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(caller::text, 12012));
  if not exists (select 1 from public.family_members m join public.family_ai_preferences p using(family_id)
    where m.family_id=p_family_id and m.user_id=caller and p.guide_enabled
    and p.policy_version='2026-10-01-v2') then raise exception 'MIRA_GUIDE_PERMISSION'; end if;
  -- Keep older completed runs in the rolling allowance during the transition.
  select (select count(*) from public.guide_request_reservations r where r.user_id=caller
      and r.created_at > clock_timestamp()-interval '24 hours')
    + (select count(*) from public.ai_runs r where r.user_id=caller and r.feature='ask'
      and r.created_at > clock_timestamp()-interval '24 hours') into recent_count;
  if recent_count >= 20 then raise exception 'MIRA_GUIDE_ALLOWANCE_REACHED'; end if;
  insert into public.guide_request_reservations(user_id,family_id) values(caller,p_family_id) returning id into request_id;
  return request_id;
end;
$$;

create function public.begin_guide_request_attempt(p_request_id uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare r public.guide_request_reservations; next_attempt integer;
begin
  select * into r from public.guide_request_reservations where id=p_request_id and user_id=auth.uid() for update;
  if not found then raise exception 'MIRA_GUIDE_PERMISSION'; end if;
  if r.finished_at is not null or r.attempts >= 2 or r.created_at <= clock_timestamp()-interval '5 minutes' then
    raise exception 'MIRA_GUIDE_REQUEST_CLOSED'; end if;
  if not exists (select 1 from public.family_members m join public.family_ai_preferences p using(family_id)
    where m.family_id=r.family_id and m.user_id=auth.uid() and p.guide_enabled
    and p.policy_version='2026-10-01-v2') then raise exception 'MIRA_GUIDE_PERMISSION'; end if;
  update public.guide_request_reservations set attempts=attempts+1 where id=r.id returning attempts into next_attempt;
  return next_attempt;
end;
$$;

-- Completion metadata never refunds allowance or permits additional dispatches.
-- Authenticated callers can report metadata; it is not provider billing evidence.
create function public.finish_guide_request(p_request_id uuid, p_outcome text, p_model text,
  p_prompt_tokens integer, p_completion_tokens integer, p_latency_ms integer, p_error_code text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare r public.guide_request_reservations;
begin
  select * into r from public.guide_request_reservations where id=p_request_id and user_id=auth.uid() for update;
  if not found then raise exception 'MIRA_GUIDE_PERMISSION'; end if;
  if p_outcome is null or p_outcome not in ('succeeded','failed') or length(p_model)>200
    or p_prompt_tokens<0 or p_completion_tokens<0 or p_latency_ms<0
    or (p_error_code is not null and p_error_code not in ('permission','context_changed','provider','validation','accounting'))
    or (p_outcome='succeeded' and (r.attempts=0 or p_model is null or length(trim(p_model))=0))
    then raise exception 'MIRA_GUIDE_INVALID_METADATA'; end if;
  if r.finished_at is not null then return false; end if;
  update public.guide_request_reservations set finished_at=clock_timestamp(), outcome=p_outcome,
    reported_model=p_model, reported_prompt_tokens=p_prompt_tokens, reported_completion_tokens=p_completion_tokens,
    reported_latency_ms=p_latency_ms, error_code=p_error_code where id=r.id;
  return true;
end;
$$;
revoke all on function public.reserve_guide_request(uuid) from public, anon, authenticated;
revoke all on function public.begin_guide_request_attempt(uuid) from public, anon, authenticated;
revoke all on function public.finish_guide_request(uuid,text,text,integer,integer,integer,text) from public, anon, authenticated;
grant execute on function public.reserve_guide_request(uuid) to authenticated;
grant execute on function public.begin_guide_request_attempt(uuid) to authenticated;
grant execute on function public.finish_guide_request(uuid,text,text,integer,integer,integer,text) to authenticated;
comment on table public.guide_request_reservations is
'Guide-only operational metadata, no question/hash/output. Every reservation counts for 24 hours even if abandoned or final logging fails. Attempts are dispatch authorizations, not proof of provider receipt. Reported tokens are not billing evidence; null means unknown. Retention policy and full privacy operations remain release work.';
notify pgrst, 'reload schema';
commit;
