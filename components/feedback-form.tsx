"use client";

import { saveFeedback } from "@/app/activity/actions";
import { LoaderCircle } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

function SaveButton() {
  const { pending } = useFormStatus();
  return <button className="button-primary w-full" disabled={pending}>{pending ? <><LoaderCircle className="animate-spin" size={17} /> Saving…</> : "Save what happened"}</button>;
}

export function FeedbackForm({ instanceId }: { instanceId: string }) {
  const [state, action] = useActionState(saveFeedback, { error: null });
  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="instanceId" value={instanceId} />
      <fieldset><legend className="text-sm font-semibold">How engaged were they?</legend><div className="mt-3 grid grid-cols-3 gap-2">{[["low", "Not today"], ["medium", "Some interest"], ["high", "Loved it"]].map(([value, label]) => <label key={value} className="cursor-pointer rounded-xl border border-black/10 bg-white p-3 text-center text-sm has-[:checked]:border-[#829378] has-[:checked]:bg-[#eef3ea]"><input className="sr-only" type="radio" name="engagement" value={value} required />{label}</label>)}</div></fieldset>
      <fieldset><legend className="text-sm font-semibold">How did the challenge feel?</legend><div className="mt-3 grid grid-cols-3 gap-2">{[["easy", "Very easy"], ["just_right", "Just right"], ["stretch", "A stretch"]].map(([value, label]) => <label key={value} className="cursor-pointer rounded-xl border border-black/10 bg-white p-3 text-center text-sm has-[:checked]:border-[#829378] has-[:checked]:bg-[#eef3ea]"><input className="sr-only" type="radio" name="challenge" value={value} required />{label}</label>)}</div></fieldset>
      <label className="flex gap-3 rounded-xl bg-[#f3eee3] p-4 text-sm"><input className="size-4 accent-[#52634e]" type="checkbox" name="repeated" /><span>They chose to repeat part of it</span></label>
      <label className="block"><span className="mb-2 block text-sm font-semibold">Anything you noticed? <span className="font-normal text-ink/40">Optional</span></span><textarea className="mira-input min-h-28 resize-y" name="note" maxLength={1000} placeholder="She ignored the cups but spent ages arranging the spoons…" /></label>
      {state.error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>}
      <SaveButton />
    </form>
  );
}
