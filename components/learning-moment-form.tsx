"use client";

import { saveLearningMoment, type LearningMomentState } from "@/app/insights/actions";
import { Check, LoaderCircle, Plus } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";

const initialState: LearningMomentState = { error: null, success: null };

export function LearningMomentForm({ childName, today }: { childName: string; today: string }) {
  const [state, action, pending] = useActionState(saveLearningMoment, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={action} className="mt-6 grid gap-5">
      <div className="grid gap-5 sm:grid-cols-[1fr_12rem]">
        <label>
          <span className="mb-2 block text-sm font-semibold">A short title</span>
          <input className="mira-input" name="title" maxLength={100} placeholder={`${childName} found a new way…`} required />
        </label>
        <label>
          <span className="mb-2 block text-sm font-semibold">When</span>
          <input className="mira-input" name="occurredOn" type="date" defaultValue={today} max={today} required />
        </label>
      </div>
      <label>
        <span className="mb-2 block text-sm font-semibold">Learning area</span>
        <select className="mira-input" name="domain" defaultValue="everyday">
          <option value="everyday">Everyday discovery</option>
          <option value="language">Language</option>
          <option value="movement">Movement</option>
          <option value="sensory">Sensory</option>
          <option value="maths">Early maths</option>
          <option value="creative">Creative</option>
          <option value="life_skills">Life skills</option>
          <option value="nature">Nature</option>
        </select>
      </label>
      <label>
        <span className="mb-2 block text-sm font-semibold">What did you notice?</span>
        <textarea className="mira-input min-h-32 resize-y" name="note" maxLength={1200} placeholder="Capture what happened in your own words. There is no need to turn it into a lesson or assessment." required />
      </label>
      {state.error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>}
      {state.success && <p className="flex items-center gap-2 text-sm font-semibold text-[#52634e]"><Check size={16} /> {state.success}</p>}
      <div><button className="button-primary" type="submit" disabled={pending}>{pending ? <><LoaderCircle className="animate-spin" size={17} /> Saving…</> : <><Plus size={17} /> Add to the journal</>}</button></div>
    </form>
  );
}
