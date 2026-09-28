"use client";

import { updateChildProfile, type ProfileState } from "@/app/family/actions";
import { Check } from "lucide-react";
import { useActionState } from "react";

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function ChildProfileForm({ child }: { child: { id: string; nickname: string; birth_month: number; birth_year: number } }) {
  const [state, formAction, pending] = useActionState<ProfileState, FormData>(updateChildProfile, { error: null, success: null });
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 19 }, (_, index) => currentYear - index);
  return <form action={formAction} className="mt-7 space-y-5">
    <input type="hidden" name="childId" value={child.id} />
    <label><span className="mb-2 block text-sm font-semibold">First name or nickname</span><input className="mira-input" name="nickname" defaultValue={child.nickname} maxLength={60} required /></label>
    <div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-2 block text-sm font-semibold">Birth month</span><select className="mira-input" name="birthMonth" defaultValue={child.birth_month}>{months.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}</select></label><label><span className="mb-2 block text-sm font-semibold">Birth year</span><select className="mira-input" name="birthYear" defaultValue={child.birth_year}>{years.map((year) => <option key={year} value={year}>{year}</option>)}</select></label></div>
    <button className="button-primary" type="submit" disabled={pending}>{pending ? "Saving…" : "Save profile"}</button>
    {state.error && <p className="text-sm text-red-600" role="alert">{state.error}</p>}
    {state.success && <p className="flex items-center gap-1.5 text-sm font-semibold text-[#52634e]"><Check size={15} /> {state.success}</p>}
  </form>;
}
