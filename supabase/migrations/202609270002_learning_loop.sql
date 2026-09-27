-- MIRA Milestone 2: family learning profile, deterministic plans, and feedback.

create table public.family_preferences (
  family_id uuid primary key references public.families(id) on delete cascade,
  screen_policy text not null default 'minimal_child_screen'
    check (screen_policy in ('minimal_child_screen', 'selective', 'no_preference')),
  structure_level text not null default 'balanced'
    check (structure_level in ('light', 'balanced', 'structured')),
  weekday_minutes integer not null default 15 check (weekday_minutes between 0 and 180),
  weekend_minutes integer not null default 30 check (weekend_minutes between 0 and 240),
  prefer_embedded_learning boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.caregivers (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 60),
  relationship text,
  created_at timestamptz not null default now()
);
create index caregivers_family_id_idx on public.caregivers(family_id);

create table public.caregiver_languages (
  id uuid primary key default gen_random_uuid(),
  caregiver_id uuid not null references public.caregivers(id) on delete cascade,
  language_code text not null,
  proficiency text not null default 'fluent'
    check (proficiency in ('beginner', 'conversational', 'fluent', 'native')),
  unique (caregiver_id, language_code)
);

create table public.aspirations (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 80),
  priority text not null default 'high' check (priority in ('low', 'medium', 'high')),
  created_at timestamptz not null default now(),
  unique (child_id, title)
);
create index aspirations_child_id_idx on public.aspirations(child_id);

create table public.child_language_goals (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  language_code text not null,
  priority text not null default 'high' check (priority in ('low', 'medium', 'high')),
  created_at timestamptz not null default now(),
  unique (child_id, language_code)
);
create index child_language_goals_child_id_idx on public.child_language_goals(child_id);

create table public.activity_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  domain text not null check (domain in ('language', 'movement', 'sensory', 'maths', 'creative', 'life_skills', 'nature')),
  min_age_months integer not null default 0,
  max_age_months integer not null default 48,
  duration_minutes integer not null check (duration_minutes between 1 and 120),
  summary text not null,
  instructions text not null,
  conversation_prompt text not null,
  look_for text not null,
  why_it_matters text not null,
  safety_note text not null,
  materials text[] not null default '{}',
  embedded_learning boolean not null default false,
  reviewed boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  week_start date not null,
  status text not null default 'active' check (status in ('active', 'complete', 'archived')),
  generation_method text not null default 'deterministic_v1',
  created_at timestamptz not null default now(),
  unique (child_id, week_start)
);
create index plans_child_id_idx on public.plans(child_id);

create table public.activity_instances (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  template_id uuid not null references public.activity_templates(id),
  scheduled_date date not null,
  personalized_title text not null,
  personalized_instructions text not null,
  status text not null default 'planned' check (status in ('planned', 'completed', 'skipped')),
  created_at timestamptz not null default now(),
  unique (plan_id, scheduled_date)
);
create index activity_instances_child_date_idx on public.activity_instances(child_id, scheduled_date);

