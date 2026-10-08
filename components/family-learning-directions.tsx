"use client";
import { useActionState, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { saveLearningDirection, type DirectionState } from "@/app/family/directions/actions";
import { capabilityOptions, trackOptions, directionHorizons, directionLabels, type DirectionsSnapshot, type DirectionHope, type LearningDirection } from "@/lib/learning-directions";

function DirectionEditor({ snapshot, hope, onSaved, onCancel }: { snapshot: DirectionsSnapshot; hope: DirectionHope; onSaved: (next: DirectionsSnapshot, message: string) => void; onCancel: () => void }) {
  const [horizon, setHorizon] = useState<string>(hope.direction?.horizon ?? "");
  const [capabilities, setCapabilities] = useState(hope.direction?.capabilities ?? []);
  const [tracks, setTracks] = useState(hope.direction?.tracks ?? []);
  const [state, action, pending] = useActionState(async (previous: DirectionState, form: FormData): Promise<DirectionState> => {
    let result: DirectionState;
    try { result = await saveLearningDirection(previous, form); }
    catch { result = { status: "error", message: "We could not confirm the save. Your choices are still here; check the saved direction before trying again." }; }
    if (result.status === "saved" && result.snapshot) onSaved(result.snapshot, result.message ?? "Direction saved.");
    return result;
  }, { status: "idle" });
  const blocked = state.status === "stale" || state.status === "error";
  const toggle = (values: string[], code: string, checked: boolean) => checked ? [...values, code] : values.filter(item => item !== code);
  const choices = (title: string, options: readonly (readonly [string, string])[], values: string[], update: (values: string[]) => void) => <details className="border-t border-border py-4" open={values.length > 0 || undefined}>
    <summary className="cursor-pointer rounded-md py-2 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">{title}<span className="ml-2 text-sm font-normal text-muted-foreground">{values.length ? `${values.length} chosen` : "Optional"}</span></summary>
    <div className="mt-3 grid gap-x-6 sm:grid-cols-2">{options.map(([code, label]) => <label key={code} className="flex min-h-11 cursor-pointer items-start gap-3 py-3 text-sm leading-6"><input type="checkbox" className="mt-1 size-4 shrink-0 accent-primary" checked={values.includes(code)} onChange={event => update(toggle(values, code, event.target.checked))} /><span>{label}</span></label>)}</div>
  </details>;
  return <form action={action} onReset={event => event.preventDefault()} aria-busy={pending} className="mt-5 space-y-5">
    <input type="hidden" name="childId" value={snapshot.childId} /><input type="hidden" name="hopeId" value={hope.id} /><input type="hidden" name="version" value={snapshot.version} />
    <input type="hidden" name="direction" value={JSON.stringify({ horizon, capabilities, tracks })} />
    <fieldset disabled={pending || blocked} className="space-y-4">
      <legend className="sr-only">Planning direction for {hope.title}</legend>
      <label className="block max-w-sm"><span className="mb-2 block font-semibold">When does this matter?</span><select className="mira-input" value={horizon} onChange={event => setHorizon(event.target.value)} required><option value="">Choose a time</option>{Object.entries(directionHorizons).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <p className="max-w-prose text-sm leading-6 text-muted-foreground">For now influences new weeks. For later and paused stay in your profile without adding activities. These are opportunities to offer, not abilities to measure.</p>
      <div>{choices("Ways to grow", capabilityOptions, capabilities, setCapabilities)}{choices("Things to explore", trackOptions, tracks, setTracks)}</div>
      <p className="max-w-prose text-sm leading-6 text-muted-foreground">Choose what this hope means to your family. MIRA matches these choices only to associations in reviewed activities. Age, safety and available time still come first; variety stays part of the week.</p>
      <div className="flex flex-wrap gap-3"><button type="submit" name="operation" value="save" className="button-primary">{pending ? "Saving…" : "Save direction"}</button>{hope.direction && <button type="submit" name="operation" value="clear" formNoValidate className="button-ghost">Remove planning link</button>}<button type="button" className="button-ghost" onClick={onCancel}>Discard draft</button></div>
    </fieldset>
    {state.message && <p role="alert" className="text-sm leading-6">{state.message}</p>}
    {blocked && <div className="space-y-3"><p className="text-sm leading-6">Your draft: {horizon ? directionHorizons[horizon as LearningDirection["horizon"]] : "No time chosen"}; {[...capabilityOptions, ...trackOptions].filter(([code]) => [...capabilities, ...tracks].includes(code)).map(([, label]) => label).join(", ") || "no opportunities chosen"}.</p><div className="flex flex-wrap gap-3"><a className="button-ghost" href="/family#family-directions" target="_blank" rel="noopener noreferrer">Compare saved choices (new tab)</a><button className="button-ghost" type="button" onClick={() => window.location.reload()}>Discard draft and reload</button></div></div>}
  </form>;
}

export function FamilyLearningDirections({ initial, readOnly, unavailable }: { initial: DirectionsSnapshot | null; readOnly: boolean; unavailable: boolean }) {
  const [snapshot, setSnapshot] = useState(initial);
  const [open, setOpen] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const notice = useRef<HTMLParagraphElement>(null);
  return <section id="family-directions" aria-labelledby="family-directions-title" className="profile-section mt-8 scroll-mt-28">
    <h2 id="family-directions-title" className="text-2xl font-semibold">Hopes and directions</h2>
    <p className="mt-3 max-w-prose leading-7 text-muted-foreground">Keep your own words. If you want, choose the opportunities each hope should guide for your child.</p>
    <p ref={notice} role="status" aria-live="polite" tabIndex={-1} className="mt-3 text-sm leading-6">{message}</p>
    {unavailable || !snapshot ? <div className="mt-5 space-y-3"><p role="alert" className="leading-7">Saved directions could not be loaded. They have not been replaced.</p><form action="/family#family-directions" method="get"><button type="submit" className="button-ghost">Reload Family</button></form></div> : !snapshot.hopes.length ? <p className="mt-5 leading-7">No hopes saved yet. {readOnly ? "An owner or caregiver can add them in learning preferences." : <a href="/setup" className="underline underline-offset-4">Add a hope in learning preferences</a>}.</p> : <>
      <div className="mt-4 divide-y divide-border">{snapshot.hopes.map(hope => <div key={hope.id} className="py-4">
        <button type="button" disabled={open !== null} className="flex min-h-11 w-full items-start justify-between gap-4 rounded-md py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" aria-expanded={open === hope.id} aria-controls={`direction-${hope.id}`} onClick={() => { setOpen(hope.id); setMessage(""); }}>
          <span className="min-w-0"><span className="block break-words font-semibold" dir="auto">{hope.title}</span><span className="mt-1 block text-sm leading-6 text-muted-foreground">{hope.direction ? directionHorizons[hope.direction.horizon] : "No planning link"}</span></span><ChevronDown size={18} aria-hidden="true" className={`mt-1 shrink-0 transition-transform motion-reduce:transition-none ${open === hope.id ? "rotate-180" : ""}`} />
        </button>
        <div id={`direction-${hope.id}`} hidden={open !== hope.id}>{open === hope.id && (readOnly ? <><p className="mt-3 text-sm leading-6">{hope.direction ? directionLabels(hope.direction).join(", ") || "No opportunities chosen." : "No opportunities chosen."}</p><p className="mt-3 text-sm text-muted-foreground">Your access is read-only.</p><button type="button" className="button-ghost mt-3" onClick={() => setOpen(null)}>Close details</button></> : <DirectionEditor snapshot={snapshot} hope={hope} onCancel={() => { setOpen(null); setMessage("Draft discarded. Saved choices are unchanged."); requestAnimationFrame(() => notice.current?.focus()); }} onSaved={(next, text) => { setSnapshot(next); setMessage(text); setOpen(null); requestAnimationFrame(() => notice.current?.focus()); }} />)}</div>
      </div>)}</div>
      {!readOnly && <p className="mt-5 text-sm leading-6 text-muted-foreground"><a href="/setup" className="underline underline-offset-4">Edit the hopes themselves</a>. Removing a hope also removes its planning link, not the explanations in saved weeks.</p>}
    </>}
  </section>;
}
