-- Security repair: internal SECURITY DEFINER helpers must never be client RPCs.
-- Earlier migrations revoked PUBLIC/authenticated but left explicit anon grants.
-- No data, plans, function bodies or authenticated public wrappers are changed.
begin;

revoke all on function public.configure_learning_profile_internal(uuid, uuid, text, text, integer, integer, boolean, text, text, text[], text[], text[]) from public, anon, authenticated;
revoke all on function public.generate_weekly_plan_internal(uuid) from public, anon, authenticated;
revoke all on function public.generate_next_week_plan_internal(uuid) from public, anon, authenticated;
revoke all on function public.record_activity_feedback_internal(uuid, text, text, boolean, text) from public, anon, authenticated;
revoke all on function public.skip_activity_internal(uuid) from public, anon, authenticated;
revoke all on function public.replace_planned_activity_internal(uuid, uuid) from public, anon, authenticated;
revoke all on function public.populate_weekly_portfolio_internal(uuid, uuid, date, uuid) from public, anon, authenticated;

-- Verify effective privileges, including inherited grants. Roll back if any remain.
do $$
declare
  signature text;
begin
  foreach signature in array array[
    'public.configure_learning_profile_internal(uuid,uuid,text,text,integer,integer,boolean,text,text,text[],text[],text[])',
    'public.generate_weekly_plan_internal(uuid)',
    'public.generate_next_week_plan_internal(uuid)',
    'public.record_activity_feedback_internal(uuid,text,text,boolean,text)',
    'public.skip_activity_internal(uuid)',
    'public.replace_planned_activity_internal(uuid,uuid)',
    'public.populate_weekly_portfolio_internal(uuid,uuid,date,uuid)'
  ] loop
    if has_function_privilege('anon', signature, 'EXECUTE')
       or has_function_privilege('authenticated', signature, 'EXECUTE') then
      raise exception 'Internal RPC remains client-executable: %', signature;
    end if;
  end loop;
end;
$$;

notify pgrst, 'reload schema';
commit;
