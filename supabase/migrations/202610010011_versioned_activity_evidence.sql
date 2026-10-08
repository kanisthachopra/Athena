-- Bind independent activity review to the exact claims and associations.
-- No approvals, backfill or existing plan changes are performed.
begin;
alter table public.evidence_claims
  add column applicability text,
  add column not_supported text;
alter table public.activity_template_reviews add column evidence_snapshot jsonb
  check(evidence_snapshot is null or jsonb_typeof(evidence_snapshot)='array');

create function public.activity_evidence_snapshot_internal(p_template_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object('link',to_jsonb(l),'claim',to_jsonb(c)) order by c.id),'[]'::jsonb)
  from public.activity_template_claims l join public.evidence_claims c on c.id=l.claim_id
  where l.template_id=p_template_id;
$$;
revoke all on function public.activity_evidence_snapshot_internal(uuid) from public,anon,authenticated;

-- A source edit or link edit changes the parent template version, even if its
-- title/instructions stay the same. This also invalidates an old choice form.
create function public.advance_evidence_template_versions_internal()
returns trigger language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
  if tg_op='UPDATE' and to_jsonb(new)=to_jsonb(old) then return null; end if;
  if tg_table_name='evidence_claims' then
    for target in select template_id from public.activity_template_claims where claim_id=old.id order by template_id loop
      update public.activity_templates set content_version=content_version+1 where id=target;
    end loop;
  else
    for target in select distinct x from unnest(array[
      case when tg_op<>'INSERT' then old.template_id end,
      case when tg_op<>'DELETE' then new.template_id end]) x where x is not null order by x loop
      update public.activity_templates set content_version=content_version+1 where id=target;
    end loop;
  end if;
  return null;
end;
$$;
revoke all on function public.advance_evidence_template_versions_internal() from public,anon,authenticated;
create trigger evidence_claim_version after update on public.evidence_claims
  for each row execute function public.advance_evidence_template_versions_internal();
create trigger activity_evidence_version after insert or update or delete on public.activity_template_claims
  for each row execute function public.advance_evidence_template_versions_internal();

create function public.activity_evidence_block_reason_internal(p_template_id uuid,p_on_date date)
returns text language plpgsql stable security definer set search_path='' as $$
declare evidence jsonb; review public.activity_template_reviews%rowtype;
begin
  if p_on_date is null then return 'MIRA_INVALID_ACTIVITY_DATE'; end if;
  evidence:=public.activity_evidence_snapshot_internal(p_template_id);
  if jsonb_array_length(evidence)=0 then return 'MIRA_EVIDENCE_REVIEW_MISSING_OR_STALE'; end if;
  if exists(select 1 from public.activity_template_claims l join public.evidence_claims c on c.id=l.claim_id
    where l.template_id=p_template_id and (c.status<>'approved' or c.checked_on>current_date
      or c.review_due_on<greatest(current_date,p_on_date))) then return 'MIRA_SOURCE_REVIEW_EXPIRED'; end if;
  if exists(select 1 from public.activity_template_claims l join public.evidence_claims c on c.id=l.claim_id
    where l.template_id=p_template_id and (nullif(btrim(c.applicability),'') is null
      or nullif(btrim(c.not_supported),'') is null or nullif(btrim(c.claim_text),'') is null
      or nullif(btrim(c.source_title),'') is null or nullif(btrim(c.source_organisation),'') is null
      or c.source_url!~'^https://([A-Za-z0-9-]+\.)+[A-Za-z][A-Za-z0-9-]*([/?#][^[:space:]]*)?$'
      or c.source_url~*'^https://[^/]*(\.(local|internal|test|invalid))([/?#]|$)')) then return 'MIRA_SOURCE_SCOPE_INCOMPLETE'; end if;
  select r.* into review from public.activity_template_reviews r join public.activity_templates t
    on t.id=r.template_id and t.content_version=r.content_version where t.id=p_template_id;
  if review.evidence_snapshot is distinct from evidence or review.reviewed_at>now()
    or review.review_due_on<greatest(current_date,p_on_date)
    or exists(select 1 from public.activity_template_claims l join public.evidence_claims c on c.id=l.claim_id
      where l.template_id=p_template_id and c.checked_on>review.reviewed_at::date)
    then return 'MIRA_EVIDENCE_REVIEW_MISSING_OR_STALE'; end if;
  return null;
end;
$$;
revoke all on function public.activity_evidence_block_reason_internal(uuid,date) from public,anon,authenticated;

