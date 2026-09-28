-- MIRA Milestone 13: source-grounded product foundation.
-- This migration keeps historical plans intact while changing newly generated
-- weeks from seven assigned lessons into a low-pressure opportunity portfolio.

create table public.core_capabilities (
  code text primary key,
  name text not null,
  description text not null,
  display_order integer not null unique
);

insert into public.core_capabilities (code, name, description, display_order) values
  ('relationships_attachment', 'Relationships and attachment', 'Trust, connection, reciprocity, and belonging.', 1),
  ('emotional_regulation', 'Emotional regulation', 'Recognising states and returning to balance with support.', 2),
  ('communication_language', 'Communication and language', 'Expression, comprehension, conversation, and meaning-making.', 3),
  ('physical_motor', 'Physical and motor development', 'Whole-body movement, coordination, and fine-motor control.', 4),
  ('cognition_problem_solving', 'Cognition and problem-solving', 'Reasoning, memory, pattern-finding, and flexible thinking.', 5),
  ('executive_function', 'Executive function', 'Attention, working memory, inhibition, and shifting.', 6),
  ('curiosity_play_creativity', 'Curiosity, play, and creativity', 'Exploration, imagination, experimentation, and expression.', 7),
  ('independence_practical', 'Independence and practical capability', 'Participation in real tasks and growing self-reliance.', 8),
  ('social_participation', 'Social participation', 'Cooperation, contribution, perspective-taking, and community life.', 9)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  display_order = excluded.display_order;

create table public.enrichment_tracks (
  code text primary key,
  name text not null,
  description text not null,
  display_order integer not null unique
);

insert into public.enrichment_tracks (code, name, description, display_order) values
  ('languages', 'Languages', 'Living communication across the family’s languages.', 1),
  ('literacy_literature', 'Literacy and literature', 'Stories, books, symbols, marks, and later reading and writing.', 2),
  ('mathematics', 'Mathematics', 'Quantity, pattern, space, measure, and mathematical reasoning.', 3),
  ('science_nature', 'Science and nature', 'Observation, living systems, materials, and physical phenomena.', 4),
  ('general_knowledge', 'General knowledge', 'Useful knowledge of the everyday world.', 5),
  ('history_culture', 'History and culture', 'Family stories, traditions, people, and change over time.', 6),
  ('geography', 'Geography', 'Place, movement, environments, and how people live.', 7),
  ('art_design', 'Art and design', 'Visual expression, materials, form, and design choices.', 8),
  ('music', 'Music', 'Listening, rhythm, voice, instruments, and musical play.', 9),
  ('physical_pursuits', 'Physical pursuits', 'Movement, outdoor competence, games, and physical confidence.', 10),
  ('making_practical', 'Making and practical life', 'Cooking, repair, building, care, and household participation.', 11),
  ('technology_computation', 'Technology and computation', 'Tools, systems, sequencing, and computational thinking.', 12),
  ('ethics_philosophy', 'Ethics and philosophy', 'Questions of fairness, values, reasons, and responsibility.', 13),
  ('leadership_biographies', 'Leadership and biographies', 'Lives, choices, contribution, and forms of leadership.', 14)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  display_order = excluded.display_order;

create table public.activity_template_capabilities (
  template_id uuid not null references public.activity_templates(id) on delete cascade,
  capability_code text not null references public.core_capabilities(code) on delete restrict,
  emphasis text not null default 'supporting' check (emphasis in ('primary', 'supporting')),
  primary key (template_id, capability_code)
);

create table public.activity_template_tracks (
  template_id uuid not null references public.activity_templates(id) on delete cascade,
  track_code text not null references public.enrichment_tracks(code) on delete restrict,
  primary key (template_id, track_code)
);

