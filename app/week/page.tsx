import { AppHeader } from "@/components/app-header";
import { requireFamilyContext } from "@/lib/family-context";
import { ArrowRight, CalendarDays, Check, Clock3, RefreshCw, SlidersHorizontal, Sparkles } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { buildNextWeek } from "./actions";

type PlanItem = {
  id: string;
  scheduled_date: string;
  status: "planned" | "completed" | "skipped";
  personalized_title: string;
  selection_reason: string;
  activity_templates: { domain: string; duration_minutes: number; summary: string } | null;
};

type Plan = { id: string; week_start: string; adaptation_summary: string; generation_method: string };

const domainNames: Record<string, string> = { language: "Language", movement: "Movement", sensory: "Sensory", maths: "Early maths", creative: "Creative", life_skills: "Life skills", nature: "Nature" };

export const metadata = { title: "This week" };

export default async function WeekPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const requestedPlan = (await searchParams).plan;
  const { supabase, membership, family, activeChild: child } = await requireFamilyContext();
  const { data: preference } = await supabase.from("family_preferences").select("family_id").eq("family_id", membership.family_id).maybeSingle();
  if (!preference) redirect("/setup");

  const { data: planData } = await supabase.from("plans").select("id,week_start,adaptation_summary,generation_method").eq("child_id", child.id).eq("status", "active").order("week_start", { ascending: false }).limit(6);
  const plans = (planData ?? []) as Plan[];
  const plan = (requestedPlan ? plans.find((item) => item.id === requestedPlan) : plans[0]) ?? plans[0];
  if (!plan) redirect("/setup");
  const { data } = await supabase.from("activity_instances").select("id,scheduled_date,status,personalized_title,selection_reason,activity_templates(domain,duration_minutes,summary)").eq("plan_id", plan.id).order("scheduled_date");
  const items = (data ?? []) as unknown as PlanItem[];

  return (
    <main className="min-h-screen bg-cream pb-24 text-ink sm:pb-0">
      <AppHeader familyName={family?.display_name ?? "Your family"} />
      <div className="mx-auto max-w-6xl px-5 py-10 lg:px-10 lg:py-14">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div><p className="eyebrow"><CalendarDays size={15} /> Week of {new Intl.DateTimeFormat("en", { month: "long", day: "numeric" }).format(new Date(`${plan.week_start}T12:00:00`))}</p><h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">A gentle week for {child.nickname}.</h1><p className="mt-3 text-ink/55">A week of reviewed invitations, chosen by age and your family preferences.</p></div>
          <div className="flex flex-wrap gap-2"><Link href="/setup" className="button-ghost gap-2"><SlidersHorizontal size={17} /> Adjust preferences</Link><form action={buildNextWeek}><button className="button-primary" type="submit"><Sparkles size={17} /> Plan next week</button></form></div>
        </div>
        {plans.length > 1 && <nav className="mt-7 flex flex-wrap gap-2" aria-label="Choose a weekly plan">{plans.map((week) => <Link key={week.id} href={`/week?plan=${week.id}`} className={`rounded-full px-4 py-2 text-sm font-semibold ${week.id === plan.id ? "bg-ink text-white" : "bg-paper text-ink/60 hover:bg-[#ece6d8]"}`}>{new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(`${week.week_start}T12:00:00`))}</Link>)}</nav>}
        <div className="mt-7 flex items-start gap-3 rounded-2xl bg-[#eef3ea] px-5 py-4 text-sm leading-6 text-[#52634e]"><Sparkles className="mt-0.5 shrink-0" size={17} /><p>{plan.adaptation_summary}</p></div>
        <div className="mt-10 grid gap-4">
          {items.map((item, index) => {
            const template = item.activity_templates;
            const day = new Intl.DateTimeFormat("en", { weekday: "long", month: "short", day: "numeric" }).format(new Date(`${item.scheduled_date}T12:00:00`));
            return (
              <article key={item.id} className="grid gap-5 rounded-[1.5rem] border border-black/5 bg-paper p-5 shadow-[0_10px_30px_rgba(55,62,53,.05)] sm:grid-cols-[90px_1fr_auto] sm:items-center sm:p-6">
                <div><p className="text-xs font-bold uppercase tracking-[.14em] text-ink/40">Day {index + 1}</p><p className="mt-1 text-sm font-semibold">{day}</p></div>
                <div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#e8efe3] px-2.5 py-1 text-xs font-semibold text-[#52634e]">{domainNames[template?.domain ?? ""] ?? template?.domain}</span><span className="flex items-center gap-1 text-xs text-ink/40"><Clock3 size={13} /> {template?.duration_minutes} min</span>{item.status === "completed" && <span className="flex items-center gap-1 text-xs font-semibold text-[#52634e]"><Check size={13} /> Tried</span>}{item.status === "skipped" && <span className="text-xs font-semibold text-[#80613f]">Skipped</span>}</div><Link href={`/activity/${item.id}`} className="group inline-flex items-center gap-2"><h2 className="mt-3 font-serif text-2xl font-semibold group-hover:underline">{item.personalized_title}</h2><ArrowRight className="mt-3 text-ink/30 transition group-hover:translate-x-1" size={18} /></Link><p className="mt-1 line-clamp-2 text-sm leading-6 text-ink/55">{template?.summary}</p>{plan.generation_method === "adaptive_deterministic_v1" && <p className="mt-2 text-xs font-semibold text-[#697565]">Why this fits: {item.selection_reason}</p>}</div>
                <div className="flex gap-2 sm:flex-col sm:items-end"><Link href={`/activity/${item.id}`} className="button-ghost px-3">Open</Link>{item.status === "planned" && <Link href={`/library?replace=${item.id}`} className="button-ghost gap-1 px-3 text-ink/50"><RefreshCw size={14} /> Swap</Link>}</div>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
