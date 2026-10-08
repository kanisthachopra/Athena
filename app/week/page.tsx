import { AppHeader } from "@/components/app-header";
import { WeekWorkspace } from "@/components/week-workspace";
import { WeekLanguageContexts } from "@/components/week-language-contexts";
import { loadLanguageOpportunities } from "@/lib/load-language-opportunities";
import { requireFamilyContext } from "@/lib/family-context";
import { savedActivityContent } from "@/lib/activity-content";
import { weekSelectionSummary, type WeekItem } from "@/lib/week-workspace";
import Link from "next/link";
import { redirect } from "next/navigation";
import { buildNextWeek } from "./actions";
export const metadata = { title: "Week" };
type Plan = { id: string; week_start: string; adaptation_summary: string; generation_method: string };
export default async function WeekPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
 const requestedPlan = (await searchParams).plan;
 const { supabase, membership, family, activeChild: child } = await requireFamilyContext();
 const { data: preference, error: preferenceError } = await supabase.from("family_preferences").select("family_id").eq("family_id", membership.family_id).maybeSingle();
 if (preferenceError) throw new Error("Your learning preferences could not be loaded.");
 const { data: planData, error: planError } = await supabase.from("plans").select("id,week_start,adaptation_summary,generation_method").eq("child_id", child.id).eq("status", "active").order("week_start", { ascending: false }).limit(6);
 if (planError) throw new Error("Your plans could not be loaded.");
 const plans = (planData ?? []) as Plan[];
 const plan = (requestedPlan ? plans.find(item => item.id === requestedPlan) : plans[0]) ?? plans[0];
 if (!plan) redirect("/setup");
 const [{ data, error }, languageContext] = await Promise.all([
  supabase.from("activity_instances").select("*").eq("plan_id", plan.id).eq("child_id", child.id).order("scheduled_date"),
  loadLanguageOpportunities(supabase, child.id, membership.family_id),
 ]);
 if (error) throw new Error("This week could not be loaded.");
 const items = (data ?? []).map(item => { const content=savedActivityContent(item.content_snapshot,item.template_id); return { ...item, activity_templates:content.template, content_state:content.state }; }) as unknown as WeekItem[];
 const selectionSummary = weekSelectionSummary(plan, items);
 return <main className="min-h-screen bg-cream text-ink">
  <AppHeader familyName={family?.display_name ?? "Your family"} />
  <div className="workspace-page">
   <h1 className="workspace-heading">A week with {child.nickname}</h1>
   <p className="workspace-description">Move an experience to a day that fits. Keep open time open. Nothing here has to be completed.</p>
   <div className="workspace-toolbar">
    <nav className="flex flex-wrap gap-2" aria-label="Choose a weekly plan">{plans.map(week => <Link key={week.id} href={`/week?plan=${week.id}`} aria-current={week.id === plan.id ? "page" : undefined} className={week.id === plan.id ? "button-primary" : "button-ghost"}>{new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(week.week_start + "T12:00:00Z"))}</Link>)}</nav>
    {membership.role !== "viewer" && <div className="flex flex-wrap gap-2"><Link href="/setup" className="button-ghost">{preference ? "Learning preferences" : "Finish planning setup"}</Link>{preference && <form action={buildNextWeek}><button className="button-primary">Plan next week</button></form>}</div>}
   </div>
   {selectionSummary && <details className="mb-7 border-b pb-5"><summary className="cursor-pointer py-2 text-sm text-primary">{["reviewed_portfolio_v3", "reviewed_portfolio_v4"].includes(plan.generation_method) ? "How this week was selected" : "Saved planning note"}</summary><p className="workspace-description mt-3">{selectionSummary}</p></details>}
   <WeekLanguageContexts context={languageContext} readOnly={membership.role === "viewer"} />
   <WeekWorkspace key={plan.id} initialItems={items} weekStart={plan.week_start} editable={membership.role !== "viewer"} />
  </div>
 </main>;
}
