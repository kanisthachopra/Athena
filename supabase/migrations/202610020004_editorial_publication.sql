-- Separate editorial authority; no publisher, review or live content is seeded.
begin;
create table public.content_publishers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  authorization_reference text not null check(length(btrim(authorization_reference)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create table public.activity_publications (
  release_id uuid primary key,
  template_id uuid not null unique references public.activity_templates(id) on delete restrict,
  publisher_id uuid references auth.users(id) on delete set null,
  package jsonb not null,
  decision jsonb not null,
  published_at timestamptz not null default now(),
  retired_at timestamptz,
  retired_by uuid references auth.users(id) on delete set null,
  retirement_reason text
);
alter table public.content_publishers enable row level security;
alter table public.activity_publications enable row level security;
revoke all on public.content_publishers,public.activity_publications from public,anon,authenticated,service_role;
alter table public.activity_templates add column publication_context jsonb;
alter table public.evidence_claims drop constraint evidence_claims_evidence_type_check;
alter table public.evidence_claims add constraint evidence_claims_evidence_type_check check(evidence_type in
  ('guideline','systematic_review','research_review','expert_consensus','practice_explanation','implementation_package','framework','professional_position','policy_statement'));

create function public.publication_text_valid_internal(v jsonb,max_length integer default 4000)
returns boolean language sql immutable set search_path='' as $$
  select coalesce(jsonb_typeof(v)='string' and length(btrim(v#>>'{}')) between 1 and max_length,false);
$$;
revoke all on function public.publication_text_valid_internal(jsonb,integer) from public,anon,authenticated;

create function public.publish_activity_release(p_release_id uuid,p_package jsonb,p_decision jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare
  caller uuid:=auth.uid(); prior public.activity_publications;
  candidate jsonb; response jsonb; submission jsonb; review_item jsonb; t jsonb; field text;
  source_text jsonb; source jsonb; source_review jsonb; claim jsonb; check_record jsonb;
  source_id text; source_ids text[]:='{}'; claim_id uuid; template_id uuid; reviewer jsonb;
  checked date; due date; reviewed_on date; evidence_type text; record public.activity_templates;
  expected_fields text[]:=array['title','summary','instructions','conversation_prompt','look_for','why_it_matters','safety_note','parent_preparation','adult_role','child_choices','make_easier','extend_activity','stop_signals','avoid_prompt','source_note','materials','setting','support_ladder','observation_prompts','hazards','domain','experience_type','cleanup_level','cost_level','caregiver_skill_level','screen_requirement','energy_level','supervision_level','min_age_months','max_age_months','duration_minutes','setup_minutes','context_requirements'];
begin
  -- Family ownership, AI output, a service key and completed paperwork do not
  -- confer editorial permission. Admin enrollment is a separate owner decision.
  perform 1 from public.content_publishers where user_id=caller and enabled for share;
  if caller is null or not found then raise exception 'MIRA_EDITOR_REQUIRED'; end if;
  if p_release_id is null then raise exception 'MIRA_RELEASE_ID_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_release_id::text,20004));
  select * into prior from public.activity_publications where release_id=p_release_id;
  if found then
    if prior.package is distinct from p_package or prior.decision is distinct from p_decision or prior.publisher_id is distinct from caller then raise exception 'MIRA_RELEASE_REQUEST_CHANGED'; end if;
    return prior.template_id;
  end if;
  if jsonb_typeof(p_decision) is distinct from 'object' or (select count(*) from jsonb_object_keys(p_decision))<>6
    or p_decision->>'outcome' is distinct from 'publish' then raise exception 'MIRA_EDITOR_DECISION_REQUIRED'; end if;
  foreach field in array array['authorizationReference','reviewerVerification','independenceAssessment','sourceContentAndRightsAssessment','rationale'] loop
    if not public.publication_text_valid_internal(p_decision->field,6000) then raise exception 'MIRA_EDITOR_DECISION_REQUIRED'; end if;
  end loop;
  if jsonb_typeof(p_package) is distinct from 'object' or octet_length(p_package::text)>1048576
    or (select count(*) from jsonb_object_keys(p_package))<>6
    or p_package->>'format' is distinct from 'mira-activity-publication' or p_package->'version' is distinct from '1'::jsonb
    or p_package->'publicationAllowed' is distinct from 'false'::jsonb
    or jsonb_typeof(p_package->'candidateText') is distinct from 'string' or jsonb_typeof(p_package->'responseText') is distinct from 'string'
    or jsonb_typeof(p_package->'sources') is distinct from 'array' then raise exception 'MIRA_RELEASE_PACKAGE_INVALID'; end if;
  candidate:=(p_package->>'candidateText')::jsonb; response:=(p_package->>'responseText')::jsonb; submission:=response->'submission';
  if jsonb_typeof(candidate) is distinct from 'object' or jsonb_typeof(response) is distinct from 'object'
    or jsonb_typeof(submission) is distinct from 'object' or jsonb_typeof(submission->'primitives') is distinct from 'array'
    or jsonb_typeof(submission->'sources') is distinct from 'array'
    or coalesce(candidate#>>'{origin,packageFingerprint}','')!~'^[a-f0-9]{64}$'
    or coalesce(candidate#>>'{origin,contentFingerprint}','')!~'^[a-f0-9]{64}$'
    or not public.publication_text_valid_internal(candidate#>'{origin,primitiveId}',120)
    or jsonb_typeof(candidate#>'{origin,draftIndex}') is distinct from 'number' then raise exception 'MIRA_RELEASE_PACKAGE_INVALID'; end if;
  if candidate->>'format' is distinct from 'mira-activity-release-candidate' or candidate->'version' is distinct from '1'::jsonb
    or candidate->>'personalization' is distinct from 'none'
    or response->>'format' is distinct from 'mira-activity-release-review' or response->'version' is distinct from '1'::jsonb
    or response->>'candidateFingerprint' is distinct from encode(sha256(convert_to(p_package->>'candidateText','UTF8')),'hex')
    or submission->>'packageFingerprint' is distinct from candidate#>>'{origin,packageFingerprint}'
    or jsonb_array_length(submission->'primitives') is distinct from 1 then raise exception 'MIRA_RELEASE_REVIEW_MISMATCH'; end if;
  review_item:=submission->'primitives'->0; t:=candidate->'template';
  if review_item->>'primitiveId' is distinct from candidate#>>'{origin,primitiveId}'
    or review_item->>'contentFingerprint' is distinct from candidate#>>'{origin,contentFingerprint}'
    or review_item->'draftIndices' is distinct from jsonb_build_array(candidate#>'{origin,draftIndex}')
    or review_item->>'decision' is distinct from 'ready_for_editorial_decision'
    or review_item#>'{ageMonths,minimum}' is distinct from t->'min_age_months' or review_item#>'{ageMonths,maximum}' is distinct from t->'max_age_months'
    or review_item->'languageVarieties' is distinct from jsonb_build_array(candidate#>'{authoring,languageVariety}')
    or candidate#>'{authoring,unresolvedFindings}' is distinct from '[]'::jsonb
    then raise exception 'MIRA_RELEASE_REVIEW_MISMATCH'; end if;
  reviewed_on:=(review_item->>'reviewedOn')::date; due:=(review_item->>'reviewDueOn')::date;
  if reviewed_on is null or due is null or reviewed_on>current_date or due<current_date or due<reviewed_on then raise exception 'MIRA_RELEASE_REVIEW_EXPIRED'; end if;
  if jsonb_typeof(submission->'reviewers') is distinct from 'array' or jsonb_array_length(submission->'reviewers') not between 1 and 30 then raise exception 'MIRA_RELEASE_REVIEWER_REQUIRED'; end if;
  for reviewer in select value from jsonb_array_elements(submission->'reviewers') loop
    foreach field in array array['id','name','qualifications','relevantExpertise','conflictsOfInterest'] loop
      if not public.publication_text_valid_internal(reviewer->field,2000) then raise exception 'MIRA_RELEASE_REVIEWER_REQUIRED'; end if;
    end loop;
  end loop;
  if (select count(*) from jsonb_array_elements(submission->'reviewers'))<>(select count(distinct value->>'id') from jsonb_array_elements(submission->'reviewers')) then raise exception 'MIRA_RELEASE_REVIEWER_REQUIRED'; end if;
  select value into reviewer from jsonb_array_elements(submission->'reviewers') where value->>'id'=review_item->>'decisionReviewerId';
  if reviewer is null then raise exception 'MIRA_RELEASE_REVIEWER_REQUIRED'; end if;
  if jsonb_typeof(review_item->'checks') is distinct from 'array' or jsonb_array_length(review_item->'checks')<>10 then raise exception 'MIRA_RELEASE_CHECKS_INCOMPLETE'; end if;
  foreach field in array array['evidence','applicability','materials','supervision','hazards','autonomy','wording','adaptation','language','rights'] loop
    if (select count(*) from jsonb_array_elements(review_item->'checks') where value->>'id'=field)<>1 then raise exception 'MIRA_RELEASE_CHECKS_INCOMPLETE'; end if;
  end loop;
  for check_record in select value from jsonb_array_elements(review_item->'checks') loop
    if check_record->>'outcome' is distinct from 'acceptable' or check_record->'requiredChanges' is distinct from 'null'::jsonb
      or not public.publication_text_valid_internal(check_record->'evidence',6000)
      or not exists(select 1 from jsonb_array_elements(submission->'reviewers') r where r->>'id'=check_record->>'reviewerId') then raise exception 'MIRA_RELEASE_CHECKS_INCOMPLETE'; end if;
  end loop;
  if jsonb_typeof(t) is distinct from 'object' or not(t ?& expected_fields) or (select count(*) from jsonb_object_keys(t))<>cardinality(expected_fields) then raise exception 'MIRA_RELEASE_TEMPLATE_INCOMPLETE'; end if;
  foreach field in array array['title','summary','instructions','conversation_prompt','look_for','why_it_matters','safety_note','parent_preparation','adult_role','child_choices','make_easier','extend_activity','stop_signals','avoid_prompt','source_note'] loop
    if not public.publication_text_valid_internal(t->field,case when field='title' then 120 else 4000 end) then raise exception 'MIRA_RELEASE_TEMPLATE_INCOMPLETE'; end if;
  end loop;
  foreach field in array array['materials','setting','support_ladder','observation_prompts','hazards'] loop
    if jsonb_typeof(t->field) is distinct from 'array' or jsonb_array_length(t->field)>30
      or exists(select 1 from jsonb_array_elements(t->field) v where not public.publication_text_valid_internal(v,1000)) then raise exception 'MIRA_RELEASE_TEMPLATE_INCOMPLETE'; end if;
  end loop;
  if jsonb_array_length(t->'setting')=0 or jsonb_array_length(t->'observation_prompts')=0
    or not public.activity_context_contract_valid_internal(t->'context_requirements')
    or (t->>'min_age_months')::integer not between 0 and 83 or (t->>'max_age_months')::integer not between 0 and 83
    or (t->>'min_age_months')::integer>(t->>'max_age_months')::integer then raise exception 'MIRA_RELEASE_TEMPLATE_INCOMPLETE'; end if;
  foreach field in array array['languageVariety','readiness','exclusions','changesFromDraft'] loop
    if not public.publication_text_valid_internal(candidate#>array['authoring',field]) then raise exception 'MIRA_RELEASE_CONTEXT_INCOMPLETE'; end if;
  end loop;
  if candidate#>>'{authoring,languageVariety}'!~'^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$'
    or jsonb_typeof(candidate#>'{associations,capabilities}') is distinct from 'array'
    or jsonb_array_length(candidate#>'{associations,capabilities}') not between 1 and 9
    or jsonb_typeof(candidate#>'{associations,tracks}') is distinct from 'array'
    or jsonb_array_length(candidate#>'{associations,tracks}')>14 then raise exception 'MIRA_RELEASE_CONTEXT_INCOMPLETE'; end if;
  for check_record in select value from jsonb_array_elements(candidate#>'{associations,capabilities}') loop
    if not exists(select 1 from public.core_capabilities where code=check_record->>'code')
      or coalesce(check_record->>'emphasis','') not in ('primary','supporting') or not public.publication_text_valid_internal(check_record->'rationale') then raise exception 'MIRA_RELEASE_CONTEXT_INCOMPLETE'; end if;
  end loop;
  for check_record in select value from jsonb_array_elements(candidate#>'{associations,tracks}') loop
    if not exists(select 1 from public.enrichment_tracks where code=check_record->>'code') or not public.publication_text_valid_internal(check_record->'rationale') then raise exception 'MIRA_RELEASE_CONTEXT_INCOMPLETE'; end if;
  end loop;
  if jsonb_typeof(candidate->'claims') is distinct from 'array' or jsonb_array_length(candidate->'claims') not between 1 and 20
    or jsonb_array_length(p_package->'sources') not between 1 and 40 then raise exception 'MIRA_RELEASE_EVIDENCE_INCOMPLETE'; end if;
  -- Every published source is exact-fingerprint-bound to its returned appraisal.
  for source_text in select value from jsonb_array_elements(p_package->'sources') loop
    if jsonb_typeof(source_text) is distinct from 'string' then raise exception 'MIRA_RELEASE_EVIDENCE_INCOMPLETE'; end if;
    source:=(source_text#>>'{}')::jsonb; source_id:=source->>'id';
    if source_id is null or source_id=any(source_ids) then raise exception 'MIRA_RELEASE_EVIDENCE_INCOMPLETE'; end if;
    source_ids:=array_append(source_ids,source_id);
    if (select count(*) from jsonb_array_elements(submission->'sources') where value->>'sourceId'=source_id)<>1 then raise exception 'MIRA_RELEASE_EVIDENCE_INCOMPLETE'; end if;
    select value into source_review from jsonb_array_elements(submission->'sources') where value->>'sourceId'=source_id;
    if source_review->>'sourceFingerprint' is distinct from encode(sha256(convert_to(source_text#>>'{}','UTF8')),'hex')
      or source_review->>'access' is distinct from 'full_relevant_material_appraised'
      or not exists(select 1 from jsonb_array_elements(submission->'reviewers') r where r->>'id'=source_review->>'reviewerId') then raise exception 'MIRA_RELEASE_EVIDENCE_INCOMPLETE'; end if;
    foreach field in array array['appraisal','limitations','rightsAssessment'] loop
      if not public.publication_text_valid_internal(source_review->field,6000) then raise exception 'MIRA_RELEASE_EVIDENCE_INCOMPLETE'; end if;
    end loop;
    checked:=(source_review->>'checkedOn')::date;
    if checked is null or checked>reviewed_on or (source_review->>'reviewDueOn')::date is null or (source_review->>'reviewDueOn')::date<current_date then raise exception 'MIRA_RELEASE_REVIEW_EXPIRED'; end if;
    due:=least(due,(source_review->>'reviewDueOn')::date);
    if not public.publication_text_valid_internal(source->'title',300) or not public.publication_text_valid_internal(source->'publisher',200) or not public.publication_text_valid_internal(source->'url',2000)
      or source->>'url'!~'^https://([A-Za-z0-9-]+\.)+[A-Za-z][A-Za-z0-9-]*([/?#][^[:space:]]*)?$'
      or source->>'url'~*'^https://[^/]*(\.(local|internal|test|invalid))([/?#]|$)' then raise exception 'MIRA_RELEASE_EVIDENCE_INCOMPLETE'; end if;
  end loop;
  template_id:=gen_random_uuid();
  select * into record from jsonb_populate_record(null::public.activity_templates,t||jsonb_build_object(
    'id',template_id,'slug','release-'||p_release_id::text,'created_at',now(),'embedded_learning',t->>'experience_type'='embedded',
    'reviewed',true,'review_status','expert_reviewed','content_version',1,
    'publication_context',jsonb_build_object('schema_version',1,'language_variety',candidate#>>'{authoring,languageVariety}',
      'readiness',candidate#>>'{authoring,readiness}','exclusions',candidate#>>'{authoring,exclusions}','associations',candidate->'associations')));
  insert into public.activity_templates select record.*;
  insert into public.activity_template_capabilities(template_id,capability_code,emphasis)
    select template_id,value->>'code',value->>'emphasis' from jsonb_array_elements(candidate#>'{associations,capabilities}');
  insert into public.activity_template_tracks(template_id,track_code)
    select template_id,value->>'code' from jsonb_array_elements(candidate#>'{associations,tracks}');
  for claim in select value from jsonb_array_elements(candidate->'claims') loop
    foreach field in array array['wording','applicability','notSupported'] loop
      if not public.publication_text_valid_internal(claim->field,1600) then raise exception 'MIRA_RELEASE_EVIDENCE_INCOMPLETE'; end if;
    end loop;
    if claim->>'support' is distinct from 'general_mechanism' or jsonb_typeof(claim->'sourceIds') is distinct from 'array'
      or jsonb_array_length(claim->'sourceIds')=0 then raise exception 'MIRA_RELEASE_EVIDENCE_INCOMPLETE'; end if;
    for source_id in select jsonb_array_elements_text(claim->'sourceIds') loop
      if not source_id=any(source_ids) then raise exception 'MIRA_RELEASE_EVIDENCE_INCOMPLETE'; end if;
      select (value#>>'{}')::jsonb into source from jsonb_array_elements(p_package->'sources') where ((value#>>'{}')::jsonb)->>'id'=source_id;
      select value into source_review from jsonb_array_elements(submission->'sources') where value->>'sourceId'=source_id;
      evidence_type:=case source->>'type' when 'Guideline' then 'guideline' when 'Systematic review and meta-analysis' then 'systematic_review'
        when 'Practice explanation' then 'practice_explanation' when 'Implementation package' then 'implementation_package'
        when 'Framework' then 'framework' when 'Professional position statement' then 'professional_position' when 'Policy statement' then 'policy_statement' end;
      if evidence_type is null then raise exception 'MIRA_RELEASE_SOURCE_TYPE_UNKNOWN'; end if;
      insert into public.evidence_claims(claim_key,claim_text,source_title,source_url,source_organisation,evidence_type,checked_on,review_due_on,status,notes,applicability,not_supported)
        values(p_release_id::text||':'||(claim->>'claimId')||':'||source_id,claim->>'wording',source->>'title',source->>'url',source->>'publisher',evidence_type,
          (source_review->>'checkedOn')::date,(source_review->>'reviewDueOn')::date,'approved','General mechanism guidance; not evidence of this specific activity.',claim->>'applicability',claim->>'notSupported') returning id into claim_id;
      insert into public.activity_template_claims values(template_id,claim_id);
    end loop;
  end loop;
  -- Store review last: linking evidence advances the template version.
  insert into public.activity_template_reviews(template_id,content_version,template_snapshot,reviewer_name,reviewer_qualifications,reviewed_at,review_due_on,evidence_review,safety_applicability_review,language_review,rights_review,evidence_snapshot)
    select id,content_version,to_jsonb(a),reviewer->>'name',reviewer->>'qualifications',reviewed_on::timestamptz,due,
      (select value->>'evidence' from jsonb_array_elements(review_item->'checks') where value->>'id'='evidence'),
      (select value->>'evidence' from jsonb_array_elements(review_item->'checks') where value->>'id'='applicability'),
      (select value->>'evidence' from jsonb_array_elements(review_item->'checks') where value->>'id'='language'),
      (select value->>'evidence' from jsonb_array_elements(review_item->'checks') where value->>'id'='rights'),public.activity_evidence_snapshot_internal(id)
    from public.activity_templates a where id=template_id;
  if (select count(*) from public.activity_template_claims l where l.template_id=record.id)>40 then raise exception 'MIRA_RELEASE_EVIDENCE_TOO_LARGE'; end if;
  insert into public.activity_publications(release_id,template_id,publisher_id,package,decision) values(p_release_id,template_id,caller,p_package,p_decision);
  return template_id;
end;
$$;
revoke all on function public.publish_activity_release(uuid,jsonb,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.publish_activity_release(uuid,jsonb,jsonb) to authenticated;

-- Published instructions are immutable. Revision means a separately reviewed
-- release, not editing an already accepted activity under the same identity.
create function public.guard_published_template_internal() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if exists(select 1 from public.activity_publications where template_id=old.id) then
    if tg_op='DELETE' then raise exception 'MIRA_PUBLISHED_TEMPLATE_IMMUTABLE'; end if;
    if new.reviewed is distinct from false or new.review_status is distinct from 'retired'
      or (to_jsonb(new)-'reviewed'-'review_status') is distinct from (to_jsonb(old)-'reviewed'-'review_status') then raise exception 'MIRA_PUBLISHED_TEMPLATE_IMMUTABLE'; end if;
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function public.guard_published_template_internal() from public,anon,authenticated;
create trigger immutable_published_template before update or delete on public.activity_templates for each row execute function public.guard_published_template_internal();
create function public.guard_published_associations_internal() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if exists(select 1 from public.activity_publications where template_id in
    (case when tg_op<>'INSERT' then old.template_id end,case when tg_op<>'DELETE' then new.template_id end)) then raise exception 'MIRA_PUBLISHED_ASSOCIATIONS_IMMUTABLE'; end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function public.guard_published_associations_internal() from public,anon,authenticated;
create trigger immutable_published_capabilities before insert or update or delete on public.activity_template_capabilities for each row execute function public.guard_published_associations_internal();
create trigger immutable_published_tracks before insert or update or delete on public.activity_template_tracks for each row execute function public.guard_published_associations_internal();
revoke insert,update,delete,truncate,references,trigger on public.activity_template_capabilities,public.activity_template_tracks from public,anon,authenticated;
create function public.retire_activity_release(p_template_id uuid,p_reason text) returns boolean
language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid(); item public.activity_publications;
begin
  perform 1 from public.content_publishers where user_id=caller and enabled for share;
  if caller is null or not found then raise exception 'MIRA_EDITOR_REQUIRED'; end if;
  if p_reason is null or length(btrim(p_reason)) not between 1 and 4000 then raise exception 'MIRA_RETIREMENT_REASON_REQUIRED'; end if;
  select * into item from public.activity_publications where template_id=p_template_id for update;
  if not found then raise exception 'MIRA_RELEASE_NOT_FOUND'; end if;
  if item.retired_at is not null then return false; end if;
  update public.activity_templates set reviewed=false,review_status='retired' where id=p_template_id;
  update public.activity_publications set retired_at=now(),retired_by=caller,retirement_reason=p_reason where template_id=p_template_id;
  return true;
end;
$$;
revoke all on function public.retire_activity_release(uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.retire_activity_release(uuid,text) to authenticated;
comment on table public.content_publishers is 'Separately owner-designated editorial publishers. Empty by default; family roles cannot enroll themselves. Database administrator records an explicit authorization before enabling an editor.';
comment on table public.activity_publications is 'Private exact publication package and editor decision. No family/child data. Records document assertions and authorization, not scientific or identity verification by software. No public table grants.';
notify pgrst,'reload schema';
commit;
