"use client";
import { useActionState, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { AI_POLICY_VERSION, isAiAllowed, type AiFeature, type AiPreferences } from "@/lib/ai-preferences";
import { saveAiSettings, type AiSettingsState } from "@/app/settings/actions";
const features: { id: AiFeature; label: string; detail: string }[] = [
  { id: "guide", label: "Guide answers", detail: "The existing Guide uses your question, approximate age range and reviewed library sources. Athena’s new resource desk also follows this switch, with separate confirmation before search, voice transcription or explaining a public source. Family history is not added." },
  { id: "profile", label: "Profile suggestions", detail: "Sends only the family note you submit. You review any proposed preferences before saving them." },
  { id: "journal", label: "Journal title and area suggestions", detail: "Sends the observation you choose to submit. Your original words stay unchanged; suggestions are optional." },
];
export function AiPreferencesForm({ familyId, initial, canEdit }: { familyId: string; initial: AiPreferences; canEdit: boolean }) {
  const [choices, setChoices] = useState(() => ({ guide: isAiAllowed(initial, "guide"), profile: isAiAllowed(initial, "profile"), journal: isAiAllowed(initial, "journal") }));
  const [acknowledged, setAcknowledged] = useState(false);
  const [edited, setEdited] = useState(false);
  const [state, action, pending] = useActionState(async (previous: AiSettingsState, data: FormData) => {
    setEdited(false);
    try { const result = await saveAiSettings(previous, data); return { ...result, saved: result.saved ?? previous.saved }; }
    catch { return { error: "The change could not be confirmed. Reload to check your saved choices before retrying.", success: null, saved: previous.saved }; }
  }, { error: null, success: null, saved: initial } as AiSettingsState);
  const saved = state.saved ?? initial;
  const anyEnabled = choices.guide || choices.profile || choices.journal;
  const savedEnabled = features.filter(feature => isAiAllowed(saved, feature.id));
  return <form action={action} className="mt-5 grid max-w-2xl gap-5" aria-busy={pending}>
    <input type="hidden" name="familyId" value={familyId} />
    <input type="hidden" name="revision" value={saved.revision} />
    <input type="hidden" name="policyVersion" value={AI_POLICY_VERSION} />
    <p className="text-sm font-semibold">Saved setting: {savedEnabled.length ? savedEnabled.map(feature => feature.label).join(", ") : "AI off"}</p>
    <p className="leading-7">Saved plans, activity instructions, profile forms and direct journal entries do not need AI. These choices apply to everyone in your family.</p>
    <fieldset disabled={!canEdit || pending} className="grid min-w-0 gap-5">
      <legend className="sr-only">Optional AI features</legend>
      {features.map(feature => <label key={feature.id} className="flex min-h-11 items-start gap-3">
        <input className="mt-1 h-5 w-5 shrink-0 accent-primary" type="checkbox" name={feature.id} checked={choices[feature.id]}
          onChange={event => { setChoices(current => ({ ...current, [feature.id]: event.target.checked })); setEdited(true); setAcknowledged(false); }} />
        <span className="min-w-0"><span className="block font-semibold">{feature.label}</span><span className="mt-1 block text-sm leading-6 text-muted-foreground">{feature.detail}</span></span>
      </label>)}
      <details className="preparation-details">
        <summary className="min-h-11 cursor-pointer py-3">Where the information goes</summary>
        <div className="grid gap-3 py-3 text-sm leading-7 text-muted-foreground">
          <p>These features send requests to Nebius Token Factory. Anything you type, including names or sensitive details, is part of that request. Leave out details you do not need to share. Athena’s resource desk separately asks before sending searches or public links to Tavily, recordings to Deepgram, or source text and questions to Nebius. Its web discoveries are not reviewed library content. Turning Guide off also blocks those live resource-desk requests.</p>
          <p>MIRA records usage metadata, not full prompts or answers in its AI usage log. Provider retention settings and deletion arrangements have not yet been verified for the pilot. Turning AI off does not erase information already sent.</p>
          <p>The server checks these choices before each new provider request, including retries. A request already sent may finish after you switch a feature off.</p>
        </div>
      </details>
      {anyEnabled && <label className="flex min-h-11 items-start gap-3 text-sm leading-6">
        <input className="mt-1 h-5 w-5 shrink-0 accent-primary" type="checkbox" name="acknowledge" checked={acknowledged} onChange={event => { setAcknowledged(event.target.checked); setEdited(true); }} />
        <span>I understand the selected information goes to Nebius, that provider retention is not yet verified, and that turning AI off cannot recall requests already sent.</span>
      </label>}
      {canEdit && <div><button className="button-primary" type="submit" disabled={pending || (anyEnabled && !acknowledged)}>{pending ? <><LoaderCircle aria-hidden="true" size={17} className="animate-spin" /> Saving…</> : "Save AI choices"}</button></div>}
    </fieldset>
    {!canEdit && <p className="text-sm leading-6 text-muted-foreground">Only your family owner can change these choices.</p>}
    {!edited && state.error && <p role="alert" className="text-sm leading-7 text-destructive">{state.error}</p>}
    {!edited && state.success && <p role="status" className="text-sm leading-7">{state.success}</p>}
  </form>;
}
