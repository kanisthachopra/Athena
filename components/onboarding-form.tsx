"use client";

import { createFamilyAndChild } from "@/app/onboarding/actions";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="button-primary button-large mt-3 w-full" disabled={pending} type="submit">
      {pending ? <><LoaderCircle className="animate-spin" size={18} /> Creating your space…</> : <>Meet MIRA <ArrowRight size={18} /></>}
    </button>
  );
}

export function OnboardingForm() {
  const [state, action] = useActionState(createFamilyAndChild, { error: null });
  const year = new Date().getFullYear();

  return (
    <form action={action} className="mt-9 space-y-6">
      <label className="block">
        <span className="mb-2 block text-sm font-semibold">What should we call your family?</span>
        <input className="mira-input" name="familyName" placeholder="The Sharma family" maxLength={80} required />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-semibold">Your child&apos;s first name or nickname</span>
        <input className="mira-input" name="nickname" placeholder="Maya" maxLength={60} required />
        <span className="mt-2 block text-xs leading-5 text-ink/50">A nickname is perfect—we don&apos;t need their legal name.</span>
      </label>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">When were they born?</legend>
        <div className="grid grid-cols-2 gap-3">
          <select className="mira-input" name="birthMonth" defaultValue="" required>
            <option value="" disabled>Month</option>
            {months.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}
          </select>
          <select className="mira-input" name="birthYear" defaultValue="" required>
            <option value="" disabled>Year</option>
            {Array.from({ length: 19 }, (_, index) => year - index).map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </div>
        <span className="mt-2 block text-xs leading-5 text-ink/50">Month and year are enough to make activities age-appropriate.</span>
      </fieldset>
      {state.error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>}
      <SubmitButton />
      <p className="text-center text-xs leading-5 text-ink/45">Your family data stays private and is protected at the database level.</p>
    </form>
  );
}
