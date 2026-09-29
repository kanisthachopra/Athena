"use client";

import {
  proposeLearningMoment,
  saveLearningMoment,
  type LearningMomentState,
  type ObservationProposalState,
} from "@/app/insights/actions";
import { ArrowLeft, Check, LoaderCircle, PencilLine, Sparkles } from "lucide-react";
import { useActionState, useState } from "react";

const initialProposalState: ObservationProposalState = {
  error: null,
  notice: null,
  source: null,
  proposal: null,
};
const initialSaveState: LearningMomentState = { error: null, success: null };

const domainOptions = [
  ["everyday", "Everyday discovery"],
  ["language", "Language"],
  ["movement", "Movement"],
  ["sensory", "Sensory"],
  ["maths", "Early maths"],
  ["creative", "Creative"],
  ["life_skills", "Life skills"],
  ["nature", "Nature"],
];

export function LearningMomentForm({ childName, today }: { childName: string; today: string }) {
  const [proposalState, proposeAction, proposing] = useActionState(proposeLearningMoment, initialProposalState);
  const [saveState, saveAction, saving] = useActionState(saveLearningMoment, initialSaveState);
  const [proposalDismissed, setProposalDismissed] = useState(false);
  const reviewing = Boolean(proposalState.proposal) && !proposalDismissed;

  if (saveState.success) {
    return (
      <div className="mt-6 rounded-2xl border border-[#bfd9d8] bg-[#e2efe9] p-5">
        <p className="flex items-center gap-2 font-semibold text-[#386357]"><Check size={18} /> {saveState.success}</p>
        <p className="mt-2 text-sm leading-6 text-ink/60">It is now part of {childName}&apos;s story and can gently inform future opportunities.</p>
        <button className="button-ghost mt-3" type="button" onClick={() => window.location.reload()}>Notice another moment</button>
      </div>
    );
  }

  if (reviewing && proposalState.proposal) {
    const proposal = proposalState.proposal;
    return (
      <div className="mt-6 overflow-hidden rounded-2xl border border-[#d4c8e5] bg-[#eee7f5]">
        <div className="border-b border-black/5 p-5 sm:p-6">
          <p className="eyebrow text-[#6d5688]"><Sparkles size={14} /> Here is what MIRA heard</p>
          <h3 className="mt-2 font-serif text-2xl">Check before saving</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/60">Every field is editable. MIRA has not changed the journal or {childName}&apos;s profile.</p>
          {proposalState.notice && <p className="mt-3 rounded-xl bg-white/55 px-4 py-3 text-sm leading-6 text-ink/65">{proposalState.notice}</p>}
        </div>

        <form action={saveAction} className="grid gap-5 p-5 sm:p-6">
          <input type="hidden" name="occurredOn" value={proposal.occurredOn} />
          <div className="grid gap-5 sm:grid-cols-[1fr_13rem]">
            <label>
              <span className="mb-2 block text-sm font-semibold">Journal title</span>
              <input className="mira-input" name="title" maxLength={100} defaultValue={proposal.title} required />
            </label>
            <label>
              <span className="mb-2 block text-sm font-semibold">Learning area</span>
              <select className="mira-input" name="domain" defaultValue={proposal.domain}>
                {domainOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
              </select>
            </label>
          </div>
          <label>
            <span className="mb-2 block text-sm font-semibold">Observation</span>
            <textarea className="mira-input min-h-28 resize-y" name="note" maxLength={1200} defaultValue={proposal.note} required />
          </label>
          {saveState.error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{saveState.error}</p>}
          <div className="flex flex-wrap gap-3">
            <button className="button-primary" type="submit" disabled={saving}>
              {saving ? <><LoaderCircle className="animate-spin" size={17} /> Saving…</> : <><Check size={17} /> Confirm and save</>}
            </button>
            <button className="button-ghost gap-2" type="button" onClick={() => setProposalDismissed(true)} disabled={saving}>
              <ArrowLeft size={16} /> Back to my note
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <form action={proposeAction} className="mt-6 grid gap-5" onSubmit={() => setProposalDismissed(false)}>
      <div className="grid gap-5 sm:grid-cols-[1fr_12rem]">
        <label>
          <span className="mb-2 block text-sm font-semibold">What happened?</span>
          <textarea
            className="mira-input min-h-32 resize-y"
            name="rawNote"
            maxLength={1200}
            placeholder={`${childName} searched under the cloth, moved it, and laughed…`}
            required
          />
        </label>
        <label>
          <span className="mb-2 block text-sm font-semibold">When</span>
          <input className="mira-input" name="occurredOn" type="date" defaultValue={today} max={today} required />
        </label>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-xs leading-5 text-ink/50">For this step, your note is sent securely to Nebius to organize your words. MIRA does not diagnose, score, save the raw prompt in AI logs, or change the journal until you confirm.</p>
        <button className="button-primary shrink-0" type="submit" disabled={proposing}>
          {proposing ? <><LoaderCircle className="animate-spin" size={17} /> Listening…</> : <><PencilLine size={17} /> Review a suggestion</>}
        </button>
      </div>
      {proposalState.error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{proposalState.error}</p>}
    </form>
  );
}
