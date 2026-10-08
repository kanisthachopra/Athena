-- Retry-safe journal creation. No existing notes, observations or plans change.
begin;
create table public.learning_moment_requests (
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  child_id uuid not null references public.children(id) on delete cascade,
  moment_id uuid references public.learning_moments(id) on delete set null,
  payload_digest text not null,
  created_at timestamptz not null default now(),
  primary key(user_id,request_id)
);
alter table public.learning_moment_requests enable row level security;
revoke all on public.learning_moment_requests from public,anon,authenticated;

create function public.create_learning_moment_checked(p_request_id uuid,p_child_id uuid,p_occurred_on date,p_domain text,p_title text,p_note text)
returns uuid language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid(); receipt public.learning_moment_requests; payload text; new_id uuid;
begin
  if caller is null or not public.can_edit_child(p_child_id) then raise exception 'Caregiver access required'; end if;
  if p_request_id is null then raise exception 'MIRA_MOMENT_REQUEST_REQUIRED'; end if;
  -- Random per-entry request ID salts the digest: it is not a reusable hash of
  -- the parent note. The private receipt never stores another copy of its text.
  payload:=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
    jsonb_build_array(caller,p_request_id,p_child_id,p_occurred_on,p_domain,btrim(p_title),p_note)::text,'UTF8')),'hex');
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(caller::text||p_request_id::text,20003));
  select * into receipt from public.learning_moment_requests where user_id=caller and request_id=p_request_id for update;
  if found then
    if receipt.payload_digest is distinct from payload then raise exception 'MIRA_MOMENT_REQUEST_CHANGED'; end if;
    if receipt.moment_id is null then raise exception 'MIRA_MOMENT_REMOVED'; end if;
    -- An exact replay can recover yesterday's confirmed save even if the
    -- rolling date window has since moved. Current child permissions still apply.
    return receipt.moment_id;
  end if;
  if p_occurred_on is null or p_occurred_on>current_date or p_occurred_on<current_date-365 then raise exception 'Choose a date within the past year'; end if;
  if p_domain is null or p_domain not in ('everyday','language','movement','sensory','maths','creative','life_skills','nature') then raise exception 'Choose a valid learning area'; end if;
  if nullif(btrim(p_title),'') is null or char_length(btrim(p_title))>100 then raise exception 'Moment title must be between 1 and 100 characters'; end if;
  if nullif(btrim(p_note),'') is null or char_length(p_note)>1200 then raise exception 'Moment note must be between 1 and 1200 characters'; end if;
  insert into public.learning_moments(child_id,recorded_by,occurred_on,domain,title,note)
    values(p_child_id,caller,p_occurred_on,p_domain,btrim(p_title),p_note) returning id into new_id;
  insert into public.learning_moment_requests(user_id,request_id,child_id,moment_id,payload_digest)
    values(caller,p_request_id,p_child_id,new_id,payload);
  return new_id;
end;
$$;
-- Old clients must refresh; do not retain a public non-idempotent write bypass.
revoke all on function public.create_learning_moment(uuid,date,text,text,text) from public,anon,authenticated;
revoke all on function public.create_learning_moment_checked(uuid,uuid,date,text,text,text) from public,anon,authenticated;
grant execute on function public.create_learning_moment_checked(uuid,uuid,date,text,text,text) to authenticated;
comment on table public.learning_moment_requests is
'Private retry receipts, no second copy of observation text. Exact retries return the existing row; changed payloads fail. A deleted moment leaves a tombstone so a delayed retry cannot recreate it. Child/account deletion cascades receipts. Retention/export/erasure policy remains separate release work; digests are still sensitive metadata, not anonymized data.';
notify pgrst,'reload schema';
commit;
