-- Ensure even the youngest children receive a complete, developmentally safe week.

insert into public.activity_templates
  (slug, title, domain, min_age_months, max_age_months, duration_minutes, summary, instructions, conversation_prompt, look_for, why_it_matters, safety_note, materials, embedded_learning)
values
  ('care-routine-commentary', 'A story during care', 'language', 0, 48, 5,
   'Turn an ordinary care moment into calm, responsive conversation.',
   'During a familiar care routine, describe one small thing at a time. Pause after each phrase so your child has room to respond with a look, sound, gesture, or word.',
   '“One soft sleeve. Now where does your hand go?”',
   'A change in gaze, a small movement, a sound, or an attempt to join the routine.',
   'Warm narration connects language with predictable real-life experiences.',
   'Keep one hand supporting your child whenever the care surface requires it.', array['an ordinary care routine'], true),
  ('song-and-pause', 'A song with a little pause', 'language', 0, 48, 5,
   'Sing a familiar song and leave a playful space for your child to answer.',
   'Choose a short familiar song. Sing softly, pause before a repeated sound or line, and wait. Treat any look, movement, sound, or word as part of the song.',
   '“Here comes your part…”',
   'Anticipation, stillness, a smile, a movement, a sound, or a word.',
   'Pausing makes music a two-way exchange and supports early turn-taking.',
   'Keep the volume gentle and never play sound close to your child’s ears.', array['your voice'], true),
  ('window-noticing', 'What can we notice?', 'nature', 0, 48, 5,
   'Share a quiet look at light, movement, or weather through a safe window.',
   'Settle together at a safely closed window or shaded outdoor spot. Notice one thing slowly—a moving leaf, shifting light, or a cloud—and follow your child’s gaze.',
   '“I see something moving. What caught your eye?”',
   'Gaze shifts, tracking, quiet attention, pointing, or naming.',
   'Shared noticing builds attention, connection, and early observation.',
   'Keep windows secured, support babies fully, and avoid direct bright sunlight.', array['a safe view'], true),
  ('gentle-body-map', 'A gentle body map', 'movement', 0, 48, 5,
   'Name and notice comfortable movements from head to toes.',
   'With your child comfortably supported, name one body part and make a small natural movement together. Pause and follow their signals rather than completing a sequence.',
   '“There are your toes. Shall we give them a tiny wiggle?”',
   'Relaxation, an intentional movement, imitation, or a signal to pause.',
   'Body awareness grows through safe movement paired with warm language.',
   'Never force a movement; stop if your child turns away, stiffens, or seems uncomfortable.', array['a comfortable floor space or your lap'], false),
  ('cloth-texture-talk', 'Soft cloth, slow noticing', 'sensory', 0, 48, 5,
   'Compare two safe fabrics through touch, sight, and simple words.',
   'Offer one clean, intact cloth at a time. Brush it lightly against your own hand, then let your child look, reach, or touch in their own way.',
   '“This one feels smooth to me. What do you notice?”',
   'Looking, reaching, grasping, releasing, rubbing, or a clear preference.',
   'Slow sensory comparison supports attention, touch awareness, and descriptive language.',
   'Use large intact cloths without loose threads and supervise continuously.', array['two clean, intact cloths'], false),
  ('face-to-face-copy', 'Copy me, copy you', 'creative', 0, 48, 5,
   'Take turns copying one simple expression, sound, or movement.',
   'Sit face to face at a comfortable distance. Copy something your child naturally does, pause, then offer one simple expression, sound, or movement of your own.',
   '“You did that—and I saw you.”',
   'Focused looking, repetition, a new response, laughter, or a pause that keeps the exchange going.',
   'Imitation supports connection, agency, memory, and creative communication.',
   'Keep movements slow and comfortable, and follow your child’s cues to stop.', array['nothing special'], true)
on conflict (slug) do nothing;

create or replace function public.generate_weekly_plan(p_child_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  new_plan_id uuid;
  child_age_months integer;
  prefer_embedded boolean := true;
  available_minutes integer := 15;
  existing_count integer := 0;
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

  select count(*)::integer into existing_count
  from public.activity_instances where plan_id = new_plan_id;

  if existing_count < 7 then
    insert into public.activity_instances
      (plan_id, child_id, template_id, scheduled_date, personalized_title, personalized_instructions)
    select new_plan_id, p_child_id, ranked.id,
      monday + existing_count + (ranked.rn - 1), ranked.title, ranked.instructions
    from (
      select at.*, row_number() over (
        order by
          case when prefer_embedded then at.embedded_learning else false end desc,
          abs(at.duration_minutes - greatest(5, least(available_minutes, 30))),
          at.domain,
          at.slug
      )::integer as rn
      from public.activity_templates at
      where at.reviewed
        and child_age_months between at.min_age_months and at.max_age_months
        and not exists (
          select 1 from public.activity_instances ai
          where ai.plan_id = new_plan_id and ai.template_id = at.id
        )
      order by
        case when prefer_embedded then at.embedded_learning else false end desc,
        abs(at.duration_minutes - greatest(5, least(available_minutes, 30))),
        at.domain,
        at.slug
      limit greatest(0, 7 - existing_count)
    ) ranked;
  end if;
  return new_plan_id;
end;
$$;

revoke all on function public.generate_weekly_plan(uuid) from public;
grant execute on function public.generate_weekly_plan(uuid) to authenticated;
