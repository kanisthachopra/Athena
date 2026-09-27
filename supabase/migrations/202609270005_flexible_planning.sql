-- MIRA Milestone 4: caregiver-controlled skipping and reviewed activity swaps.

-- Keep several safe alternatives available even for the youngest age band.
insert into public.activity_templates
  (slug, title, domain, min_age_months, max_age_months, duration_minutes, summary, instructions, conversation_prompt, look_for, why_it_matters, safety_note, materials, embedded_learning)
values
  ('shared-book-wonder', 'A book, slowly shared', 'language', 0, 48, 5,
   'Explore one sturdy page through looking, pointing, sounds, and pauses.',
   'Choose a sturdy book and settle together. Stay on one page as long as your child is interested. Name one detail, pause, and follow their gaze or gesture.',
   '“I noticed that. What caught your eye?”',
   'Looking, reaching, turning away, touching, pointing, sounds, or words.',
   'Shared books support connection and language without requiring a child to sit through a story.',
   'Use an intact age-safe book, support babies comfortably, and stop if pages become a mouthing hazard.', array['a sturdy age-safe book'], true),
  ('one-colour-noticing', 'One colour everywhere', 'creative', 0, 48, 5,
   'Notice one colour appearing in the room, clothing, or view outside.',
   'Choose one visible colour. Point out two nearby examples slowly, then pause to see where your child looks or what they choose to add.',
   '“I found another patch of blue. Where should we look next?”',
   'Gaze shifts, reaching, pointing, naming, or choosing an unexpected match.',
   'Colour noticing combines visual attention, early categorisation, and shared creativity.',
   'Use only objects already safe in the space; do not place loose objects within a baby’s reach.', array['a familiar space'], true),
  ('home-sound-pause', 'A tiny map of home sounds', 'sensory', 0, 48, 5,
   'Pause together for two or three gentle everyday sounds.',
   'Settle in a comfortable place. Notice one quiet sound already happening, name it, and wait. Follow your child’s response before noticing another.',
   '“I heard a soft sound. Did you hear it too?”',
   'Stillness, turning, widening eyes, pointing, copying, or naming.',
   'Attending to familiar sounds supports listening, orientation, and language.',
   'Do not create sudden or loud noises, and never make sounds close to the ears.', array['ordinary household sounds'], true),
  ('slow-sky-moment', 'A slow sky moment', 'nature', 0, 48, 5,
   'Notice brightness, clouds, or changing light from a protected spot.',
   'From shade or through a secured window, look toward the general sky without directing your child’s eyes. Describe one change and pause.',
   '“The light changed a little. What do you notice?”',
   'Quiet attention, tracking, blinking, pointing, sounds, or descriptive words.',
   'Slow observation supports regulation, shared attention, and curiosity about change.',
   'Never look directly at the sun; keep babies fully supported and windows secured.', array['a shaded or window view'], true)
on conflict (slug) do nothing;

create or replace function public.skip_activity(p_instance_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.can_access_activity_instance(p_instance_id) then raise exception 'Access denied'; end if;
  update public.activity_instances
  set status = 'skipped'
  where id = p_instance_id and status = 'planned';
end;
$$;

create or replace function public.replace_planned_activity(
  p_instance_id uuid,
  p_template_id uuid
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  target_child_id uuid;
  target_plan_id uuid;
  child_age_months integer;
  replacement public.activity_templates%rowtype;
begin
  if not public.can_access_activity_instance(p_instance_id) then raise exception 'Access denied'; end if;

  select ai.child_id into target_child_id
  from public.activity_instances ai
  where ai.id = p_instance_id and ai.status = 'planned';
  select ai.plan_id into target_plan_id
  from public.activity_instances ai
  where ai.id = p_instance_id and ai.status = 'planned';
  if target_child_id is null then raise exception 'Only planned activities can be replaced'; end if;

  select greatest(0, extract(year from age(current_date, make_date(birth_year, birth_month, 1)))::integer * 12
    + extract(month from age(current_date, make_date(birth_year, birth_month, 1)))::integer)
  into child_age_months from public.children where id = target_child_id;

  select * into replacement from public.activity_templates
  where id = p_template_id and reviewed
    and child_age_months between min_age_months and max_age_months;
  if replacement.id is null then raise exception 'Replacement is not suitable for this child'; end if;
  if exists (
    select 1 from public.activity_instances
    where plan_id = target_plan_id and template_id = p_template_id and id <> p_instance_id
  ) then raise exception 'This activity is already in the selected week'; end if;

  update public.activity_instances set
    template_id = replacement.id,
    personalized_title = replacement.title,
    personalized_instructions = replacement.instructions,
    selection_reason = 'Chosen by the caregiver from MIRA’s reviewed library.'
  where id = p_instance_id;
end;
$$;

revoke all on function public.skip_activity(uuid) from public;
revoke all on function public.replace_planned_activity(uuid, uuid) from public;
grant execute on function public.skip_activity(uuid) to authenticated;
grant execute on function public.replace_planned_activity(uuid, uuid) to authenticated;
