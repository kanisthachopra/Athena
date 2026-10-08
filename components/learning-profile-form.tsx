"use client";

import { saveLearningProfile, type ProfileState } from "@/app/setup/actions";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { ProfileStoryForm } from "@/components/profile-story-form";
import type { ProfileSuggestion } from "@/lib/profile-proposal";
import type { InitialLearningProfile } from "@/lib/learning-profile";

const aspirations = ["Curiosity", "Independence", "Communication", "Creativity", "Confidence", "Kindness"];

function SubmitButton({ editing, blocked }: { editing: boolean; blocked: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className="button-primary button-large w-full sm:w-auto" disabled={pending || blocked} type="submit">
      {pending ? <><LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden="true" size={18} /> {editing ? "Saving changes…" : "Building the week…"}</> : <>{editing ? "Save profile changes" : "Create our first week"}<ArrowRight size={18} /></>}
    </button>
  );
}

export function LearningProfileForm({ childId, childName, initial, configured, initialVersion }: { childId: string; childName: string; initial: InitialLearningProfile; configured: boolean; initialVersion: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const submitted = useRef<FormData | null>(null);
  const [state, action, pending] = useActionState(async (previous: ProfileState, data: FormData): Promise<ProfileState> => {
    submitted.current = data;
    try {
      const result = await saveLearningProfile(previous, data);
      if (!result.error) submitted.current = null;
      return { ...result, version: result.version ?? previous.version };
    } catch {
      return { error: "The save could not be confirmed. Your entries are still here. Compare the saved profile before trying again.", success: null, version: previous.version, refreshRequired: true };
    }
  }, { error: null, success: null, version: initialVersion });
  // React resets uncontrolled controls after a fulfilled action, including one
  // returning a validation error. Restore this tab's submitted values on error.
  useEffect(() => {
    if (!state.error || !submitted.current || !formRef.current) return;
    for (const control of formRef.current.elements) {
      if (!(control instanceof HTMLInputElement || control instanceof HTMLSelectElement) || !control.name) continue;
      if (control instanceof HTMLInputElement && control.type === "checkbox") {
        control.checked = submitted.current.getAll(control.name).includes(control.value);
      } else if (typeof submitted.current.get(control.name) === "string") control.value = String(submitted.current.get(control.name));
    }
  }, [state]);
  const selectedAspirations = new Set(initial.aspirations.map((item) => item.toLowerCase()));
  const customAspirations = initial.aspirations.filter((item) => !aspirations.some((standard) => standard.toLowerCase() === item.toLowerCase()));

  function applySuggestions(suggestions: ProfileSuggestion[]) {
    const form = formRef.current;
    if (!form) return;
    for (const suggestion of suggestions) {
      const input = form.elements.namedItem(suggestion.field);
      if (!(input instanceof HTMLInputElement || input instanceof HTMLSelectElement)) continue;
      if (input instanceof HTMLInputElement && input.type === "checkbox") {
        input.checked = suggestion.value === "true";
      } else if (["customAspiration", "caregiverLanguages", "languageGoals"].includes(suggestion.field)) {
        const values = [...input.value.split(","), ...suggestion.value.split(",")].map((value) => value.trim()).filter(Boolean);
        const remaining = values.filter((value) => {
          if (suggestion.field !== "customAspiration") return true;
          const standard = aspirations.find((item) => item.toLowerCase() === value.toLowerCase());
          if (!standard) return true;
          for (const control of form.elements) {
            if (control instanceof HTMLInputElement && control.name === "aspirations" && control.value === standard) control.checked = true;
          }
          return false;
        });
        input.value = [...new Map(remaining.map((value) => [value.toLowerCase(), value])).values()].join(", ");
      } else input.value = suggestion.value;
    }
    const first = form.elements.namedItem(suggestions[0]?.field ?? "weekdayMinutes");
    if (first instanceof HTMLElement) first.focus();
  }

  return (
    <>
    <fieldset disabled={pending || state.refreshRequired}><ProfileStoryForm onApply={applySuggestions} /></fieldset>
    <form ref={formRef} action={action} onReset={event => event.preventDefault()} aria-busy={pending} className="space-y-7">
      <input type="hidden" name="childId" value={childId} />
      <input type="hidden" name="profileVersion" value={state.version ?? ""} />
      <fieldset disabled={pending} className="space-y-7">
      <section className="profile-section">
        <p className="eyebrow">1 · Your rhythm</p>
        <h2 className="mt-3 font-serif text-2xl font-semibold">How should learning fit into the week?</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <label className="block"><span className="mb-2 block text-sm font-semibold">Weekday minutes</span><input className="mira-input" type="number" name="weekdayMinutes" min="0" max="180" defaultValue={initial?.weekday_minutes ?? 15} readOnly={state.refreshRequired} required /></label>
          <label className="block"><span className="mb-2 block text-sm font-semibold">Weekend minutes</span><input className="mira-input" type="number" name="weekendMinutes" min="0" max="240" defaultValue={initial?.weekend_minutes ?? 30} readOnly={state.refreshRequired} required /></label>
        </div>
        <label className="mt-5 flex gap-3 rounded-2xl bg-[#f1eaf3] p-4"><input type="checkbox" name="preferEmbedded" defaultChecked={initial?.prefer_embedded_learning ?? true} disabled={state.refreshRequired} className="mt-1 size-4 accent-[#63486b]" /><span><strong className="block text-sm">Prefer learning inside everyday life</strong><span className="mt-1 block text-sm text-ink/55">Meals, bath time, errands, walks, and helping at home.</span></span></label>
      </section>

      <section className="profile-section">
        <p className="eyebrow">2 · Your approach</p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <label><span className="mb-2 block text-sm font-semibold">Screen preference</span><select className="mira-input" name="screenPolicy" defaultValue={initial?.screen_policy ?? "minimal_child_screen"} disabled={state.refreshRequired}><option value="minimal_child_screen">Minimal child screen time</option><option value="selective">Selective, purposeful use</option><option value="no_preference">No strong preference</option></select></label>
          <label><span className="mb-2 block text-sm font-semibold">Structure</span><select className="mira-input" name="structureLevel" defaultValue={initial?.structure_level ?? "balanced"} disabled={state.refreshRequired}><option value="light">Light and spontaneous</option><option value="balanced">A balanced rhythm</option><option value="structured">More predictable structure</option></select></label>
        </div>
      </section>

      <section className="profile-section">
        <p className="eyebrow">3 · Your hopes for {childName}</p>
        <h2 className="mt-3 font-serif text-2xl font-semibold">What matters most right now?</h2>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {aspirations.map((item) => <label key={item} className="flex cursor-pointer items-center gap-3 rounded-xl border border-black/10 bg-white p-3 text-sm font-medium has-[:checked]:border-[#b89bc1] has-[:checked]:bg-[#f1eaf3]"><input type="checkbox" name="aspirations" value={item} defaultChecked={selectedAspirations.has(item.toLowerCase())} disabled={state.refreshRequired} className="size-4 accent-[#63486b]" />{item}</label>)}
        </div>
        <label className="mt-4 block"><span className="mb-2 block text-sm font-semibold">Other hopes (optional)</span><input className="mira-input" name="customAspiration" defaultValue={customAspirations.join(", ")} readOnly={state.refreshRequired} placeholder="Separate hopes with commas" /></label>
      </section>

      <section className="profile-section">
        <p className="eyebrow">4 · People and languages</p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <label><span className="mb-2 block text-sm font-semibold">Primary caregiver</span><input className="mira-input" name="caregiverName" defaultValue={initial.caregiverName} readOnly={state.refreshRequired} placeholder="Your name or nickname" maxLength={60} /></label>
          <label><span className="mb-2 block text-sm font-semibold">Relationship</span><input className="mira-input" name="relationship" defaultValue={initial.relationship} readOnly={state.refreshRequired} placeholder="Mum, dad, grandparent…" maxLength={60} /></label>
          <label><span className="mb-2 block text-sm font-semibold">Languages you can use</span><input className="mira-input" name="caregiverLanguages" defaultValue={initial.caregiverLanguages.join(", ")} readOnly={state.refreshRequired} placeholder="English, Hindi" /><span className="mt-2 block text-xs text-ink/45">Separate languages with commas.</span></label>
          <label><span className="mb-2 block text-sm font-semibold">Languages you want {childName} to grow with</span><input className="mira-input" name="languageGoals" defaultValue={initial.languageGoals.join(", ")} readOnly={state.refreshRequired} placeholder="Hindi, Mandarin" /><span className="mt-2 block text-xs text-ink/45">These can include future goals.</span></label>
        </div>
      </section>

      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center"><p className="max-w-md text-xs leading-5 text-ink/45">{configured ? "Changes guide future plans. MIRA keeps the current week stable so completed and upcoming activities do not shift unexpectedly." : "MIRA uses these choices as planning constraints. You can change them later."}</p><SubmitButton editing={configured} blocked={Boolean(state.refreshRequired)} /></div>
      </fieldset>
      {state.error && <p role="alert" className="text-sm leading-6 text-destructive">{state.error}</p>}
      {state.success && <p role="status" className="text-sm font-semibold text-primary">{state.success}</p>}
      {state.refreshRequired && <div className="flex flex-wrap gap-3">
        {state.profileSaved && <a className="button-primary" href="/week">Check the saved week</a>}
        <a className="button-ghost" href="/setup" target="_blank" rel="noopener noreferrer">Compare saved profile (new tab)</a>
        <button className="button-ghost" type="button" onClick={() => window.location.reload()}>Discard edits and reload</button>
      </div>}
    </form>
    </>
  );
}
