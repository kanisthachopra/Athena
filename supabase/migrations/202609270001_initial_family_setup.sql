create extension if not exists pgcrypto;

create table public.families (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (char_length(trim(display_name)) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.family_members (
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'caregiver', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (family_id, user_id)
);

create index family_members_user_id_idx on public.family_members(user_id);

create table public.children (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  nickname text not null check (char_length(trim(nickname)) between 1 and 60),
  birth_year smallint not null check (birth_year between 1900 and 2200),
  birth_month smallint not null check (birth_month between 1 and 12),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index children_family_id_idx on public.children(family_id);

create or replace function public.can_access_family(target_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.family_members
    where family_id = target_family_id and user_id = auth.uid()
  );
$$;

create or replace function public.can_access_child(target_child_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.children c
    join public.family_members fm on fm.family_id = c.family_id
    where c.id = target_child_id and fm.user_id = auth.uid()
  );
$$;

create or replace function public.create_family_with_child(
  p_display_name text,
  p_child_nickname text,
  p_birth_year smallint,
  p_birth_month smallint
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_family_id uuid;
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if trim(p_display_name) = '' or trim(p_child_nickname) = '' then
    raise exception 'Family and child names are required';
  end if;

  if p_birth_month not between 1 and 12 or p_birth_year not between 1900 and 2200 then
    raise exception 'Invalid birth month or year';
  end if;

  if exists (select 1 from public.family_members where user_id = current_user_id) then
    raise exception 'This account already belongs to a family';
  end if;

  insert into public.families (display_name)
  values (trim(p_display_name))
  returning id into new_family_id;

  insert into public.family_members (family_id, user_id, role)
  values (new_family_id, current_user_id, 'owner');

  insert into public.children (family_id, nickname, birth_year, birth_month)
  values (new_family_id, trim(p_child_nickname), p_birth_year, p_birth_month);

  return new_family_id;
end;
$$;

revoke all on function public.can_access_family(uuid) from public;
revoke all on function public.can_access_child(uuid) from public;
revoke all on function public.create_family_with_child(text, text, smallint, smallint) from public;
grant execute on function public.can_access_family(uuid) to authenticated;
grant execute on function public.can_access_child(uuid) to authenticated;
grant execute on function public.create_family_with_child(text, text, smallint, smallint) to authenticated;

alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.children enable row level security;

create policy "Members can read their family"
on public.families for select to authenticated
using (public.can_access_family(id));

create policy "Owners can update their family"
on public.families for update to authenticated
using (exists (
  select 1 from public.family_members
  where family_id = id and user_id = auth.uid() and role = 'owner'
))
with check (exists (
  select 1 from public.family_members
  where family_id = id and user_id = auth.uid() and role = 'owner'
));

create policy "Members can read family membership"
on public.family_members for select to authenticated
using (public.can_access_family(family_id));

create policy "Members can read children"
on public.children for select to authenticated
using (public.can_access_family(family_id));

create policy "Owners and caregivers can add children"
on public.children for insert to authenticated
with check (exists (
  select 1 from public.family_members
  where family_id = children.family_id
    and user_id = auth.uid()
    and role in ('owner', 'caregiver')
));

create policy "Owners and caregivers can update children"
on public.children for update to authenticated
using (exists (
  select 1 from public.family_members
  where family_id = children.family_id
    and user_id = auth.uid()
    and role in ('owner', 'caregiver')
))
with check (exists (
  select 1 from public.family_members
  where family_id = children.family_id
    and user_id = auth.uid()
    and role in ('owner', 'caregiver')
));

create policy "Owners can remove children"
on public.children for delete to authenticated
using (exists (
  select 1 from public.family_members
  where family_id = children.family_id
    and user_id = auth.uid()
    and role = 'owner'
));

comment on function public.create_family_with_child(text, text, smallint, smallint)
is 'Atomically creates a family, owner membership, and first child for the signed-in user.';