-- Preserve the established age/time/review rules, then add exact evidence.
do $$
declare definition text;
begin
  select pg_get_functiondef('public.activity_candidate_block_reason_internal(uuid,uuid,date)'::regprocedure) into definition;
  if position('  -- Month/year describes a range, not a birthday on day one.' in definition)=0
    or position('available_minutes integer;' in definition)=0 then raise exception 'MIRA_EVIDENCE_MIGRATION_CONTEXT_CHANGED'; end if;
  definition:=replace(definition,'available_minutes integer;','available_minutes integer; evidence_reason text;');
  definition:=replace(definition,'  -- Month/year describes a range, not a birthday on day one.',
    E'  evidence_reason:=public.activity_evidence_block_reason_internal(p_template_id,p_on_date);\n  if evidence_reason is not null then return evidence_reason; end if;\n  -- Month/year describes a range, not a birthday on day one.');
  execute definition;

  select pg_get_functiondef('public.preserve_activity_content_internal()'::regprocedure) into definition;
  if position('declare item public.activity_templates%rowtype; review public.activity_template_reviews%rowtype;' in definition)=0
    or position('  -- No reviewed personalisation contract exists yet.' in definition)=0
    or position('jsonb_build_object(''schema_version'',1,' in definition)=0 then raise exception 'MIRA_EVIDENCE_CAPTURE_CONTEXT_CHANGED'; end if;
  definition:=replace(definition,'declare item public.activity_templates%rowtype; review public.activity_template_reviews%rowtype;',
    'declare item public.activity_templates%rowtype; review public.activity_template_reviews%rowtype; evidence jsonb; evidence_reason text;');
  definition:=replace(definition,'  -- No reviewed personalisation contract exists yet.',
    E'  perform c.id from public.activity_template_claims l join public.evidence_claims c on c.id=l.claim_id where l.template_id=item.id order by c.id for share of c;\n  evidence_reason:=public.activity_evidence_block_reason_internal(item.id,new.scheduled_date);\n  if evidence_reason is not null then raise exception ''%'',evidence_reason; end if;\n  evidence:=public.activity_evidence_snapshot_internal(item.id);\n  -- No reviewed personalisation contract exists yet.');
  definition:=replace(definition,'jsonb_build_object(''schema_version'',1,','jsonb_build_object(''schema_version'',2,''evidence'',evidence,');
  execute definition;

  select pg_get_functiondef('public.guard_activity_candidate_internal()'::regprocedure) into definition;
  if position('  if current_item.template_id is null then return null; end if;' in definition)=0 then raise exception 'MIRA_EVIDENCE_GUARD_CONTEXT_CHANGED'; end if;
  definition:=replace(definition,'  if current_item.template_id is null then return null; end if;',
    E'  if current_item.template_id is null then return null; end if;\n  if current_item.content_snapshot is null then raise exception ''MIRA_LEGACY_CONTENT_VERSION_UNKNOWN''; end if;\n  if current_item.content_snapshot->''template'' is distinct from (select to_jsonb(t) from public.activity_templates t where id=current_item.template_id) then raise exception ''MIRA_SAVED_CONTENT_CHANGED''; end if;');
  execute definition;
end;
$$;
revoke all on function public.activity_candidate_block_reason_internal(uuid,uuid,date) from public,anon,authenticated;
revoke all on function public.preserve_activity_content_internal() from public,anon,authenticated;
revoke all on function public.guard_activity_candidate_internal() from public,anon,authenticated;

-- One database statement returns the template and evidence that passed review.
-- Keep the older RPC for existing clients; all candidate paths use the same gate.
create function public.get_reviewed_library_context(p_child_id uuid,p_on_date date default current_date)
returns table(template_id uuid,template_snapshot jsonb,evidence_snapshot jsonb)
language plpgsql stable security definer set search_path='' as $$
begin
  if not public.can_access_child(p_child_id) then raise exception 'Family access required'; end if;
  if p_on_date is null then raise exception 'Choose an activity date'; end if;
  return query select t.id,to_jsonb(t),public.activity_evidence_snapshot_internal(t.id)
    from public.activity_templates t where public.activity_candidate_block_reason_internal(p_child_id,t.id,p_on_date) is null;
end;
$$;
revoke all on function public.get_reviewed_library_context(uuid,date) from public,anon,authenticated;
grant execute on function public.get_reviewed_library_context(uuid,date) to authenticated;
revoke insert,update,delete,truncate,references,trigger on public.evidence_claims,public.activity_template_claims from public,anon,authenticated;
comment on column public.activity_template_reviews.evidence_snapshot is
  'Exact linked claim rows and associations assessed with this template version. No backfill; an empty or missing snapshot cannot certify evidence. Reviewer fields document a review, not proof of competence.';
notify pgrst,'reload schema';
commit;
