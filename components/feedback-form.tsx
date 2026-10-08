"use client";
import { saveFeedback } from "@/app/activity/actions";
import { LoaderCircle } from "lucide-react";
import { useActionState, useState } from "react";
import { challengeLabels, engagementLabels, type ActivityObservation } from "@/lib/activity-observation";

export function FeedbackForm({ instanceId, templateId, initial = null, returnTo = "/today" }: { instanceId: string; templateId: string | null; initial?: ActivityObservation | null; returnTo?: string }) {
  const [state, action, pending] = useActionState(saveFeedback, { error: null });
  const [engagement, setEngagement] = useState(initial?.engagement ?? "");
  const [challenge, setChallenge] = useState(initial?.challenge_level ?? "");
  const [repeated, setRepeated] = useState(initial?.repeated == null ? "" : initial.repeated ? "yes" : "no");
  const [note, setNote] = useState(initial?.parent_note ?? "");
  return <form action={action} className="space-y-6" aria-busy={pending}>
    <input type="hidden" name="instanceId" value={instanceId} />
    <input type="hidden" name="templateId" value={templateId ?? ""} />
    <input type="hidden" name="revision" value={initial?.revision ?? 0} />
    <input type="hidden" name="returnTo" value={returnTo} />
    <p className="text-sm leading-6 text-muted-foreground">Every answer is optional. A blank answer means you did not record it—not that it did not happen.</p>
    <fieldset disabled={pending} className="grid min-w-0 gap-6">
      <legend className="sr-only">Your observation</legend>
      <label className="block"><span className="mb-2 block font-semibold">What did you notice?</span><textarea className="mira-input min-h-28 resize-y" name="note" maxLength={1000} value={note} onChange={event=>setNote(event.target.value)} placeholder="What happened, in your own words…" /></label>
      <details className="preparation-details" open={initial !== null || undefined}>
        <summary className="min-h-11 cursor-pointer py-3">Add or review a few details</summary>
        <div className="grid gap-5 py-4 sm:grid-cols-2">
          <label><span className="mb-2 block text-sm font-semibold">Interest during this experience</span><select className="mira-input" name="engagement" value={engagement} onChange={event=>setEngagement(event.target.value as typeof engagement)}><option value="">Not recorded</option>{Object.entries(engagementLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
          <label><span className="mb-2 block text-sm font-semibold">How the challenge felt</span><select className="mira-input" name="challenge" value={challenge} onChange={event=>setChallenge(event.target.value as typeof challenge)}><option value="">Not recorded</option>{Object.entries(challengeLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
          <label className="sm:col-span-2"><span className="mb-2 block text-sm font-semibold">Did they choose to repeat any of it?</span><select className="mira-input" name="repeated" value={repeated} onChange={event=>setRepeated(event.target.value)}><option value="">Not recorded</option><option value="yes">Yes, they chose to repeat it</option><option value="no">No, not this time</option></select></label>
        </div>
      </details>
      <button className="button-primary justify-self-start" disabled={pending}>{pending ? <><LoaderCircle aria-hidden="true" className="animate-spin" size={17} /> Saving observation…</> : initial ? "Update observation" : "Save observation"}</button>
    </fieldset>
    {state.error && <p role="alert" className="text-sm leading-7 text-destructive">{state.error}</p>}
  </form>;
}
