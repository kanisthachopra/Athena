"use client";

import { moveWeekActivity } from "@/app/week/actions";
import { movePreview, planDays, snapshotOf, type WeekItem, type WeekSnapshot } from "@/lib/week-workspace";
import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";

export function WeekWorkspace({ initialItems, weekStart, editable }: { initialItems: WeekItem[]; weekStart: string; editable: boolean }) {
  const [items, setItems] = useState(initialItems);
  const [selection, setSelection] = useState<string | null>(null);
  const [target, setTarget] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [undo, setUndo] = useState<{ id: string; date: string; expected: WeekSnapshot } | null>(null);
  const board = useRef<HTMLDivElement>(null);
  const positions = useRef(new Map<string, DOMRect>());
  const animations = useRef<Animation[]>([]);
  const days = planDays(weekStart);
  const preview = selection && target ? movePreview(items, selection, target) : null;

  useLayoutEffect(() => {
    if (!positions.current.size) return;
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches && document.documentElement.dataset.motion !== "off") {
      board.current?.querySelectorAll<HTMLElement>("[data-activity]").forEach(element => {
        const before = positions.current.get(element.dataset.activity!); if (!before) return;
        const after = element.getBoundingClientRect();
        const x = before.left - after.left, y = before.top - after.top;
        if (x || y) animations.current.push(element.animate([{ transform: `translate(${x}px, ${y}px)`, zIndex: 2 }, { transform: "translate(0,0)", zIndex: 2 }], { duration: 420, easing: "cubic-bezier(.16,1,.3,1)" }));
      });
    }
    positions.current.clear();
    const stop = () => animations.current.forEach(animation => animation.cancel());
    document.addEventListener("visibilitychange", stop); window.addEventListener("mira-motion", stop);
    const preference = matchMedia("(prefers-reduced-motion: reduce)"); preference.addEventListener("change", stop);
    return () => { stop(); document.removeEventListener("visibilitychange", stop); window.removeEventListener("mira-motion", stop); preference.removeEventListener("change", stop); };
  }, [items]);

  async function move(id: string, date: string, expected: WeekSnapshot, reverting = false) {
    const source = items.find(item => item.id === id); if (!source || pending) return;
    setPending(true); setError("");
    try {
      const result = await moveWeekActivity({ instanceId: id, targetDate: date, expected });
      if (result.error || !result.snapshot) { setError(result.error ?? "The move could not be confirmed. Refresh to check your week."); return; }
      animations.current.forEach(animation => animation.cancel()); animations.current = [];
      positions.current = new Map(Array.from(board.current?.querySelectorAll<HTMLElement>("[data-activity]") ?? []).map(element => [element.dataset.activity!, element.getBoundingClientRect()]));
      const next = new Map(result.snapshot.map(item => [item.id, item]));
      setItems(current => current.map(item => ({ ...item, scheduled_date: next.get(item.id)?.scheduled_date ?? item.scheduled_date })));
      setUndo(reverting ? null : { id, date: source.scheduled_date, expected: result.snapshot });
      setNotice(reverting ? "Move undone." : `${source.personalized_title} moved to ${days.find(day => day.value === date)?.label ?? date}.`);
      setSelection(null); setTarget("");
      requestAnimationFrame(() => board.current?.querySelector<HTMLButtonElement>(`[data-move="${id}"]`)?.focus({ preventScroll: true }));
    } catch { setError("The connection was interrupted. Refresh to check whether the move was saved before trying again."); }
    finally { setPending(false); }
  }

  return <>
    {error && <div role="alert" className="spatial-notice text-destructive"><p>{error}</p><button className="button-ghost" disabled={pending} onClick={() => window.location.reload()}>Refresh week</button></div>}
    <div role="status" aria-live="polite">{notice && <div className="spatial-notice"><p className="flex-1">{notice}</p>{undo && <button className="button-ghost" disabled={pending} onClick={() => move(undo.id, undo.date, undo.expected, true)}>Undo move</button>}</div>}</div>
    <div className="spatial-board" ref={board} aria-busy={pending}>{days.map(day => <section className="spatial-day" key={day.value} aria-label={day.label}>
      <h2 className="spatial-day-heading">{day.label}<span>{day.short}</span></h2>
      {items.filter(item => item.scheduled_date === day.value).map(item => <article className={item.opportunity_type === "open" ? "spatial-empty" : "spatial-item"} key={item.id} data-activity={item.id}>
        <div className="spatial-meta"><span>{{ embedded: "An everyday moment", intentional: "An optional experience", language: "Communication", open: "Open time" }[item.opportunity_type]}</span>{item.activity_templates && <span>{item.activity_templates.duration_minutes} min · {item.estimated_parent_minutes} min setup</span>}{item.status !== "planned" && <span>{item.status === "completed" ? "Tried" : "Not offered"}</span>}</div>
        <h3>{item.opportunity_type === "open" ? item.personalized_title : <Link href={`/activity/${item.id}`} className="hover:underline">{item.personalized_title}</Link>}</h3>
        <p>{item.opportunity_type === "open" ? item.personalized_instructions : item.activity_templates?.summary}</p>
        {item.content_state === "legacy" && <p>Saved record · original template version unknown.</p>}
        {item.content_state === "invalid" && <p>Saved content could not be read. Open the record for details.</p>}
        {item.selection_reason && <details><summary>Why this was selected</summary><p className="mt-2">{item.selection_reason}</p></details>}
        {item.opportunity_type !== "open" && <div className="spatial-actions"><Link href={`/activity/${item.id}`} className="button-ghost">View activity record</Link>{editable && item.status === "planned" && <><button className="button-ghost" data-move={item.id} disabled={pending} aria-expanded={selection === item.id} onClick={() => { setSelection(selection === item.id ? null : item.id); setTarget(""); setError(""); }}>Move</button><Link className="button-ghost" href={`/library?replace=${item.id}`}>Replace</Link></>}</div>}
        {selection === item.id && <form className="mt-5 border-t pt-4" onSubmit={event => { event.preventDefault(); if (target) void move(item.id, target, snapshotOf(items)); }}>
          <label htmlFor={`day-${item.id}`} className="mb-2 block text-sm">Choose a day</label><select id={`day-${item.id}`} className="mira-input" value={target} required disabled={pending} onChange={event => setTarget(event.target.value)}><option value="">Select a day</option>{days.filter(destination => destination.value !== item.scheduled_date).map(destination => <option key={destination.value} value={destination.value} disabled={items.some(other => other.scheduled_date === destination.value && other.status !== "planned")}>{destination.label}</option>)}</select>
          {preview && <p className="mt-3">{preview.swaps ? `Swap with “${preview.target!.personalized_title}”. That item moves to ${day.label}.` : "Move this experience only. Everything else stays where it is."}</p>}
          <div className="spatial-actions"><button className="button-primary" disabled={!preview || pending}>{pending ? "Saving…" : preview?.swaps ? "Confirm swap" : "Confirm move"}</button><button type="button" className="button-ghost" disabled={pending} onClick={() => setSelection(null)}>Cancel</button></div>
        </form>}
      </article>)}
      {!items.some(item => item.scheduled_date === day.value) && <p className="spatial-empty">Nothing planned. There is no need to fill this space.</p>}
    </section>)}</div>
  </>;
}
