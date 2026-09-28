"use client";

import { rescheduleActivity } from "@/app/week/actions";
import { CalendarClock, Check, LoaderCircle } from "lucide-react";
import { useActionState } from "react";

type PlanDay = { value: string; label: string };

export function RescheduleActivityForm({
  instanceId,
  scheduledDate,
  days,
}: {
  instanceId: string;
  scheduledDate: string;
  days: PlanDay[];
}) {
  const [state, action, pending] = useActionState(rescheduleActivity, { error: null, success: null });

  return (
    <details className="group relative sm:text-right">
      <summary className="button-ghost cursor-pointer list-none gap-1 px-3 text-ink/50 [&::-webkit-details-marker]:hidden"><CalendarClock size={14} /> Move</summary>
      <form action={action} className="mt-2 rounded-2xl border border-black/5 bg-[#f7f3e9] p-3 text-left sm:absolute sm:right-0 sm:z-10 sm:w-64 sm:shadow-lg">
        <input type="hidden" name="instanceId" value={instanceId} />
        <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-[.12em] text-ink/45">Move or swap with</span><select className="mira-input min-h-10 py-2 text-sm" name="targetDate" defaultValue={scheduledDate}>{days.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}</select></label>
        {state.error && <p className="mt-2 text-xs leading-5 text-red-700" role="alert">{state.error}</p>}
        {state.success && <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-[#52634e]"><Check size={13} /> {state.success}</p>}
        <button className="button-primary mt-3 min-h-9 w-full px-3 py-1.5 text-xs" type="submit" disabled={pending}>{pending ? <><LoaderCircle className="animate-spin" size={14} /> Moving…</> : "Save day"}</button>
      </form>
    </details>
  );
}
