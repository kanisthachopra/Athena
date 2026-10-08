"use client";
import { useActionState, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { contextDatePlus, type ActivityContextOption, type ContextAnswers } from "@/lib/activity-context";
import { saveActivityContext, type ContextSaveState } from "@/app/library/context/actions";

export function ActivityContextForm({ option, childId, date, canEdit }: { option: ActivityContextOption; childId: string; date: string; canEdit: boolean }) {
  const current = option.confirmation;
  const reusable = current && current.content_version === option.content_version && current.valid_from <= date && current.valid_until >= date;
  const [answers, setAnswers] = useState<ContextAnswers>(() => Object.fromEntries(option.contract.checks.map(check => [check.id, reusable ? current.answers[check.id] : null])));
  const [until, setUntil] = useState(reusable ? current.valid_until : date);
  const [edited, setEdited] = useState(false);
  const [state, action, pending] = useActionState(async (previous: ContextSaveState, form: FormData) => {
    setEdited(false);
    try {
      const result = await saveActivityContext(previous, form);
      return { ...result, revision: result.revision ?? previous.revision };
    } catch {
      return { error: "The save could not be confirmed. Your answers are still here. Refresh to check them before trying again.", success: null, revision: previous.revision, refreshRequired: true };
    }
  }, { error: null, success: null, revision: current?.revision ?? 0, refreshRequired: false } as ContextSaveState);
  return <form action={action} className="mt-5 grid max-w-2xl gap-5" aria-busy={pending}>
    <input type="hidden" name="childId" value={childId} /><input type="hidden" name="templateId" value={option.template_id} />
    <input type="hidden" name="contentVersion" value={option.content_version} /><input type="hidden" name="revision" value={state.revision ?? 0} />
    <input type="hidden" name="contract" value={JSON.stringify(option.contract)} /><input type="hidden" name="answers" value={JSON.stringify(answers)} />
    <input type="hidden" name="validFrom" value={date} />
    <p className="leading-7 text-muted-foreground">Answer for {date}. “Not sure” is a valid answer; MIRA will leave this idea out until its required conditions are confirmed. These answers describe the context, not your child’s ability.</p>
    <fieldset disabled={!canEdit || pending || state.refreshRequired} className="grid min-w-0 gap-6">
      <legend className="sr-only">Conditions for {option.title}</legend>
      {option.contract.checks.map(check => <fieldset key={check.id} className="min-w-0">
        <legend className="max-w-prose break-words font-semibold leading-7">{check.statement}</legend>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1">{([true, false, null] as const).map(value => <label key={String(value)} className="flex min-h-11 cursor-pointer items-center gap-2">
          <input type="radio" className="h-5 w-5 accent-primary" name={`${option.template_id}-${check.id}`} checked={answers[check.id] === value}
            onChange={() => { setAnswers(previous => ({ ...previous, [check.id]: value })); setEdited(true); }} />
          <span>{value === true ? "Yes" : value === false ? "No" : "Not sure"}</span>
        </label>)}</div>
      </fieldset>)}
      <label className="grid max-w-sm gap-2 font-semibold">Use these answers through
        <input className="mira-input" type="date" name="validUntil" min={date} max={contextDatePlus(date, option.contract.max_valid_days - 1)} value={until}
          onChange={event => { setUntil(event.target.value); setEdited(true); }} required />
        <span className="text-sm font-normal leading-6 text-muted-foreground">Only include days when you expect the same conditions. This check can cover at most {option.contract.max_valid_days} {option.contract.max_valid_days === 1 ? "day" : "days"}. Update it sooner if anything changes.</span>
      </label>
      {canEdit && <div><button className="button-primary" type="submit" disabled={pending}>{pending ? <><LoaderCircle aria-hidden="true" size={17} className="animate-spin" /> Saving answers…</> : "Save context answers"}</button></div>}
    </fieldset>
    {!canEdit && <p className="text-sm leading-6 text-muted-foreground">You can read these answers. A family caregiver can change them.</p>}
    {!edited && state.error && <p role="alert" className="leading-7 text-destructive">{state.error}</p>}
    {!edited && state.success && <p role="status" className="leading-7">{state.success}</p>}
    {state.refreshRequired && <a className="button-ghost justify-self-start" href={`/library/context?date=${date}`}>Refresh saved checks</a>}
  </form>;
}
