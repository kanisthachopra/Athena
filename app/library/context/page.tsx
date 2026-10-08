import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { ActivityContextForm } from "@/components/activity-context-form";
import { requireFamilyContext } from "@/lib/family-context";
import { loadFamilyCalendar, calendarLabel } from "@/lib/family-calendar";
import { contextDatePlus, isContextDate, parseContextAnswers, parseContextContract, type ActivityContextOption } from "@/lib/activity-context";
export const metadata = { title: "Activity context" };
export default async function ActivityContextPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const { supabase, activeChild, family, membership } = await requireFamilyContext();
  const calendar = await loadFamilyCalendar(supabase, membership.family_id), today = calendar.today;
  const date = isContextDate(query.date) && query.date >= today && query.date <= contextDatePlus(today, 14) ? query.date : today;
  const { data, error } = await supabase.rpc("get_activity_context_options", { p_child_id: activeChild.id, p_on_date: date });
  const options: ActivityContextOption[] = []; let unavailable = Boolean(error) || !Array.isArray(data);
  for (const row of Array.isArray(data) ? data : []) {
    const contract = parseContextContract(row.contract);
    if (!contract || typeof row.title !== "string" || !Number.isInteger(row.content_version) || row.content_version < 1 || typeof row.template_id !== "string") { unavailable = true; break; }
    const c = row.confirmation;
    if (c && (!Number.isInteger(c.revision) || c.revision < 1 || !Number.isInteger(c.content_version) || !isContextDate(c.valid_from) || !isContextDate(c.valid_until))) { unavailable = true; break; }
    const answers = c?.content_version === row.content_version ? parseContextAnswers(c.answers, contract) : Object.fromEntries(contract.checks.map(check => [check.id, null]));
    if (c && !answers) { unavailable = true; break; }
    options.push({ ...row, contract, confirmation: c ? { ...c, answers } : null });
  }
  return <main className="min-h-screen"><AppHeader familyName={family?.display_name ?? "Your family"} /><div className="workspace-page">
    <Link className="button-ghost mb-5" href="/library">Back to Library</Link>
    <h1 className="workspace-heading">Will this fit your day?</h1>
    <p className="workspace-description">Check what a reviewed idea needs for {activeChild.nickname}. Saving answers does not add an activity or change a plan. There is no need to make every idea fit.</p>
    <form className="my-6 flex flex-wrap items-end gap-3" action="/library/context"><label className="grid gap-2 font-semibold">Date to check<input className="mira-input" name="date" type="date" defaultValue={date} min={today} max={contextDatePlus(today, 14)} required /></label><button className="button-primary">Show checks</button></form>
    <p className="text-sm leading-6 text-muted-foreground"><Link href="/settings#family-calendar" className="underline underline-offset-4">{calendarLabel(calendar)}</Link>. Confirm the date shown before saving.</p>
    {unavailable ? <div className="spatial-notice" role="alert"><p>Activity checks could not be loaded. Your saved answers and plans are unchanged. Try again shortly.</p><Link className="button-ghost" href={`/library/context?date=${date}`}>Retry checks</Link></div>
      : !options.length ? <section className="library-empty"><h2>No reviewed ideas are ready for these checks yet</h2><p>These questions come from reviewed activity requirements. MIRA will not invent them or ask you to approve a draft. You can read saved plans or leave the day open.</p><Link className="button-ghost" href="/library/research">View research and review work</Link></section>
      : <section className="mt-6 divide-y divide-border" aria-label="Reviewed activity conditions">{options.map(option => <details key={`${option.template_id}-${option.content_version}-${date}`} className="py-5">
        <summary className="min-h-11 cursor-pointer py-2 text-xl">{option.title}</summary>
        <ActivityContextForm option={option} childId={activeChild.id} date={date} canEdit={membership.role !== "viewer"} />
      </details>)}</section>}
  </div></main>;
}
