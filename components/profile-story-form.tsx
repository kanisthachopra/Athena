"use client";

import { useActionState, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { proposeProfile, type ProfileProposalState } from "@/app/setup/propose-actions";
import { profileFields, profileSuggestionLabel, type ProfileSuggestion } from "@/lib/profile-proposal";

const initialState: ProfileProposalState & { sourceNote: string } = { error: null, suggestions: null, sourceNote: "" };

export function ProfileStoryForm({ onApply }: { onApply: (suggestions: ProfileSuggestion[]) => void }) {
  const [state, action, pending] = useActionState(async (previous: typeof initialState, data: FormData) => {
    const result = await proposeProfile(previous, data);
    return { ...result, sourceNote: String(data.get("familyNote") ?? "") };
  }, initialState);
  const [note, setNote] = useState("");
  const [revision, setRevision] = useState(0);
  return (
    <section className="mb-8 rounded-2xl bg-[#e2efe9] p-6 sm:p-8" aria-labelledby="family-story-heading">
      <h2 id="family-story-heading" className="font-serif text-2xl">Start in your own words.</h2>
      <p className="mt-3 max-w-[65ch] text-sm leading-6 text-[#386357]">Tell MIRA about your time, hopes, languages, and preferred rhythm. Review its suggestions, or go straight to the form below.</p>
      <form action={action} onSubmit={() => setRevision((value) => value + 1)} className="mt-5">
        <label htmlFor="family-note" className="mb-2 block text-sm font-semibold">What would a good week feel like?</label>
        <textarea id="family-note" name="familyNote" className="mira-input min-h-32 resize-y" required minLength={15} maxLength={1800}
          value={note} onChange={(event) => { setNote(event.target.value); setRevision((value) => value + 1); }} disabled={pending}
          placeholder="For example: We have 10 minutes on weekdays. I speak English and Hindi, and would love our child to grow with both. We prefer spontaneous play and everyday routines."
          aria-describedby="family-note-privacy" />
        <p id="family-note-privacy" className="mt-2 text-xs leading-5 text-[#386357]">Only this note is sent to Nebius to suggest settings. Leave out names and private health details. MIRA does not store the note.</p>
        <button type="submit" className="button-primary mt-4" disabled={pending || note.trim().length < 15}>
          {pending ? <><LoaderCircle size={17} className="animate-spin" /> Reading your note…</> : "Suggest profile settings"}
        </button>
      </form>
      {!pending && note === state.sourceNote && state.error && <p role="alert" className="mt-4 text-sm leading-6 text-red-800">{state.error}</p>}
      {!pending && note === state.sourceNote && state.suggestions && <ProfileReview key={revision} suggestions={state.suggestions} onApply={onApply} />}
    </section>
  );
}

function ProfileReview({ suggestions, onApply }: { suggestions: ProfileSuggestion[]; onApply: (suggestions: ProfileSuggestion[]) => void }) {
  const [selected, setSelected] = useState(() => new Set(suggestions.map((item) => item.field)));
  const [applied, setApplied] = useState(false);
  if (!suggestions.length) return <p role="status" className="mt-5 text-sm leading-6">I couldn’t find clear settings for time, rhythm, hopes, or languages. Add a little detail, or use the form below. Other family needs are not captured by this helper yet.</p>;
  return (
    <div className="mt-6 border-t border-[#386357]/20 pt-6" aria-live="polite">
      <h3 className="font-serif text-xl">Here’s what I heard</h3>
      <p className="mt-2 text-sm leading-6 text-[#386357]">Choose what to copy into the form. You can edit everything before saving. Listed hopes and languages are added to your existing choices.</p>
      <ul className="mt-4 divide-y divide-[#386357]/15">
        {suggestions.map((item) => (
          <li key={item.field} className="py-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" className="mt-1 size-4 shrink-0 accent-[#386357]" checked={selected.has(item.field)} disabled={applied}
                onChange={(event) => setSelected((previous) => { const next = new Set(previous); if (event.target.checked) next.add(item.field); else next.delete(item.field); return next; })} />
              <span className="min-w-0"><span className="block text-xs font-semibold text-[#386357]">{profileFields[item.field]}</span>
                <span className="mt-1 block break-words text-sm font-semibold">{profileSuggestionLabel(item)}</span>
                <span className="mt-1 block break-words text-sm leading-6 text-[#386357]">From your note: “{item.evidence}”</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <button type="button" className="button-primary mt-3" disabled={applied || !selected.size}
        onClick={() => { onApply(suggestions.filter((item) => selected.has(item.field))); setApplied(true); }}>
        {applied ? "Copied to the form" : "Use selected suggestions"}
      </button>
      {applied && <p role="status" className="mt-3 text-sm leading-6 text-[#386357]">Ready to review below. Nothing is saved until you submit the profile.</p>}
    </div>
  );
}
