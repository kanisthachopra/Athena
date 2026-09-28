"use client";

import { updateFamilyName, type ProfileState } from "@/app/family/actions";
import { Check } from "lucide-react";
import { useActionState } from "react";

export function FamilyNameForm({ initialName }: { initialName: string }) {
  const [state, formAction, pending] = useActionState<ProfileState, FormData>(updateFamilyName, { error: null, success: null });
  return <form action={formAction} className="mt-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end"><label className="flex-1"><span className="mb-2 block text-sm font-semibold">Family display name</span><input className="mira-input" name="displayName" defaultValue={initialName} maxLength={80} required /></label><button className="button-primary" type="submit" disabled={pending}>{pending ? "Saving…" : "Save family name"}</button></div>
    {state.error && <p className="mt-3 text-sm text-red-600" role="alert">{state.error}</p>}
    {state.success && <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-[#52634e]"><Check size={15} /> {state.success}</p>}
  </form>;
}
