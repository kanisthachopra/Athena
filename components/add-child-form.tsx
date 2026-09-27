"use client";

import { addChild } from "@/app/family/actions";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button type="submit" className="button-primary w-full sm:w-auto" disabled={pending}>{pending ? <><LoaderCircle className="animate-spin" size={17} /> Adding…</> : <>Add child <ArrowRight size={17} /></>}</button>;
}

export function AddChildForm() {
  const [state, action] = useActionState(addChild, { error: null });
  const currentYear = new Date().getFullYear();
  return <form action={action} className="mt-6 grid gap-4 sm:grid-cols-2">
    <label className="sm:col-span-2"><span className="mb-2 block text-sm font-semibold">First name or nickname</span><input name="nickname" className="mira-input" maxLength={60} required /></label>
    <label><span className="mb-2 block text-sm font-semibold">Birth month</span><select name="birthMonth" className="mira-input" required defaultValue=""><option value="" disabled>Choose month</option>{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{new Intl.DateTimeFormat("en", { month: "long" }).format(new Date(2024, index, 1))}</option>)}</select></label>
    <label><span className="mb-2 block text-sm font-semibold">Birth year</span><select name="birthYear" className="mira-input" required defaultValue=""><option value="" disabled>Choose year</option>{Array.from({ length: 19 }, (_, index) => currentYear - index).map((year) => <option key={year}>{year}</option>)}</select></label>
    {state.error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">{state.error}</p>}
    <div className="sm:col-span-2"><SubmitButton /></div>
  </form>;
}
