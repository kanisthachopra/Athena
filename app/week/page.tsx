import { AppHeader } from "@/components/app-header";
import { createClient } from "@/lib/supabase/server";
import { ArrowRight, CalendarDays, Check, Clock3, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

type PlanItem = {
  id: string;
  scheduled_date: string;
  status: "planned" | "completed" | "skipped";
  personalized_title: string;
  activity_templates: { domain: string; duration_minutes: number; summary: string } | null;
};

const domainNames: Record<string, string> = { language: "Language", movement: "Movement", sensory: "Sensory", maths: "Early maths", creative: "Creative", life_skills: "Life skills", nature: "Nature" };

export const metadata = { title: "This week" };

export default async function WeekPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  if (!authData?.claims?.sub) redirect("/auth/login");
  const { data: membership } = await supabase.from("family_members").select("family_id").limit(1).maybeSingle();
  if (!membership) redirect("/onboarding");
  const [{ data: family }, { data: child }, { data: preference }] = await Promise.all([
    supabase.from("families").select("display_name").eq("id", membership.family_id).single(),
    supabase.from("children").select("id,nickname").eq("family_id", membership.family_id).limit(1).single(),
    supabase.from("family_preferences").select("family_id").eq("family_id", membership.family_id).maybeSingle(),
  ]);
  if (!child) redirect("/onboarding");
  if (!preference) redirect("/setup");

  const { data: plan } = await supabase.from("plans").select("id,week_start").eq("child_id", child.id).eq("status", "active").order("week_start", { ascending: false }).limit(1).maybeSingle();
  if (!plan) redirect("/setup");
  const { data } = await supabase.from("activity_instances").select("id,scheduled_date,status,personalized_title,activity_templates(domain,duration_minutes,summary)").eq("plan_id", plan.id).order("scheduled_date");
  const items = (data ?? []) as unknown as PlanItem[];

  return (
    <main className="min-h-screen bg-cream text-ink">
      <AppHeader familyName={family?.display_name ?? "Your family"} />
      <div className="mx-auto max-w-6xl px-5 py-10 lg:px-10 lg:py-14">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div><p className="eyebrow"><CalendarDays size={15} /> Week of {new Intl.DateTimeFormat("en", { month: "long", day: "numeric" }).format(new Date(`${plan.week_start}T12:00:00`))}</p><h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">A gentle week for {child.nickname}.</h1><p className="mt-3 text-ink/55">A week of reviewed invitations, chosen by age and your family preferences.</p></div>
          <Link href="/setup" className="button-ghost gap-2"><SlidersHorizontal size={17} /> Adjust the plan</Link>
        </div>
        <div className="mt-10 grid gap-4">
          {items.map((item, index) => {
            const template = item.activity_templates;
            const day = new Intl.DateTimeFormat("en", { weekday: "long", month: "short", day: "numeric" }).format(new Date(`${item.scheduled_date}T12:00:00`));
            return (
              <Link href={`/activity/${item.id}`} key={item.id} className="group grid gap-5 rounded-[1.5rem] border border-black/5 bg-paper p-5 shadow-[0_10px_30px_rgba(55,62,53,.05)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(55,62,53,.09)] sm:grid-cols-[90px_1fr_auto] sm:items-center sm:p-6">
                <div><p className="text-xs font-bold uppercase tracking-[.14em] text-ink/40">Day {index + 1}</p><p className="mt-1 text-sm font-semibold">{day}</p></div>
                <div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#e8efe3] px-2.5 py-1 text-xs font-semibold text-[#52634e]">{domainNames[template?.domain ?? ""] ?? template?.domain}</span><span className="flex items-center gap-1 text-xs text-ink/40"><Clock3 size={13} /> {template?.duration_minutes} min</span>{item.status === "completed" && <span className="flex items-center gap-1 text-xs font-semibold text-[#52634e]"><Check size={13} /> Tried</span>}</div><h2 className="mt-3 font-serif text-2xl font-semibold">{item.personalized_title}</h2><p className="mt-1 line-clamp-2 text-sm leading-6 text-ink/55">{template?.summary}</p></div>
                <ArrowRight className="hidden text-ink/30 transition group-hover:translate-x-1 sm:block" size={20} />
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