alter table public.activity_templates
  add column if not exists experience_type text not null default 'intentional'
    check (experience_type in ('embedded', 'intentional')),
  add column if not exists setup_minutes integer not null default 2 check (setup_minutes between 0 and 60),
  add column if not exists cleanup_level text not null default 'low'
    check (cleanup_level in ('none', 'low', 'medium', 'high')),
  add column if not exists cost_level text not null default 'none'
    check (cost_level in ('none', 'low', 'medium', 'high')),
  add column if not exists caregiver_skill_level text not null default 'none'
    check (caregiver_skill_level in ('none', 'basic', 'confident')),
  add column if not exists screen_requirement text not null default 'none'
    check (screen_requirement in ('none', 'optional', 'required')),
  add column if not exists energy_level text not null default 'low'
    check (energy_level in ('quiet', 'low', 'active')),
  add column if not exists setting text[] not null default array['indoors'],
  add column if not exists parent_preparation text not null default 'Gather the listed materials and choose a calm moment.',
  add column if not exists adult_role text not null default 'Stay nearby, follow the child’s lead, and offer only as much help as needed.',
  add column if not exists support_ladder text[] not null default array['Wait and observe.', 'Offer one simple cue.', 'Model once, then hand the idea back.'],
  add column if not exists child_choices text not null default 'The child can choose whether to join, how to explore, and when to stop.',
  add column if not exists make_easier text not null default 'Use fewer materials, shorten the invitation, or simply notice together.',
  add column if not exists extend_activity text not null default 'If interest continues, invite one new comparison, variation, or question.',
  add column if not exists stop_signals text not null default 'Stop when the child turns away, becomes distressed, repeatedly refuses, or the activity stops feeling playful.',
  add column if not exists avoid_prompt text not null default 'Avoid testing, correcting, demanding a result, or asking the child to perform.',
  add column if not exists observation_prompts text[] not null default array['What drew the child’s attention?', 'What did they repeat, change, or avoid?'],
  add column if not exists hazards text[] not null default '{}',
  add column if not exists supervision_level text not null default 'nearby'
    check (supervision_level in ('ordinary', 'nearby', 'continuous')),
  add column if not exists source_note text not null default 'MIRA internal prototype; external evidence review pending.',
  add column if not exists review_status text not null default 'internal_prototype'
    check (review_status in ('internal_prototype', 'expert_reviewed', 'retired')),
  add column if not exists content_version integer not null default 1 check (content_version > 0);

update public.activity_templates
set experience_type = case when embedded_learning then 'embedded' else 'intentional' end;

update public.activity_templates set
  setup_minutes = case when embedded_learning then 1 else 3 end,
  cleanup_level = case when slug in ('water-pour-laboratory', 'cardboard-mark-making') then 'medium' else 'low' end,
  energy_level = case when domain = 'movement' then 'active' when domain in ('language', 'nature') then 'quiet' else 'low' end,
  setting = case when slug = 'slow-sky-moment' then array['indoors', 'outdoors'] when domain = 'nature' then array['outdoors', 'indoors'] else array['indoors'] end,
  supervision_level = case when safety_note ilike '%supervise closely%' or safety_note ilike '%choking%' or safety_note ilike '%water%' then 'continuous' else 'nearby' end,
  hazards = array_remove(array[
    case when safety_note ilike '%choking%' or safety_note ilike '%mouthing%' then 'small-parts-or-mouthing' end,
    case when safety_note ilike '%water%' or safety_note ilike '%spill%' then 'water-or-slip' end,
    case when safety_note ilike '%sun%' then 'sun-or-bright-light' end,
    case when safety_note ilike '%movement%' or safety_note ilike '%route clear%' then 'movement-space' end,
    case when safety_note ilike '%break%' or safety_note ilike '%sharp%' then 'breakage-or-sharp-edge' end
  ], null);

insert into public.activity_template_capabilities (template_id, capability_code, emphasis)
select id,
  case domain
    when 'language' then 'communication_language'
    when 'movement' then 'physical_motor'
    when 'sensory' then 'curiosity_play_creativity'
    when 'maths' then 'cognition_problem_solving'
    when 'creative' then 'curiosity_play_creativity'
    when 'life_skills' then 'independence_practical'
    else 'curiosity_play_creativity'
  end,
  'primary'
from public.activity_templates
on conflict do nothing;

insert into public.activity_template_capabilities (template_id, capability_code, emphasis)
select id, 'relationships_attachment', 'supporting'
from public.activity_templates
where domain in ('language', 'sensory', 'creative')
on conflict do nothing;

insert into public.activity_template_capabilities (template_id, capability_code, emphasis)
select id, 'executive_function', 'supporting'
from public.activity_templates
where domain in ('movement', 'maths', 'life_skills')
on conflict do nothing;

