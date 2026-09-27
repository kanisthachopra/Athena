"use client";

import { saveLearningProfile } from "@/app/setup/actions";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

const aspirations = ["Curiosity", "Independence", "Communication", "Creativity", "Confidence", "Kindness"];

function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className="button-primary button-large w-full sm:w-auto" disabled={pending} type="submit">
      {pending ? <><LoaderCircle className="animate-spin" size={18} /> Building the week…</> : <>{editing ? "Update our plan" : "Create our first week"}<ArrowRight size={18} /></>}
    </button>
  );
}

type InitialProfile = {
  screen_policy?: string;
  structure_level?: string;
  weekday_minutes?: number;
  weekend_minutes?: number;
  prefer_embedded_learning?: boolean;
} | null;

export function LearningProfileForm({ childName, initial }: { childName: string; initial: InitialProfile }) {
  const [state, action] = useActionState(saveLearningProfile, { error: null });

  return (
    <form action={action} className="space-y-7">
      <section className="profile-section">
        <p className="eyebrow">1 · Your rhythm</p>
        <h2 className="mt-3 font-serif text-2xl font-semibold">How should learning fit into the week?</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <label className="block"><span className="mb-2 block text-sm font-semibold">Weekday minutes</span><input className="mira-input" type="number" name="weekdayMinutes" min="0" max="180" defaultValue={initial?.weekday_minutes ?? 15} required /></label>
          <label className="block"><span className="mb-2 block text-sm font-semibold">Weekend minutes</span><input className="mira-input" type="number" name="weekendMinutes" min="0" max="240" defaultValue={initial?.weekend_minutes ?? 30} required /></label>
        </div>
        <label className="mt-5 flex gap-3 rounded-2xl bg-[#f3eee3] p-4"><input type="checkbox" name="preferEmbedded" defaultChecked={initial?.prefer_embedded_learning ?? true} className="mt-1 size-4 accent-[#52634e]" /><span><strong className="block text-sm">Prefer learning inside everyday life</strong><span className="mt-1 block text-sm text-ink/55">Meals, bath time, errands, walks, and helping at home.</span></span></label>
      </section>

      <section className="profile-section">
        <p className="eyebrow">2 · Your approach</p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <label><span className="mb-2 block text-sm font-semibold">Screen preference</span><select className="mira-input" name="screenPolicy" defaultValue={initial?.screen_policy ?? "minimal_child_screen"}><option value="minimal_child_screen">Minimal child screen time</option><option value="selective">Selective, purposeful use</option><option value="no_preference">No strong preference</option></select></label>
          <label><span className="mb-2 block text-sm font-semibold">Structure</span><select className="mira-input" name="structureLevel" defaultValue={initial?.structure_level ?? "balanced"}><option value="light">Light and spontaneous</option><option value="balanced">A balanced rhythm</option><option value="structured">More predictable structure</option></select></label>
        </div>
      </section>

      <section className="profile-section">
        <p className="eyebrow">3 · Your hopes for {childName}</p>
        <h2 className="mt-3 font-serif text-2xl font-semibold">What matters most right now?</h2>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {aspirations.map((item) => <label key={item} className="flex cursor-pointer items-center gap-3 rounded-xl border border-black/10 bg-white p-3 text-sm font-medium has-[:checked]:border-[#829378] has-[:checked]:bg-[#eef3ea]"><input type="checkbox" name="aspirations" value={item} className="size-4 accent-[#52634e]" />{item}</label>)}
        </div>
        <input className="mira-input mt-4" name="customAspiration" placeholder="Another hope, in your own words (optional)" maxLength={80} />
      </section>

      <section className="profile-section">
        <p className="eyebrow">4 · People and languages</p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <label><span className="mb-2 block text-sm font-semibold">Primary caregiver</span><input className="mira-input" name="caregiverName" placeholder="Your name or nickname" maxLength={60} /></label>
          <label><span className="mb-2 block text-sm font-semibold">Relationship</span><input className="mira-input" name="relationship" placeholder="Mum, dad, grandparent…" maxLength={60} /></label>
          <label><span className="mb-2 block text-sm font-semibold">Languages you can use</span><input className="mira-input" name="caregiverLanguages" placeholder="English, Hindi" /><span className="mt-2 block text-xs text-ink/45">Separate languages with commas.</span></label>
          <label><span className="mb-2 block text-sm font-semibold">Languages you want {childName} to grow with</span><input className="mira-input" name="languageGoals" placeholder="Hindi, Mandarin" /><span className="mt-2 block text-xs text-ink/45">These can include future goals.</span></label>
        </div>
      </section>

      {state.error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center"><p className="max-w-md text-xs leading-5 text-ink/45">MIRA uses these choices as planning constraints. You can change them later.</p><SubmitButton editing={Boolean(initial)} /></div>
    </form>
  );
}
