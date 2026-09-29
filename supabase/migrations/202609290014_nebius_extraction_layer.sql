-- MIRA Milestone 14: bounded, auditable AI extraction.
-- The model never receives database credentials and never writes application data.

create table public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  feature text not null check (feature in ('observation_extraction', 'onboarding_extraction', 'ask')),
  provider text not null default 'nebius',
  model text not null,
  status text not null check (status in ('succeeded', 'fallback', 'failed', 'budget_blocked')),
  input_hash text not null,
  prompt_tokens integer not null default 0 check (prompt_tokens >= 0),
  completion_tokens integer not null default 0 check (completion_tokens >= 0),
  latency_ms integer not null default 0 check (latency_ms >= 0),
  estimated_cost_microusd bigint check (estimated_cost_microusd is null or estimated_cost_microusd >= 0),
  error_code text,
  created_at timestamptz not null default now()
);

create index ai_runs_user_feature_created_idx
on public.ai_runs(user_id, feature, created_at desc);

alter table public.ai_runs enable row level security;

create policy "Members read their own AI runs"
on public.ai_runs for select to authenticated
using (user_id = auth.uid() and public.can_access_family(family_id));

create policy "Members record their own AI runs"
on public.ai_runs for insert to authenticated
with check (user_id = auth.uid() and public.can_access_family(family_id));

revoke update, delete on public.ai_runs from authenticated;
grant select, insert on public.ai_runs to authenticated;

comment on table public.ai_runs is
'Privacy-minimized operational metadata for bounded AI features. Raw prompts and model output are never logged here.';