insert into public.activity_template_tracks (template_id, track_code)
select id,
  case domain
    when 'language' then 'languages'
    when 'movement' then 'physical_pursuits'
    when 'sensory' then 'science_nature'
    when 'maths' then 'mathematics'
    when 'creative' then 'art_design'
    when 'life_skills' then 'making_practical'
    else 'science_nature'
  end
from public.activity_templates
on conflict do nothing;

create table public.hazard_taxonomy (
  code text primary key,
  name text not null,
  default_control text not null,
  display_order integer not null unique
);

insert into public.hazard_taxonomy (code, name, default_control, display_order) values
  ('small-parts-or-mouthing', 'Small parts or mouthing', 'Use age-safe intact objects too large to swallow and maintain close supervision.', 1),
  ('water-or-slip', 'Water or slipping', 'Use only a small amount of water, stay within reach, and dry spills immediately.', 2),
  ('sun-or-bright-light', 'Sun or bright light', 'Never look directly at the sun; use shade and comfortable indirect light.', 3),
  ('movement-space', 'Movement space', 'Clear the route and match movement to the child’s current mobility.', 4),
  ('breakage-or-sharp-edge', 'Breakage or sharp edges', 'Use intact non-breakable materials without sharp edges.', 5),
  ('allergy-or-ingestion', 'Allergy or ingestion', 'Check family restrictions and prevent unintended tasting or ingestion.', 6),
  ('heat-or-cooking', 'Heat or cooking', 'Keep the child away from heat and use direct adult control of hot tools.', 7),
  ('outdoor-environment', 'Outdoor environment', 'Check weather, surfaces, traffic, plants, water, and local conditions.', 8)
on conflict (code) do update set
  name = excluded.name,
  default_control = excluded.default_control,
  display_order = excluded.display_order;

create table public.evidence_claims (
  id uuid primary key default gen_random_uuid(),
  claim_key text not null unique,
  claim_text text not null,
  source_title text not null,
  source_url text not null,
  source_organisation text not null,
  evidence_type text not null check (evidence_type in ('guideline', 'systematic_review', 'research_review', 'expert_consensus')),
  checked_on date not null,
  review_due_on date not null,
  status text not null default 'pending_review' check (status in ('pending_review', 'approved', 'retired')),
  notes text
);

create table public.activity_template_claims (
  template_id uuid not null references public.activity_templates(id) on delete cascade,
  claim_id uuid not null references public.evidence_claims(id) on delete restrict,
  primary key (template_id, claim_id)
);

create table public.family_education_constitutions (
  family_id uuid primary key references public.families(id) on delete cascade,
  protected_conditions text[] not null default array['secure relationships', 'emotional safety', 'health and rest', 'play and autonomy'],
  family_values text[] not null default '{}',
  pressure_boundaries text[] not null default array['No forced participation', 'No comparison or performance ranking', 'Time is a ceiling, not a target'],
  parent_capacity_note text,
  updated_at timestamptz not null default now()
);

alter table public.activity_instances
  alter column template_id drop not null,
  add column if not exists opportunity_type text not null default 'intentional'
    check (opportunity_type in ('embedded', 'intentional', 'open', 'language')),
  add column if not exists estimated_parent_minutes integer not null default 2 check (estimated_parent_minutes between 0 and 180),
  add column if not exists is_optional boolean not null default true;

update public.activity_instances ai
set opportunity_type = case when at.embedded_learning then 'embedded' else 'intentional' end,
    estimated_parent_minutes = coalesce(at.setup_minutes, 2)
from public.activity_templates at
where ai.template_id = at.id;

alter table public.activity_instances
  drop constraint if exists activity_instances_template_for_non_open_check;
alter table public.activity_instances
  add constraint activity_instances_template_for_non_open_check
  check (opportunity_type = 'open' or template_id is not null);

alter table public.core_capabilities enable row level security;
alter table public.enrichment_tracks enable row level security;
alter table public.activity_template_capabilities enable row level security;
alter table public.activity_template_tracks enable row level security;
alter table public.hazard_taxonomy enable row level security;
alter table public.evidence_claims enable row level security;
alter table public.activity_template_claims enable row level security;
alter table public.family_education_constitutions enable row level security;

