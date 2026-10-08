"use client";
import { useActionState, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { saveFamilyTimeZone, type CalendarSaveState } from "@/app/settings/calendar-actions";
import type { FamilyCalendar } from "@/lib/family-calendar";
export function FamilyCalendarForm({ familyId, initial, canEdit, zones }: { familyId: string; initial: FamilyCalendar; canEdit: boolean; zones: string[] }) {
  const [zone, setZone] = useState(initial.timeZone ?? "");
  const [edited, setEdited] = useState(false);
  const [state, action, pending] = useActionState(async (previous: CalendarSaveState, data: FormData) => {
    setEdited(false);
    try { const result = await saveFamilyTimeZone(previous, data); return { ...result, saved: result.saved ?? previous.saved }; }
    catch { return { error: "The connection was interrupted. Reload Settings to check whether the time zone saved.", success: null, saved: previous.saved, refreshRequired: true }; }
  }, { error: null, success: null, saved: initial, refreshRequired: false } as CalendarSaveState);
  const saved = state.saved ?? initial;
  return <form action={action} className="mt-5 grid max-w-xl gap-4" aria-busy={pending}>
    <p className="text-sm font-semibold">Saved setting: {saved.timeZone?.replaceAll("_", " ") ?? "Not chosen — using UTC"}</p>
    <p className="text-sm leading-6 text-muted-foreground" id="family-calendar-help">Everyone in your family uses this calendar for Today, new weeks and journal dates. Changing it does not move saved activities or notes. For India, choose Asia/Kolkata.</p>
    {canEdit ? <>
      <input type="hidden" name="familyId" value={familyId} /><input type="hidden" name="revision" value={saved.revision} />
      <fieldset disabled={pending || state.refreshRequired} className="grid min-w-0 gap-4">
        <legend className="sr-only">Family calendar</legend>
        <label htmlFor="family-time-zone" className="grid gap-2 font-semibold">Time zone
          <select id="family-time-zone" name="timeZone" className="mira-input w-full min-w-0" value={zone} aria-describedby="family-calendar-help" required onChange={event => { setZone(event.target.value); setEdited(true); }}>
            <option value="" disabled>Choose your family’s time zone</option>
            {zones.map(value => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}
          </select>
        </label>
        <div><button className="button-primary" disabled={pending || !zone || zone === saved.timeZone} type="submit">{pending ? <><LoaderCircle aria-hidden="true" size={17} className="animate-spin" /> Saving…</> : "Save time zone"}</button></div>
      </fieldset>
    </> : <p className="text-sm leading-6 text-muted-foreground">Only your family owner can change this setting.</p>}
    {!edited && state.error && <p role="alert" className="text-sm leading-6 text-destructive">{state.error}</p>}
    {!edited && state.success && <p role="status" className="text-sm leading-6">{state.success}</p>}
    {state.refreshRequired && <a href="/settings#family-calendar" className="button-ghost justify-self-start">Reload saved setting</a>}
  </form>;
}
