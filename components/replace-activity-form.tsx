"use client";

import { useActionState } from "react";
import { replaceActivity } from "@/app/library/actions";
import { initialReplacementState } from "@/lib/activity-replacement";

export function ReplaceActivityForm({ instanceId, revision, templateSnapshot, returnTo }: {
  instanceId: string; revision: number; templateSnapshot: Record<string, unknown>; returnTo: string;
}) {
  const [state, action, pending] = useActionState(replaceActivity, initialReplacementState);
  return <form action={action} className="max-w-sm" aria-busy={pending}>
    <input type="hidden" name="instanceId" value={instanceId} />
    <input type="hidden" name="revision" value={revision} />
    <input type="hidden" name="templateId" value={String(templateSnapshot.id)} />
    <input type="hidden" name="templateSnapshot" value={JSON.stringify(templateSnapshot)} />
    <button className="button-ghost" type="submit" disabled={pending || state.refreshRequired}>{pending ? "Checking and replacing…" : "Use this instead"}</button>
    {state.error && <div className="mt-3 text-sm leading-6"><p role="alert">{state.error}</p><a className="button-ghost mt-2" href={returnTo}>Refresh alternatives</a></div>}
  </form>;
}
