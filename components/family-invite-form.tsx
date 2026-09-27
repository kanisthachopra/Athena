"use client";

import { createFamilyInvitation, type InviteState } from "@/app/family/actions";
import { Check, Copy, MailPlus } from "lucide-react";
import { useActionState, useState } from "react";

const initialState: InviteState = { error: null, invitePath: null };

export function FamilyInviteForm() {
  const [state, formAction, pending] = useActionState(createFamilyInvitation, initialState);
  const [copied, setCopied] = useState(false);

  async function copyInvite() {
    if (!state.invitePath) return;
    await navigator.clipboard.writeText(`${window.location.origin}${state.invitePath}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return <div className="mt-6">
    <form action={formAction} className="grid gap-4 md:grid-cols-[1fr_12rem_auto] md:items-end">
      <label><span className="mb-2 block text-sm font-semibold">Email address</span><input className="mira-input" name="email" type="email" placeholder="caregiver@example.com" required /></label>
      <label><span className="mb-2 block text-sm font-semibold">Access</span><select className="mira-input" name="role" defaultValue="caregiver"><option value="caregiver">Caregiver</option><option value="viewer">Viewer</option></select></label>
      <button className="button-primary" type="submit" disabled={pending}><MailPlus size={17} />{pending ? "Creating…" : "Create invite"}</button>
    </form>
    {state.error && <p className="mt-3 text-sm text-red-600" role="alert">{state.error}</p>}
    {state.invitePath && <div className="mt-5 rounded-2xl border border-[#829378]/30 bg-[#eef3ea] p-4"><p className="text-sm font-semibold text-[#52634e]">Invitation ready for 7 days</p><div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center"><code className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap rounded-lg bg-white/80 px-3 py-2 text-xs">{state.invitePath}</code><button className="button-ghost bg-white" type="button" onClick={copyInvite}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? "Copied" : "Copy full link"}</button></div><p className="mt-2 text-xs text-ink/50">Send this link only to the email address entered above.</p></div>}
  </div>;
}