create policy "Authenticated users read capabilities" on public.core_capabilities for select to authenticated using (true);
create policy "Authenticated users read enrichment tracks" on public.enrichment_tracks for select to authenticated using (true);
create policy "Authenticated users read activity capabilities" on public.activity_template_capabilities for select to authenticated using (true);
create policy "Authenticated users read activity tracks" on public.activity_template_tracks for select to authenticated using (true);
create policy "Authenticated users read hazard taxonomy" on public.hazard_taxonomy for select to authenticated using (true);
create policy "Authenticated users read approved evidence" on public.evidence_claims for select to authenticated using (status = 'approved');
create policy "Authenticated users read approved activity claims" on public.activity_template_claims for select to authenticated
using (exists (select 1 from public.evidence_claims ec where ec.id = claim_id and ec.status = 'approved'));
create policy "Members read family constitution" on public.family_education_constitutions for select to authenticated
using (public.can_access_family(family_id));
create policy "Editors manage family constitution" on public.family_education_constitutions for all to authenticated
using (public.can_edit_family(family_id)) with check (public.can_edit_family(family_id));

create or replace function public.populate_weekly_portfolio_internal(
  p_plan_id uuid,
  p_child_id uuid,
  p_week_start date,
  p_previous_plan_id uuid default null
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  child_age_months integer;
  prefer_embedded boolean := true;
  available_minutes integer := 15;
  screen_policy_value text := 'minimal_child_screen';
  desired_type text;
  chosen_id uuid;
  chosen public.activity_templates%rowtype;
  slot_index integer := 0;
  recent_count integer;
  interest_score integer;
begin
  select greatest(0,
    extract(year from age(p_week_start, make_date(c.birth_year, c.birth_month, 1)))::integer * 12
    + extract(month from age(p_week_start, make_date(c.birth_year, c.birth_month, 1)))::integer)
  into child_age_months
  from public.children c where c.id = p_child_id;

  select fp.prefer_embedded_learning,
         greatest(fp.weekday_minutes, fp.weekend_minutes),
         fp.screen_policy
  into prefer_embedded, available_minutes, screen_policy_value
  from public.family_preferences fp
  join public.children c on c.family_id = fp.family_id
  where c.id = p_child_id;

  available_minutes := greatest(0, least(coalesce(available_minutes, 15), 120));

  -- Five bounded invitations: two everyday moments, two intentional invitations,
  -- and one communication opportunity, with open space distributed through the week.
  foreach desired_type in array array['embedded', 'intentional', 'open', 'language', 'embedded', 'intentional', 'open'] loop
    if desired_type = 'open' then
      insert into public.activity_instances
        (plan_id, child_id, template_id, scheduled_date, personalized_title,
         personalized_instructions, selection_reason, opportunity_type,
         estimated_parent_minutes, is_optional)
      values
        (p_plan_id, p_child_id, null, p_week_start + slot_index,
         'Open space',
         'Nothing needs to be prepared. Protect room for rest, family life, repeated play, or whatever holds the child’s attention.',
         'Open time is part of the plan, not a gap to fill.',
         'open', 0, true);
      slot_index := slot_index + 1;
      continue;
    end if;

    chosen_id := null;
    recent_count := 0;
    interest_score := 0;

    select at.id,
      coalesce((select count(*) from public.activity_instances recent
        join public.plans rp on rp.id = recent.plan_id
        where recent.child_id = p_child_id and recent.template_id = at.id
          and rp.week_start >= p_week_start - 28), 0)::integer,
      coalesce((select sum(
        case o.engagement when 'high' then 3 when 'medium' then 1 else -1 end
        + case when o.repeated then 2 else 0 end
        + case when o.challenge_level = 'just_right' then 1 else 0 end)
        from public.observations o
        join public.activity_instances oi on oi.id = o.activity_instance_id
        join public.activity_templates ot on ot.id = oi.template_id
        where o.child_id = p_child_id and ot.domain = at.domain
          and o.created_at >= now() - interval '90 days'), 0)::integer
    into chosen_id, recent_count, interest_score
    from public.activity_templates at
    where at.reviewed
      and at.review_status <> 'retired'
      and child_age_months between at.min_age_months and at.max_age_months
      and at.duration_minutes <= available_minutes
      and (screen_policy_value = 'no_preference' or at.screen_requirement <> 'required')
      and not exists (select 1 from public.activity_instances existing where existing.plan_id = p_plan_id and existing.template_id = at.id)
      and (
        (desired_type in ('embedded', 'intentional') and at.experience_type = desired_type)
        or (desired_type = 'language' and (
          at.domain = 'language' or exists (
            select 1 from public.activity_template_tracks att
            where att.template_id = at.id and att.track_code = 'languages'
          )
        ))
      )
    order by
      coalesce((select count(*) from public.activity_instances recent
        join public.plans rp on rp.id = recent.plan_id
        where recent.child_id = p_child_id and recent.template_id = at.id
          and rp.week_start >= p_week_start - 28), 0),
      coalesce((select sum(
        case o.engagement when 'high' then 3 when 'medium' then 1 else -1 end
        + case when o.repeated then 2 else 0 end)
        from public.observations o
        join public.activity_instances oi on oi.id = o.activity_instance_id
        join public.activity_templates ot on ot.id = oi.template_id
        where o.child_id = p_child_id and ot.domain = at.domain
          and o.created_at >= now() - interval '90 days'), 0) desc,
      case when prefer_embedded and at.experience_type = 'embedded' then 0 else 1 end,
      abs(at.duration_minutes - available_minutes), at.slug
    limit 1;

    if chosen_id is not null then
      select * into chosen from public.activity_templates where id = chosen_id;
      insert into public.activity_instances
        (plan_id, child_id, template_id, scheduled_date, personalized_title,
         personalized_instructions, selection_reason, opportunity_type,
         estimated_parent_minutes, is_optional)
      values
        (p_plan_id, p_child_id, chosen.id, p_week_start + slot_index,
         chosen.title, chosen.instructions,
         case
           when recent_count > 0 then 'A familiar option, offered again because repetition can deepen play without adding pressure.'
           when interest_score >= 4 then 'Builds gently on interest previously noticed by a caregiver.'
           when desired_type = 'embedded' then 'Fits into ordinary family life with little preparation.'
           when desired_type = 'language' then 'Keeps communication present through responsive, real interaction.'
           else 'Adds a short, age-fitting invitation while preserving time for self-directed play.'
         end,
         desired_type,
         chosen.setup_minutes,
         true);
      slot_index := slot_index + 1;
    end if;
  end loop;

  while slot_index < 7 loop
    insert into public.activity_instances
      (plan_id, child_id, template_id, scheduled_date, personalized_title,
       personalized_instructions, selection_reason, opportunity_type,
       estimated_parent_minutes, is_optional)
    values
      (p_plan_id, p_child_id, null, p_week_start + slot_index,
       'Open space',
       'Nothing needs to be prepared. Protect room for rest, family life, repeated play, or whatever holds the child’s attention.',
       'Open time is part of the plan, not a gap to fill.',
       'open', 0, true);
    slot_index := slot_index + 1;
  end loop;
end;
$$;

revoke all on function public.populate_weekly_portfolio_internal(uuid, uuid, date, uuid) from public, authenticated;

create or replace function public.generate_weekly_plan_internal(p_child_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  new_plan_id uuid;
  monday date := current_date - (extract(isodow from current_date)::integer - 1);
begin
  if not public.can_access_child(p_child_id) then raise exception 'Access denied'; end if;

  insert into public.plans (child_id, week_start, generation_method, adaptation_summary)
  values (p_child_id, monday, 'portfolio_deterministic_v2',
    'A low-pressure mix of everyday learning, short invitations, communication, and protected open time.')
  on conflict (child_id, week_start) do update set status = 'active'
  returning id into new_plan_id;

  if not exists (select 1 from public.activity_instances where plan_id = new_plan_id) then
    perform public.populate_weekly_portfolio_internal(new_plan_id, p_child_id, monday, null);
  end if;
  return new_plan_id;
end;
$$;

create or replace function public.generate_next_week_plan_internal(p_child_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  new_plan_id uuid;
  previous_id uuid;
  observation_count integer := 0;
  current_monday date := current_date - (extract(isodow from current_date)::integer - 1);
  target_week date := current_date - (extract(isodow from current_date)::integer - 1) + 7;
begin
  if not public.can_access_child(p_child_id) then raise exception 'Access denied'; end if;

  select id into previous_id from public.plans
  where child_id = p_child_id and week_start <= current_monday
  order by week_start desc limit 1;
  select count(*)::integer into observation_count from public.observations where child_id = p_child_id;

  insert into public.plans
    (child_id, week_start, previous_plan_id, generation_method, adaptation_summary)
  values
    (p_child_id, target_week, previous_id, 'portfolio_deterministic_v2',
     case when observation_count = 0
       then 'A low-pressure mix of everyday learning, short invitations, communication, and protected open time.'
       else format('Balanced using %s caregiver observation%s, recent exposure, family time limits, and protected open time.', observation_count, case when observation_count = 1 then '' else 's' end)
     end)
  on conflict (child_id, week_start) do update set
    previous_plan_id = excluded.previous_plan_id,
    generation_method = excluded.generation_method,
    adaptation_summary = excluded.adaptation_summary,
    status = 'active'
  returning id into new_plan_id;

  if not exists (select 1 from public.activity_instances where plan_id = new_plan_id) then
    perform public.populate_weekly_portfolio_internal(new_plan_id, p_child_id, target_week, previous_id);
  end if;
  return new_plan_id;
end;
$$;

revoke all on function public.generate_weekly_plan_internal(uuid) from public, authenticated;
revoke all on function public.generate_next_week_plan_internal(uuid) from public, authenticated;

create or replace function public.replace_planned_activity_internal(
  p_instance_id uuid,
  p_template_id uuid
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  target_child_id uuid;
  target_plan_id uuid;
  target_opportunity_type text;
  child_age_months integer;
  available_minutes integer;
  screen_policy_value text;
  replacement public.activity_templates%rowtype;
begin
  if not public.can_access_activity_instance(p_instance_id) then raise exception 'Access denied'; end if;

  select ai.child_id, ai.plan_id, ai.opportunity_type
  into target_child_id, target_plan_id, target_opportunity_type
  from public.activity_instances ai
  where ai.id = p_instance_id and ai.status = 'planned';
  if target_child_id is null then raise exception 'Only planned activities can be replaced'; end if;
  if target_opportunity_type = 'open' then raise exception 'Protected open time is not an activity slot'; end if;

  select greatest(0,
    extract(year from age(current_date, make_date(c.birth_year, c.birth_month, 1)))::integer * 12
    + extract(month from age(current_date, make_date(c.birth_year, c.birth_month, 1)))::integer),
    greatest(fp.weekday_minutes, fp.weekend_minutes), fp.screen_policy
  into child_age_months, available_minutes, screen_policy_value
  from public.children c
  join public.family_preferences fp on fp.family_id = c.family_id
  where c.id = target_child_id;

  select * into replacement from public.activity_templates
  where id = p_template_id and reviewed and review_status <> 'retired'
    and child_age_months between min_age_months and max_age_months
    and duration_minutes <= available_minutes
    and (screen_policy_value = 'no_preference' or screen_requirement <> 'required');
  if replacement.id is null then raise exception 'Replacement does not fit this child’s age, time, or screen settings'; end if;
  if exists (
    select 1 from public.activity_instances
    where plan_id = target_plan_id and template_id = p_template_id and id <> p_instance_id
  ) then raise exception 'This activity is already in the selected week'; end if;

  update public.activity_instances set
    template_id = replacement.id,
    personalized_title = replacement.title,
    personalized_instructions = replacement.instructions,
    opportunity_type = case when replacement.domain = 'language' then 'language' else replacement.experience_type end,
    estimated_parent_minutes = replacement.setup_minutes,
    selection_reason = 'Chosen by the caregiver from age-, time-, and screen-eligible options.'
  where id = p_instance_id;
end;
$$;

revoke all on function public.replace_planned_activity_internal(uuid, uuid) from public, authenticated;

comment on table public.core_capabilities is 'Nine broad human capabilities. These are coverage dimensions, never child scores.';
comment on table public.enrichment_tracks is 'Optional content lenses kept separate from the nine core capabilities.';
comment on table public.evidence_claims is 'Versioned claim registry. Empty by design until a claim and its primary source are reviewed.';
comment on table public.family_education_constitutions is 'Family-level protected conditions and boundaries that outrank enrichment aspirations.';
comment on column public.activity_instances.opportunity_type is 'Portfolio role: embedded, intentional, language, or protected open time.';
