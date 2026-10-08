"use client";
import { correctLearningMoment } from "@/app/insights/actions";
import { emptyJournalCorrection, journalCorrectionFailure, observationDomains, type JournalCorrectionState } from "@/lib/journal-entry";
import { useJournalNotice } from "@/components/journal-notice";
import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";

export function JournalMomentControls({ moment, childId, today }: {
  moment: { id: string; title: string; note: string; domain: string; occurred_on: string; updated_at: string };
  childId: string; today: string;
}) {
  const [title, setTitle] = useState(moment.title);
  const [note, setNote] = useState(moment.note);
  const [domain, setDomain] = useState(moment.domain);
  const [date, setDate] = useState(moment.occurred_on);
  const [dirty, setDirty] = useState(false);
  const announce = useJournalNotice();
  const [state, action, pending] = useActionState<JournalCorrectionState, FormData>(async (previous, data) => {
    try {
      const result = await correctLearningMoment(previous, data);
      if (result.success) { setDirty(false); announce(result.success, result.removed); }
      return { ...result, updatedAt: result.updatedAt ?? previous.updatedAt };
    } catch {
      return { ...journalCorrectionFailure(), updatedAt: previous.updatedAt };
    }
  }, { ...emptyJournalCorrection, updatedAt: moment.updated_at });
  return <details className="research-provenance mt-3">
    <summary className="button-ghost w-fit">Edit or remove note</summary>
    <form action={action} onReset={event => event.preventDefault()} onChange={() => setDirty(true)} aria-busy={pending} className="mt-5 max-w-2xl space-y-5">
      <input type="hidden" name="momentId" value={moment.id} />
      <input type="hidden" name="childId" value={childId} />
      <input type="hidden" name="updatedAt" value={state.updatedAt ?? ""} />
      <fieldset disabled={pending || state.removed} className="min-w-0 space-y-5">
        <legend className="sr-only">Correct this everyday note</legend>
        <label className="block"><span className="mb-2 block font-semibold">Your words</span><textarea className="mira-input min-h-36 resize-y" name="note" value={note} onChange={event => setNote(event.target.value)} readOnly={state.refreshRequired} rows={5} maxLength={1200} required dir="auto" /></label>
        <label className="block"><span className="mb-2 block font-semibold">Title (optional)</span><input className="mira-input" name="title" value={title} onChange={event => setTitle(event.target.value)} readOnly={state.refreshRequired} maxLength={100} dir="auto" /></label>
        <div className="grid gap-5 sm:grid-cols-2">
          <label><span className="mb-2 block font-semibold">When it happened</span><input className="mira-input" type="date" name="occurredOn" value={date} onChange={event => setDate(event.target.value)} disabled={state.refreshRequired} max={moment.occurred_on > today ? moment.occurred_on : today} required /></label>
          <label><span className="mb-2 block font-semibold">Area</span><select className="mira-input" name="domain" value={domain} onChange={event => setDomain(event.target.value)} disabled={state.refreshRequired}>{observationDomains.map(value => <option key={value} value={value}>{value === "everyday" ? "Everyday discovery" : value === "maths" ? "Early maths" : value === "life_skills" ? "Life skills" : value[0].toUpperCase() + value.slice(1)}</option>)}</select></label>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">Saving replaces this note’s current words. MIRA does not keep an edit history here. No AI is used, and your saved plans stay unchanged.</p>
        <button className="button-primary gap-2" type="submit" name="intent" value="save" disabled={state.refreshRequired}>{pending && <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />}{pending ? "Saving change…" : "Save changes"}</button>
        <details className="research-provenance">
          <summary className="text-destructive">Remove this note instead</summary>
          <p className="my-3 text-sm leading-6">Remove “<bdi>{moment.title}</bdi>” from MIRA’s active journal? You cannot undo this here. Unsaved edits will not be kept. This does not promise immediate deletion from backups or any previous AI-provider processing.</p>
          <button className="button-ghost text-destructive" type="submit" name="intent" value="remove" disabled={state.refreshRequired} formNoValidate>Remove saved note</button>
        </details>
      </fieldset>
      {state.error && <p role="alert" className="text-sm leading-6 text-destructive">{state.error}</p>}
      {state.refreshRequired && <div className="flex flex-wrap gap-3">
        <a className="button-primary" href="/insights#observation-journal" target="_blank" rel="noopener noreferrer">Compare saved journal (new tab)</a>
        <button className="button-ghost" type="button" onClick={() => window.location.reload()}>Discard edits and reload</button>
      </div>}
      {state.success && !dirty && <p role="status" className="text-sm font-semibold text-primary">{state.success}</p>}
    </form>
  </details>;
}