create table public.observations (
  id uuid primary key default gen_random_uuid(),
  activity_instance_id uuid not null unique references public.activity_instances(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  engagement text not null check (engagement in ('low', 'medium', 'high')),
  challenge_level text not null check (challenge_level in ('easy', 'just_right', 'stretch')),
  repeated boolean not null default false,
  parent_note text check (parent_note is null or char_length(parent_note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index observations_child_id_idx on public.observations(child_id);

insert into public.activity_templates
  (slug, title, domain, min_age_months, max_age_months, duration_minutes, summary, instructions, conversation_prompt, look_for, why_it_matters, safety_note, materials, embedded_learning)
values
  ('mirror-conversation', 'A conversation in the mirror', 'language', 0, 18, 5,
   'Share sounds, expressions, and small pauses together in front of a mirror.',
   'Sit together near a safe mirror. Copy one expression or sound your child makes, then pause and wait for their response.',
   '“I see you. Can you see me?”',
   'Eye contact, copied sounds, or a change in expression.',
   'Back-and-forth interaction supports early communication and connection.',
   'Use a securely fixed, shatter-resistant mirror and stay beside your child.', array['safe mirror'], true),
  ('texture-treasure-basket', 'A basket of textures', 'sensory', 3, 24, 10,
   'Explore a few safe household textures without directing how they should be used.',
   'Place three or four large safe objects in a shallow basket. Let your child reach, touch, compare, and return to favourites.',
   '“That one feels different. What did you notice?”',
   'Grasping, transferring, repeated touching, or clear preferences.',
   'Sensory comparison builds attention, coordination, and descriptive language.',
   'Avoid choking hazards, sharp edges, loose fibres, and unattended exploration.', array['shallow basket', 'large safe household objects'], false),
  ('family-of-objects', 'Find a family of objects', 'maths', 10, 48, 15,
   'Sort safe household objects using a rule your child discovers.',
   'Gather a few safe objects and wonder aloud which ones belong together. Let your child decide what “together” means.',
   '“I wonder which of these are a family?”',
   'Sorting by colour, size, purpose—or an inventive rule of their own.',
   'Sorting builds early mathematical thinking while giving your child control over the rules.',
   'Use large, non-breakable objects and stay nearby.', array['bowls', 'spoons', 'safe household objects'], true),
  ('follow-the-sound', 'Follow the sound', 'movement', 4, 30, 10,
   'Use a gentle sound to invite turning, crawling, or walking.',
   'Make a soft sound from nearby, wait for your child to locate it, then move a little and repeat. Keep it playful and optional.',
   '“Where did that sound go?”',
   'Head turning, tracking, moving toward the sound, or making a sound back.',
   'Locating sound combines listening, memory, and whole-body coordination.',
   'Keep the route clear and never use loud sounds close to the ears.', array['soft bell or container with dry rice'], false),
  ('water-pour-laboratory', 'The water-pour laboratory', 'life_skills', 18, 48, 15,
   'Practise pouring, estimating, and cleaning up with a small amount of water.',
   'Place two sturdy cups on a towel with a little water. Demonstrate one slow pour, then let your child experiment.',
   '“What do you think will happen if this cup is fuller?”',
   'Careful hand movements, prediction, persistence, or adjusting after a spill.',
   'Pouring develops coordination, practical independence, and early ideas about volume.',
   'Use only a small amount of water, supervise closely, and wipe slippery spills.', array['two cups', 'water', 'towel'], true),
  ('shadow-hunt', 'A little shadow hunt', 'nature', 18, 48, 15,
   'Notice how light makes shadows indoors or outside.',
   'Find two or three shadows together. Move a hand or object and notice what changes. Follow your child’s questions.',
   '“Can your shadow become tiny? Can it become tall?”',
   'Movement experiments, noticing shape changes, or searching for new shadows.',
   'Shadow play encourages observation, prediction, and curiosity about the physical world.',
   'Never look directly at the sun; choose a comfortable, safe place to move.', array['sunlight or a lamp', 'safe objects'], false),
  ('music-stop-go', 'Music: stop and go', 'movement', 12, 48, 10,
   'Move together and experiment with stopping when the music pauses.',
   'Play a familiar song, move in any way that feels good, pause briefly, then begin again. Let your child control some pauses.',
   '“Ready… shall we make it stop?”',
   'Anticipation, balance, laughter, or inventing a movement.',
   'Stop-and-go play develops listening, inhibition, rhythm, and shared attention.',
   'Clear the movement area and keep the volume comfortable.', array['music player'], false),
  ('cardboard-mark-making', 'Marks with a story', 'creative', 12, 48, 15,
   'Make large marks and turn them into a shared story.',
   'Offer a large piece of cardboard and one or two washable tools. Describe the marks without asking for a recognisable picture.',
   '“That line travelled a long way. Where might it go next?”',
   'Repeated motions, changing pressure, naming marks, or adding a story.',
   'Open-ended mark making supports coordination, expression, and symbolic thinking.',
   'Use non-toxic washable materials and supervise to prevent mouthing.', array['cardboard', 'washable crayons'], false)
on conflict (slug) do nothing;

create or replace function public.can_access_activity_instance(target_instance_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.activity_instances ai
    join public.family_members fm on fm.family_id = (select family_id from public.children where id = ai.child_id)
    where ai.id = target_instance_id and fm.user_id = auth.uid()
  );
$$;

create or replace function public.configure_learning_profile(
  p_family_id uuid,
  p_child_id uuid,
  p_screen_policy text,
  p_structure_level text,
  p_weekday_minutes integer,
  p_weekend_minutes integer,
  p_prefer_embedded boolean,
  p_caregiver_name text,
  p_relationship text,
  p_caregiver_languages text[],
  p_aspirations text[],
  p_language_goals text[]
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  caregiver_id uuid;
  item text;
begin
  if not public.can_access_family(p_family_id) then raise exception 'Access denied'; end if;
  if not exists (select 1 from public.children where id = p_child_id and family_id = p_family_id) then
    raise exception 'Child does not belong to this family';
  end if;

  insert into public.family_preferences
    (family_id, screen_policy, structure_level, weekday_minutes, weekend_minutes, prefer_embedded_learning, updated_at)
  values
    (p_family_id, p_screen_policy, p_structure_level, p_weekday_minutes, p_weekend_minutes, p_prefer_embedded, now())
  on conflict (family_id) do update set
    screen_policy = excluded.screen_policy,
    structure_level = excluded.structure_level,
    weekday_minutes = excluded.weekday_minutes,
    weekend_minutes = excluded.weekend_minutes,
    prefer_embedded_learning = excluded.prefer_embedded_learning,
    updated_at = now();

  if nullif(trim(p_caregiver_name), '') is not null then
    select id into caregiver_id from public.caregivers
    where family_id = p_family_id and lower(display_name) = lower(trim(p_caregiver_name)) limit 1;
    if caregiver_id is null then
      insert into public.caregivers (family_id, display_name, relationship)
      values (p_family_id, trim(p_caregiver_name), nullif(trim(p_relationship), '')) returning id into caregiver_id;
    end if;
    foreach item in array coalesce(p_caregiver_languages, '{}') loop
      if nullif(trim(item), '') is not null then
        insert into public.caregiver_languages (caregiver_id, language_code)
        values (caregiver_id, lower(trim(item))) on conflict do nothing;
      end if;
    end loop;
  end if;

  foreach item in array coalesce(p_aspirations, '{}') loop
    if nullif(trim(item), '') is not null then
      insert into public.aspirations (child_id, title) values (p_child_id, trim(item)) on conflict do nothing;
    end if;
  end loop;
  foreach item in array coalesce(p_language_goals, '{}') loop
    if nullif(trim(item), '') is not null then
      insert into public.child_language_goals (child_id, language_code)
      values (p_child_id, lower(trim(item))) on conflict do nothing;
    end if;
  end loop;
end;
$$;

create or replace function public.generate_weekly_plan(p_child_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  new_plan_id uuid;
  child_age_months integer;
  prefer_embedded boolean := true;
  available_minutes integer := 15;
  monday date := current_date - (extract(isodow from current_date)::integer - 1);
begin
  if not public.can_access_child(p_child_id) then raise exception 'Access denied'; end if;
  select greatest(0, extract(year from age(current_date, make_date(birth_year, birth_month, 1)))::integer * 12
    + extract(month from age(current_date, make_date(birth_year, birth_month, 1)))::integer)
    into child_age_months from public.children where id = p_child_id;
  select fp.prefer_embedded_learning, greatest(fp.weekday_minutes, fp.weekend_minutes)
    into prefer_embedded, available_minutes
    from public.family_preferences fp
    join public.children c on c.family_id = fp.family_id
    where c.id = p_child_id;

  insert into public.plans (child_id, week_start) values (p_child_id, monday)
  on conflict (child_id, week_start) do update set status = 'active'
  returning id into new_plan_id;

  if not exists (select 1 from public.activity_instances where plan_id = new_plan_id) then
    insert into public.activity_instances
      (plan_id, child_id, template_id, scheduled_date, personalized_title, personalized_instructions)
    select new_plan_id, p_child_id, ranked.id, monday + (ranked.rn - 1), ranked.title, ranked.instructions
    from (
      select at.*, row_number() over (
        order by
          case when prefer_embedded then at.embedded_learning else false end desc,
          abs(at.duration_minutes - greatest(5, least(available_minutes, 30))),
          at.domain,
          at.slug
      )::integer as rn
      from public.activity_templates at
      where at.reviewed and child_age_months between at.min_age_months and at.max_age_months
      order by
        case when prefer_embedded then at.embedded_learning else false end desc,
        abs(at.duration_minutes - greatest(5, least(available_minutes, 30))),
        at.domain,
        at.slug
      limit 7
    ) ranked;
  end if;
  return new_plan_id;
end;
$$;

create or replace function public.record_activity_feedback(
  p_instance_id uuid,
  p_engagement text,
  p_challenge_level text,
  p_repeated boolean,
  p_parent_note text default null
)
returns void language plpgsql security definer set search_path = '' as $$
declare target_child_id uuid;
begin
  if not public.can_access_activity_instance(p_instance_id) then raise exception 'Access denied'; end if;
  select child_id into target_child_id from public.activity_instances where id = p_instance_id;
  insert into public.observations
    (activity_instance_id, child_id, engagement, challenge_level, repeated, parent_note, updated_at)
  values
    (p_instance_id, target_child_id, p_engagement, p_challenge_level, p_repeated, nullif(trim(p_parent_note), ''), now())
  on conflict (activity_instance_id) do update set
    engagement = excluded.engagement,
    challenge_level = excluded.challenge_level,
    repeated = excluded.repeated,
    parent_note = excluded.parent_note,
    updated_at = now();
  update public.activity_instances set status = 'completed' where id = p_instance_id;
end;
$$;

revoke all on function public.can_access_activity_instance(uuid) from public;
revoke all on function public.configure_learning_profile(uuid, uuid, text, text, integer, integer, boolean, text, text, text[], text[], text[]) from public;
revoke all on function public.generate_weekly_plan(uuid) from public;
revoke all on function public.record_activity_feedback(uuid, text, text, boolean, text) from public;
grant execute on function public.can_access_activity_instance(uuid) to authenticated;
grant execute on function public.configure_learning_profile(uuid, uuid, text, text, integer, integer, boolean, text, text, text[], text[], text[]) to authenticated;
grant execute on function public.generate_weekly_plan(uuid) to authenticated;
grant execute on function public.record_activity_feedback(uuid, text, text, boolean, text) to authenticated;

alter table public.family_preferences enable row level security;
alter table public.caregivers enable row level security;
alter table public.caregiver_languages enable row level security;
alter table public.aspirations enable row level security;
alter table public.child_language_goals enable row level security;
alter table public.activity_templates enable row level security;
alter table public.plans enable row level security;
alter table public.activity_instances enable row level security;
alter table public.observations enable row level security;

create policy "Members manage family preferences" on public.family_preferences for all to authenticated
using (public.can_access_family(family_id)) with check (public.can_access_family(family_id));
create policy "Members manage caregivers" on public.caregivers for all to authenticated
using (public.can_access_family(family_id)) with check (public.can_access_family(family_id));
create policy "Members manage caregiver languages" on public.caregiver_languages for all to authenticated
using (exists (select 1 from public.caregivers c where c.id = caregiver_id and public.can_access_family(c.family_id)))
with check (exists (select 1 from public.caregivers c where c.id = caregiver_id and public.can_access_family(c.family_id)));
create policy "Members manage aspirations" on public.aspirations for all to authenticated
using (public.can_access_child(child_id)) with check (public.can_access_child(child_id));
create policy "Members manage language goals" on public.child_language_goals for all to authenticated
using (public.can_access_child(child_id)) with check (public.can_access_child(child_id));
create policy "Authenticated users read reviewed activities" on public.activity_templates for select to authenticated
using (reviewed = true);
create policy "Members manage plans" on public.plans for all to authenticated
using (public.can_access_child(child_id)) with check (public.can_access_child(child_id));
create policy "Members manage activity instances" on public.activity_instances for all to authenticated
using (public.can_access_child(child_id)) with check (public.can_access_child(child_id));
create policy "Members manage observations" on public.observations for all to authenticated
using (public.can_access_child(child_id)) with check (public.can_access_child(child_id));
