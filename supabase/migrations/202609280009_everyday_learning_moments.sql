-- MIRA Milestone 8: caregiver-recorded learning moments beyond planned activities.

create table public.learning_moments (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  recorded_by uuid references auth.users(id) on delete set null default auth.uid(),
  occurred_on date not null default current_date,
  domain text not null default 'everyday'
    check (domain in ('everyday', 'language', 'movement', 'sensory', 'maths', 'creative', 'life_skills', 'nature')),
  title text not null check (char_length(trim(title)) between 1 and 100),
  note text not null check (char_length(trim(note)) between 1 and 1200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index learning_moments_child_date_idx
on public.learning_moments(child_id, occurred_on desc, created_at desc);

alter table public.learning_moments enable row level security;

create policy "Members read learning moments"
on public.learning_moments for select to authenticated
using (public.can_access_child(child_id));

-- Mutations use role-aware functions so viewers remain read-only.
revoke insert, update, delete on public.learning_moments from authenticated;

create or replace function public.create_learning_moment(
  p_child_id uuid,
  p_occurred_on date,
  p_domain text,
  p_title text,
  p_note text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  new_moment_id uuid;
begin
  if not public.can_edit_child(p_child_id) then raise exception 'Caregiver access required'; end if;
  if p_occurred_on is null or p_occurred_on > current_date or p_occurred_on < current_date - 365 then
    raise exception 'Choose a date within the past year';
  end if;
  if p_domain not in ('everyday', 'language', 'movement', 'sensory', 'maths', 'creative', 'life_skills', 'nature') then
    raise exception 'Choose a valid learning area';
  end if;
  if nullif(trim(p_title), '') is null or char_length(trim(p_title)) > 100 then
    raise exception 'Moment title must be between 1 and 100 characters';
  end if;
  if nullif(trim(p_note), '') is null or char_length(trim(p_note)) > 1200 then
    raise exception 'Moment note must be between 1 and 1200 characters';
  end if;

  insert into public.learning_moments
    (child_id, recorded_by, occurred_on, domain, title, note)
  values
    (p_child_id, auth.uid(), p_occurred_on, p_domain, trim(p_title), trim(p_note))
  returning id into new_moment_id;

  return new_moment_id;
end;
$$;

create or replace function public.delete_learning_moment(p_moment_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.learning_moments lm
  where lm.id = p_moment_id and public.can_edit_child(lm.child_id);
  if not found then raise exception 'Learning moment not found or access denied'; end if;
end;
$$;

revoke all on function public.create_learning_moment(uuid, date, text, text, text) from public;
revoke all on function public.delete_learning_moment(uuid) from public;
grant execute on function public.create_learning_moment(uuid, date, text, text, text) to authenticated;
grant execute on function public.delete_learning_moment(uuid) to authenticated;

comment on table public.learning_moments is
'Caregiver notes about spontaneous learning that happened outside a planned MIRA activity.';
