-- Public library/source context is now included in Guide requests. Require the
-- current disclosure before enabling optional AI; never enable existing flags.
begin;
do $$
declare definition text;
begin
  select pg_get_functiondef('public.set_family_ai_preferences(uuid,integer,boolean,boolean,boolean,text)'::regprocedure) into definition;
  if position('2026-10-01-v1' in definition)=0 then raise exception 'MIRA_AI_DISCLOSURE_REVIEW_REQUIRED: unexpected preferences function'; end if;
  execute replace(definition,'2026-10-01-v1','2026-10-01-v2');
end;
$$;
revoke all on function public.set_family_ai_preferences(uuid,integer,boolean,boolean,boolean,text) from public,anon,authenticated;
grant execute on function public.set_family_ai_preferences(uuid,integer,boolean,boolean,boolean,text) to authenticated;
notify pgrst,'reload schema';
commit;
