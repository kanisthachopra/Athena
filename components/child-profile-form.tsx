"use client";

import { updateChildProfile, type ChildProfileState } from "@/app/family/actions";
import { birthMonths } from "@/lib/child-profile";
import { Check, Loader2 } from "lucide-react";
import { useActionState, useState } from "react";

export function ChildProfileForm({ child, today }: {
  child: { id: string; nickname: string; birth_month: number; birth_year: number; updated_at: string };
  today: string;
}) {
  const [nickname, setNickname] = useState(child.nickname);
  const [month, setMonth] = useState(String(child.birth_month));
  const [year, setYear] = useState(String(child.birth_year));
  const [dirty, setDirty] = useState(false);
  const [state, formAction, pending] = useActionState<ChildProfileState, FormData>(async (previous, data) => {
    try {
      const result = await updateChildProfile(previous, data);
      if (result.success) setDirty(false);
      return { ...result, updatedAt: result.updatedAt ?? previous.updatedAt };
    } catch {
      return { ...previous, success: null, error: "The save could not be confirmed. Your edits are still here. Open the saved profile to check it before trying again.", refreshRequired: true };
    }
  }, { error: null, success: null, updatedAt: child.updated_at, refreshRequired: false });
  const currentYear = Number(today.slice(0, 4));
  const currentMonth = Number(today.slice(5, 7));
  const years = [...new Set([child.birth_year, ...Array.from({ length: 19 }, (_, index) => currentYear - index)])].sort((a, b) => b - a);

  return <form action={formAction} className="mt-7 space-y-5" aria-busy={pending} onChange={() => setDirty(true)} onReset={event => event.preventDefault()}>
    <input type="hidden" name="childId" value={child.id} />
    <input type="hidden" name="updatedAt" value={state.updatedAt ?? ""} />
    <fieldset disabled={pending || state.refreshRequired} className="min-w-0 space-y-5">
      <legend className="sr-only">Child profile details</legend>
      <label className="block"><span className="mb-2 block text-sm font-semibold">First name or nickname</span><input className="mira-input" name="nickname" value={nickname} onChange={event => setNickname(event.target.value)} maxLength={60} required dir="auto" autoComplete="off" /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label><span className="mb-2 block text-sm font-semibold">Birth month</span><select className="mira-input" name="birthMonth" value={month} onChange={event => setMonth(event.target.value)} aria-describedby="profile-age-help">{birthMonths.map((label, index) => <option key={label} value={index + 1} disabled={Number(year) === currentYear && index + 1 > currentMonth}>{label}</option>)}</select></label>
        <label><span className="mb-2 block text-sm font-semibold">Birth year</span><select className="mira-input" name="birthYear" value={year} onChange={event => setYear(event.target.value)} aria-describedby="profile-age-help">{years.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
      </div>
      <p id="profile-age-help" className="max-w-prose text-sm leading-6 text-ink/70">Month and year are enough. MIRA uses them as an age range, not an exact birthday. Saved plans keep their original dates and content.</p>
      <button className="button-primary gap-2" type="submit">{pending && <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />}{pending ? "Saving…" : "Save profile"}</button>
    </fieldset>
    {state.error && <p className="max-w-prose text-sm leading-6 text-red-700" role="alert">{state.error}</p>}
    {state.refreshRequired && <div className="flex flex-wrap items-center gap-3">
      <a className="button-primary" href={`/family/child/${child.id}`} target="_blank" rel="noopener noreferrer">Compare saved profile (new tab)</a>
      <button type="button" className="button-ghost" onClick={() => window.location.reload()}>Discard these edits and reload</button>
    </div>}
    {state.success && !dirty && <p className="flex items-center gap-1.5 text-sm font-semibold text-primary" role="status"><Check size={15} aria-hidden="true" />{state.success}</p>}
  </form>;
}
