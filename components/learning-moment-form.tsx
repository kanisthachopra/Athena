"use client";

import { proposeLearningMoment, saveLearningMoment, type LearningMomentState, type ObservationProposalState } from "@/app/insights/actions";
import { Check, LoaderCircle } from "lucide-react";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";

const initialSave: LearningMomentState = { error: null, success: null };
const initialSuggestion: ObservationProposalState = { error: null, notice: null, source: null, proposal: null };
const domainOptions = [["everyday", "Everyday discovery"], ["language", "Language"], ["movement", "Movement"], ["sensory", "Sensory"], ["maths", "Early maths"], ["creative", "Creative"], ["life_skills", "Life skills"], ["nature", "Nature"]];
type MomentDraft = { note: string; title: string; domain: string; occurredOn: string };

export function LearningMomentForm({ childId, childName, today, initialRequestId }: { childId: string; childName: string; today: string; initialRequestId: string }) {
  const [entry, setEntry] = useState<{ requestId: string; draft?: MomentDraft }>({ requestId: initialRequestId });
  return <MomentEntry key={childId + ":" + entry.requestId} childId={childId} childName={childName} today={today} requestId={entry.requestId} draft={entry.draft} onNew={draft => setEntry({ requestId: crypto.randomUUID(), draft })} />;
}

