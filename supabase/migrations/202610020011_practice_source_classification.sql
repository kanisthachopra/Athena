-- Preserve exact source descriptions in existing generation/review records.
-- These specific practice descriptions are not trials or expert consensus.
-- No editor, review, publication, template or family record is created/changed.
begin;
do $migration$
declare
  definition text := pg_get_functiondef('public.publish_activity_release(uuid,jsonb,jsonb)'::regprocedure);
  old_fragment text := $old$when 'Practice explanation' then 'practice_explanation'$old$;
  new_fragment text := $new$when 'Practice explanation' then 'practice_explanation'
        when 'Educator practice article with classroom examples' then 'practice_explanation'
        when 'Expert practice guide; not a trial of MIRA activities' then 'practice_explanation'
        when 'Professional guidance' then 'practice_explanation'$new$;
begin
  if strpos(definition,new_fragment)>0 then return; end if;
  if (length(definition)-length(replace(definition,old_fragment,'')))/length(old_fragment)<>1 then
    raise exception 'MIRA_PUBLICATION_CLASSIFIER_UNEXPECTED';
  end if;
  execute replace(definition,old_fragment,new_fragment);
end;
$migration$;
commit;
