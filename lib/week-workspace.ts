export type WeekSnapshot = { id: string; scheduled_date: string; status: string; template_id: string | null }[];
export type WeekItem = {
  id: string; template_id: string | null; scheduled_date: string; status: "planned" | "completed" | "skipped";
  personalized_title: string; personalized_instructions: string; selection_reason: string;
  opportunity_type: "embedded" | "intentional" | "open" | "language";
  estimated_parent_minutes: number;
  content_state?: "saved" | "legacy" | "invalid" | "open";
  // Derived from the saved snapshot, never a live template join.
  activity_templates: { domain: string; duration_minutes: number; summary: string } | null;
};
export function planDays(weekStart: string) {
  const base = new Date(weekStart + "T12:00:00Z");
  if (Number.isNaN(base.getTime())) return [];
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(base); date.setUTCDate(base.getUTCDate() + index);
    return { value: date.toISOString().slice(0, 10), label: new Intl.DateTimeFormat("en", { weekday: "long", timeZone: "UTC" }).format(date), short: new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(date) };
  });
}
export function snapshotOf(items: WeekItem[]): WeekSnapshot {
  return items.map(({ id, scheduled_date, status, template_id }) => ({ id, scheduled_date, status, template_id })).sort((a,b) => a.id.localeCompare(b.id));
}
export function movePreview(items: WeekItem[], sourceId: string, targetDate: string) {
  const source = items.find(item => item.id === sourceId);
  const target = items.find(item => item.scheduled_date === targetDate);
  if (!source || source.status !== "planned" || (target && target.status !== "planned")) return null;
  return { source, target, swaps: !!target && target.id !== sourceId };
}
export function weekSelectionSummary(plan: { generation_method: string; adaptation_summary: string }, items: { template_id: string | null }[]) {
  if (plan.generation_method !== "reviewed_portfolio_v3") return plan.adaptation_summary;
  if (!items.length) return "No opportunities are stored in this plan. Nothing has been scheduled.";
  if (items.every(item => item.template_id === null)) return "No activity template was selected. This week is left open. Each day explains whether space was deliberately protected or no reviewed option met the planning checks.";
  return "This planner checks exact-version review records, the saved age range, each day’s capacity and screen preferences. Recent use, recorded engagement and preparation effort order the available options. Read each day’s selection note for context; this is not a measure of your child’s ability.";
}