function MomentEntry({ childId, childName, today, requestId, draft, onNew }: { childId: string; childName: string; today: string; requestId: string; draft?: MomentDraft; onNew: (draft?: MomentDraft) => void }) {
  const [note, setNote] = useState(draft?.note ?? "");
  const [title, setTitle] = useState(draft?.title ?? "");
  const [domain, setDomain] = useState(draft?.domain ?? "everyday");
  const [occurredOn, setOccurredOn] = useState(draft?.occurredOn ?? today);
  const [allowAi, setAllowAi] = useState(false);
  const [suggestion, setSuggestion] = useState(initialSuggestion);
  const [proposing, startProposal] = useTransition();
  const revision = useRef(0);
  const alive = useRef(true);
  const retryPayload = useRef<FormData | null>(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const [saveState, saveAction, saving] = useActionState(async (previous: LearningMomentState, data: FormData) => {
    const payload = retryPayload.current ?? data;
    try {
      const result = await saveLearningMoment(previous, payload);
      retryPayload.current = result.retry === "same" ? payload : null;
      return result;
    } catch {
      retryPayload.current = payload;
      return { error: "MIRA could not confirm the save. Your draft is still here. Retry this same observation to check or finish its save without creating a second copy.", success: null, retry: "same" as const };
    }
  }, initialSave);
  const dirty = Boolean(note || title);
  useEffect(() => {
    if (!dirty || saveState.success) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, saveState.success]);

  function requestSuggestion() {
    if (!allowAi || proposing || saving || saveState.retry) return;
    const requestRevision = ++revision.current;
    const data = new FormData();
    data.set("rawNote", note); data.set("occurredOn", occurredOn); data.set("childId", childId); data.set("allowAi", "on");
    startProposal(async () => {
      let result: ObservationProposalState;
      try { result = await proposeLearningMoment(initialSuggestion, data); }
      catch { result = { ...initialSuggestion, error: "Suggestions could not be loaded. You can still save your own words." }; }
      if (alive.current && requestRevision === revision.current) setSuggestion(result);
    });
  }

  if (saveState.success) return <div className="mt-6">
    <p role="status" className="flex items-center gap-2 font-semibold"><Check aria-hidden="true" size={18} />{saveState.success}</p>
    <p className="mt-3 text-sm leading-6 text-muted-foreground">Your words are in {childName}’s journal. They are an observation, not an assessment.</p>
    <button className="button-ghost mt-3" type="button" onClick={() => onNew()}>Notice another moment</button>
  </div>;

  return <form action={saveAction} className="mt-6 grid gap-5" aria-busy={saving}>
    <input name="childId" type="hidden" value={childId} />
    <input name="requestId" type="hidden" value={requestId} />
    <fieldset disabled={saving || Boolean(saveState.retry)} className="grid min-w-0 gap-5">
      <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <label><span className="mb-2 block text-sm font-semibold">What happened?</span>
          <textarea className="mira-input min-h-32 resize-y" name="note" dir="auto" maxLength={1200} value={note}
            onChange={event => { setNote(event.target.value); revision.current++; setSuggestion(initialSuggestion); }}
            placeholder="Describe what you saw or heard. It can be just a sentence." aria-describedby="moment-note-help" required />
          <span id="moment-note-help" className="mt-2 block text-sm leading-6 text-muted-foreground">Save your own words directly. No AI is needed. This draft stays on this page until you save it.</span>
        </label>
        <label><span className="mb-2 block text-sm font-semibold">When</span>
          <input className="mira-input" name="occurredOn" type="date" value={occurredOn} max={today} required
            onChange={event => { setOccurredOn(event.target.value); revision.current++; setSuggestion(initialSuggestion); }} />
        </label>
      </div>
      <details className="preparation-details">
        <summary className="min-h-11 cursor-pointer py-3">Title and area (optional)</summary>
        <div className="grid gap-5 py-4 sm:grid-cols-[minmax(0,1fr)_13rem]">
          <label><span className="mb-2 block text-sm font-semibold">Journal title</span>
            <input className="mira-input" name="title" dir="auto" maxLength={100} value={title} onChange={event => setTitle(event.target.value)} placeholder="Or use the first line of your note" />
          </label>
          <label><span className="mb-2 block text-sm font-semibold">Learning area</span>
            <select className="mira-input" name="domain" value={domain} onChange={event => setDomain(event.target.value)}>
              {domainOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select>
          </label>
        </div>
      </details>
      <details className="preparation-details">
        <summary className="min-h-11 cursor-pointer py-3">Optional AI help with the title and area</summary>
        <div className="grid gap-4 py-4">
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground">This sends everything you typed above to Nebius, including any names or personal details in the note. MIRA does not attach the child’s profile. Provider retention settings have not been verified for the pilot; leave out sensitive details. Your original observation will not be rewritten.</p>
          <label className="flex min-h-11 items-start gap-3 text-sm leading-6">
            <input className="mt-1 h-5 w-5 shrink-0 accent-primary" type="checkbox" checked={allowAi} onChange={event => { setAllowAi(event.target.checked); revision.current++; setSuggestion(initialSuggestion); }} />
            <span>Send this note to Nebius when I request a suggestion.</span>
          </label>
          <div><button className="button-ghost" type="button" disabled={!allowAi || note.trim().length < 8 || proposing} onClick={requestSuggestion}>
            {proposing ? <><LoaderCircle aria-hidden="true" className="animate-spin" size={17} /> Getting a suggestion…</> : "Suggest title and area"}
          </button></div>
          {suggestion.error && <p role="alert" className="text-sm leading-6 text-destructive">{suggestion.error}</p>}
          {suggestion.proposal && <div className="spatial-notice">
            <div><p className="font-semibold">{suggestion.proposal.title}</p>
              <p className="mt-1 text-sm">{domainOptions.find(([value]) => value === suggestion.proposal?.domain)?.[1]}</p>
              <p role="status" className="mt-2 text-sm leading-6">{suggestion.notice}</p>
              <div className="spatial-actions">
                <button type="button" className="button-ghost" onClick={() => { if (suggestion.proposal) { setTitle(suggestion.proposal.title); setDomain(suggestion.proposal.domain); setSuggestion({ ...initialSuggestion, notice: "Suggestion added to the form. Your observation is unchanged; save when ready." }); } }}>Use this title and area</button>
                <button type="button" className="button-ghost" onClick={() => setSuggestion(initialSuggestion)}>Dismiss</button>
              </div>
            </div>
          </div>}
          {!suggestion.proposal && suggestion.notice && <p role="status" className="text-sm leading-6">{suggestion.notice}</p>}
        </div>
      </details>
    </fieldset>
    {saveState.error && <p role="alert" className="text-sm leading-7 text-destructive">{saveState.error}</p>}
    {saveState.retry === "same" && <p className="text-sm leading-6 text-muted-foreground">The submitted details are held unchanged until the result is confirmed. No AI is used to retry a save.</p>}
    <div className="flex flex-wrap gap-3">
      {saveState.retry === "review" ? <button className="button-ghost" type="button" onClick={() => onNew({ note, title, domain, occurredOn })}>Start a new draft with these words</button>
        : <button className="button-primary" type="submit" disabled={saving || proposing}>
          {saving ? <><LoaderCircle aria-hidden="true" className="animate-spin" size={17} /> Saving…</> : saveState.retry === "same" ? "Retry this observation" : "Save my observation"}
        </button>}
      {saveState.retry && <a className="button-ghost" href="#observation-journal">View the journal</a>}
    </div>
  </form>;
}
