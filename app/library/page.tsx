import { ReplaceActivityForm } from "@/components/replace-activity-form";
import { AppHeader } from "@/components/app-header";
import { SaveActivityForm } from "@/components/save-activity-form";
import { requireFamilyContext } from "@/lib/family-context";
import { loadLibraryCandidates } from "@/lib/library-candidates";
import { loadFamilyCalendar } from "@/lib/family-calendar";
import { contentStatus, domainNames, libraryFilters, libraryUrl, matchesLibrarySearch } from "@/lib/library-view";
import Link from "next/link";

type Template = Record<string, unknown> & { id: string; title: string; domain: string; duration_minutes: number; summary: string; materials: string[]; embedded_learning: boolean; setup_minutes: number; review_status: string };
export const metadata = { title: "Library" };

export default async function LibraryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = libraryFilters(await searchParams);
  const { supabase, family, activeChild: child, membership } = await requireFamilyContext();
  const [targetResult, savedResult] = await Promise.all([
    filters.replace && membership.role !== "viewer" ? supabase.from("activity_instances").select("id,plan_id,personalized_title,status,scheduled_date,opportunity_type,revision").eq("id", filters.replace).eq("child_id", child.id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    supabase.from("saved_activities").select("template_id").eq("child_id", child.id),
  ]);
  if (targetResult.error || savedResult.error) throw new Error("Could not load the library. Please try again.");
  const savedIds = new Set((savedResult.data ?? []).map(row => row.template_id));
  const replacement = targetResult.data?.status === "planned" && targetResult.data?.opportunity_type !== "open" ? targetResult.data : null;
  const candidateDate = replacement?.scheduled_date ?? (await loadFamilyCalendar(supabase, membership.family_id)).today;
  const candidates = await loadLibraryCandidates(supabase, child.id, candidateDate);
  let templates = (candidates.snapshots as Template[]).sort((a, b) => a.title.localeCompare(b.title));
  if (filters.domain) templates = templates.filter(item => item.domain === filters.domain);
  if (filters.saved) templates = templates.filter(item => savedIds.has(item.id));
  if (replacement) {
    const { data, error } = await supabase.from("activity_instances").select("template_id").eq("plan_id", replacement.plan_id).eq("child_id", child.id);
    if (error) throw new Error("Could not check the current plan. Please try again.");
    const used = new Set((data ?? []).map(item => item.template_id));
    templates = templates.filter(item => !used.has(item.id));
  }
  templates = templates.filter(item => matchesLibrarySearch(item, filters.q));
  const returnTo = libraryUrl(filters);
  const unavailableReplacement = Boolean(filters.replace && !replacement);
  const unavailableSavedIds = filters.saved && !candidates.error ? [...savedIds].filter(id => !candidates.ids.includes(id)) : [];
  const unavailableResult = unavailableSavedIds.length ? await supabase.from("activity_templates").select("id,title,domain").in("id", unavailableSavedIds) : { data: [], error: null };
  if (unavailableResult.error) throw new Error("Could not load saved-choice names. Try again; nothing has been removed.");
  const unavailableSaved = unavailableSavedIds.map(id => unavailableResult.data?.find(row => row.id === id) ?? { id, title: "Unavailable saved idea", domain: "" })
    .filter(item => (!filters.domain || filters.domain === item.domain) && matchesLibrarySearch({ title: item.title, summary: "", materials: [] }, filters.q));
  return <main className="min-h-screen"><AppHeader familyName={family?.display_name ?? "Your family"} /><div className="workspace-page">
    <h1 className="workspace-heading">Library</h1><p className="workspace-description">Find an idea for {child.nickname}, or keep one for another day. Nothing needs to be added to the week.</p>
    <Link href="/library/research" className="button-ghost mt-4">Explore the research and AI draft stacks</Link>
    <Link href={`/library/context?date=${candidateDate}`} className="button-ghost mt-4">Check materials and family context</Link>
    {replacement && <section className="spatial-notice" aria-label="Replacement context"><div><p>Choosing an alternative to</p><strong>{replacement.personalized_title}</strong><p className="mt-2 text-sm">Your plan stays unchanged until you choose “Use this instead”.</p></div><Link className="button-ghost" href={`/week?plan=${replacement.plan_id}`}>Cancel replacement</Link></section>}
    {unavailableReplacement && <div className="spatial-notice" role="status"><p>This activity is no longer available to replace. You can still browse the library.</p><Link className="button-ghost" href="/week">Return to Week</Link></div>}
    <form action="/library" className="library-search" role="search"><label htmlFor="library-search">Search ideas or materials</label><div><input id="library-search" className="mira-input" name="q" type="search" defaultValue={filters.q} maxLength={100} placeholder="Try books, sounds, or cloth" /><label className="library-area">Area<select className="mira-input" name="domain" defaultValue={filters.domain}><option value="">Any area</option>{Object.entries(domainNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>{filters.saved && <input type="hidden" name="saved" value="1" />}{filters.replace && <input type="hidden" name="replace" value={filters.replace} />}<button className="button-primary">Search</button></div></form>
    <div className="library-filters"><nav aria-label="Library collection"><Link aria-current={!filters.saved ? "page" : undefined} href={libraryUrl({ ...filters, saved: false })}>All ideas</Link><Link aria-current={filters.saved ? "page" : undefined} href={libraryUrl({ ...filters, saved: true })}>Saved</Link></nav></div>
    <div className="library-results-heading"><p>{candidates.error ? "Library check unavailable" : <>{templates.length} {templates.length === 1 ? "idea" : "ideas"}{filters.q && <> matching “{filters.q}”</>}</>}</p>{(filters.q || filters.domain || filters.saved) && <Link className="button-ghost" href={libraryUrl({ replace: filters.replace })}>Clear filters</Link>}</div>
    {!candidates.error && <p className="library-scope">Options for {candidateDate}: checked against exact activity and source review records, the saved age range, preparation plus activity time, and screen preferences. This is not a complete safety assessment.</p>}
    {candidates.error && <div className="spatial-notice" role="alert"><p>{candidates.error}</p><Link className="button-ghost" href={returnTo}>Retry library check</Link></div>}
    <section aria-label="Activity ideas" className="library-list">{templates.map(item => {
      const detail = `/library/${item.id}${returnTo.includes("?") ? returnTo.slice(returnTo.indexOf("?")) : ""}`;
      return <article key={item.id} className="library-row"><div><div className="spatial-meta"><span>{domainNames[item.domain] ?? item.domain}</span><span>{item.duration_minutes} min · {item.setup_minutes} min setup</span>{item.embedded_learning && <span>Everyday moment</span>}</div><h2><Link href={detail}>{item.title}</Link></h2><p>{item.summary}</p><p className="library-materials"><strong>Bring:</strong> {item.materials.join(", ") || "Nothing special"}</p><p className="content-status">{contentStatus(item.review_status)}</p></div><div className="library-row-actions"><Link className="button-primary" href={detail}>Read preparation</Link>{membership.role !== "viewer" && <SaveActivityForm templateId={item.id} saved={savedIds.has(item.id)} returnTo={returnTo} />}{replacement && <ReplaceActivityForm instanceId={replacement.id} revision={replacement.revision} templateSnapshot={item} returnTo={returnTo} />}</div></article>;
    })}</section>
    {!templates.length && !candidates.error && <section className="library-empty"><h2>{!candidates.ids.length ? "No reviewed activity is available for this date" : filters.saved ? "No saved ideas in this view" : "No ideas match this view"}</h2><p>{!candidates.ids.length ? "A draft is not a substitute for a reviewed activity. You can see the research and pending reviews, read existing plans, or leave the day open. Saved choices have not been removed." : filters.saved ? "Your saved choices may be outside the current age, time or review limits." : "Try fewer search words or a different area. You can also leave the day open."}</p><Link className="button-primary" href={!candidates.ids.length ? "/library/research" : libraryUrl({ replace: filters.replace })}>{!candidates.ids.length ? "View research and review work" : "Clear library filters"}</Link></section>}
    {unavailableSaved.length > 0 && <section className="mt-9" aria-label="Unavailable saved choices"><h2 className="text-xl">Saved, but not available to choose</h2><p className="mt-3 leading-7 text-muted-foreground">These choices do not pass the current review, age or day-specific checks. Keeping a bookmark does not make an activity eligible. You can remove it without changing a plan.</p><div className="library-list">{unavailableSaved.map(item => <article key={item.id} className="library-row"><div><h3>{item.title}</h3><p>Not available for {candidateDate}.</p></div>{membership.role !== "viewer" && <SaveActivityForm templateId={item.id} saved returnTo={returnTo} removeLabel="Remove saved idea" />}</article>)}</div></section>}
  </div></main>;
}
