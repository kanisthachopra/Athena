import { AppHeader } from "@/components/app-header";
import { createClient } from "@/lib/supabase/server";
import { ArrowRight, CalendarDays, Clock3, CloudSun, Leaf, Lightbulb, Settings2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

type Child = { id: string; nickname: string; birth_year: number; birth_month: number };
type TodayActivity = {
  id: string;
  personalized_title: string;
  activity_templates: {
    duration_minutes: number;
    summary: string;
    conversation_prompt: string;
    look_for: string;
    why_it_matters: string;
    safety_note: string;
  } | null;
};

function childAge(child: Child) {
  const now = new Date();
  let months = (now.getFullYear() - child.birth_year) * 12 + (now.getMonth() + 1 - child.birth_month);
  months = Math.max(0, months);
  if (months < 24) return `${months} month${months === 1 ? "" : "s"}`;
  const years = Math.floor(months / 12);
  const remainder = months % 12;
  return remainder ? `${years}y ${remainder}m` : `${years} year${years === 1 ? "" : "s"}`;
}

export const metadata = { title: "Today" };

export default async function TodayPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  if (!authData?.claims?.sub) redirect("/auth/login");

  const { data: membership } = await supabase.from("family_members").select("family_id").limit(1).maybeSingle();
  if (!membership) redirect("/onboarding");

  const [{ data: family }, { data: children }] = await Promise.all([
    supabase.from("families").select("display_name").eq("id", membership.family_id).single(),
    supabase.from("children").select("id,nickname,birth_year,birth_month").eq("family_id", membership.family_id).order("created_at"),
  ]);
  const child = children?.[0] as Child | undefined;
  if (!child) redirect("/onboarding");

  const { data: preference } = await supabase.from("family_preferences").select("family_id").eq("family_id", membership.family_id).maybeSingle();
  let activity: TodayActivity | null = null;
  if (preference) {
    const { data: activityData } = await supabase
      .from("activity_instances")
      .select("id,personalized_title,activity_templates(duration_minutes,summary,conversation_prompt,look_for,why_it_matters,safety_note)")
      .eq("child_id", child.id)
      .eq("status", "planned")
      .order("scheduled_date")
      .limit(1)
      .maybeSingle();
    activity = activityData as unknown as TodayActivity | null;
  }

  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening";
  const date = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(new Date());

  return (
    <main className="min-h-screen bg-cream pb-24 text-ink sm:pb-0">
      <AppHeader familyName={family?.display_name ?? "Your family"} />
      <div className="mx-auto max-w-7xl px-5 py-10 lg:px-10 lg:py-14">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow"><CloudSun size={15} /> {date}</p>
            <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">{greeting}. <span className="text-coral">Let&apos;s be curious.</span></h1>
            <p className="mt-3 text-ink/55">A gentle invitation for {child.nickname}, with plenty of room to follow their lead.</p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-black/5 bg-paper px-4 py-3 shadow-sm">
            <div className="grid size-10 place-items-center rounded-xl bg-[#dce4d6] font-serif font-semibold text-[#52634e]">{child.nickname.charAt(0).toUpperCase()}</div>
            <div><p className="text-sm font-semibold">{child.nickname}</p><p className="text-xs text-ink/45">{childAge(child)} old</p></div>
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.5fr_.7fr]">
          {!preference ? (
            <section className="overflow-hidden rounded-[2rem] border border-black/5 bg-paper shadow-[0_20px_60px_rgba(55,62,53,.08)]">
              <div className="bg-[#e8dcc6] p-7 sm:p-9">
                <div className="grid size-12 place-items-center rounded-2xl bg-[#fffdf8] text-[#52634e]"><Settings2 size={22} /></div>
                <p className="eyebrow mt-7">One thoughtful step</p>
                <h2 className="mt-3 max-w-xl font-serif text-3xl font-semibold tracking-tight sm:text-4xl">Shape {child.nickname}&apos;s first learning week</h2>
                <p className="mt-4 max-w-2xl text-lg leading-8 text-ink/65">Tell MIRA about your family rhythm, languages, and hopes. We&apos;ll turn them into a calm seven-day plan you can adjust anytime.</p>
              </div>
              <div className="flex flex-col gap-4 p-7 sm:flex-row sm:items-center sm:justify-between sm:p-9">
                <p className="max-w-lg text-sm leading-6 text-ink/50">About two minutes. Your answers stay private to your family.</p>
                <Link href="/setup" className="button-primary">Create our plan <ArrowRight size={17} /></Link>
              </div>
            </section>
          ) : activity ? (
          <section className="overflow-hidden rounded-[2rem] border border-black/5 bg-paper shadow-[0_20px_60px_rgba(55,62,53,.08)]">
            <div className="bg-[#e8dcc6] p-7 sm:p-9">
              <div className="flex flex-wrap items-center gap-3"><span className="rounded-full bg-[#fffdf8] px-3 py-1.5 text-xs font-semibold text-[#52634e]">Today&apos;s invitation</span><span className="flex items-center gap-1.5 text-xs text-ink/50"><Clock3 size={14} /> {activity.activity_templates?.duration_minutes} minutes</span></div>
              <h2 className="mt-7 max-w-xl font-serif text-3xl font-semibold tracking-tight sm:text-4xl">{activity.personalized_title}</h2>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-ink/65">{activity.activity_templates?.summary}</p>
            </div>
            <div className="grid gap-8 p-7 sm:grid-cols-2 sm:p-9">
              <div><p className="text-xs font-bold uppercase tracking-[.16em] text-ink/40">Try saying</p><p className="mt-3 font-serif text-xl italic leading-8">{activity.activity_templates?.conversation_prompt}</p></div>
              <div><p className="text-xs font-bold uppercase tracking-[.16em] text-ink/40">Look for</p><p className="mt-3 leading-7 text-ink/60">{activity.activity_templates?.look_for}</p></div>
            </div>
            <div className="flex flex-col gap-4 border-t border-black/5 px-7 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-9">
              <p className="flex items-center gap-2 text-sm text-ink/50"><ShieldCheck size={17} className="shrink-0 text-[#52634e]" /> {activity.activity_templates?.safety_note}</p>
              <Link href={`/activity/${activity.id}`} className="button-primary shrink-0">See the activity <ArrowRight size={17} /></Link>
            </div>
          </section>
          ) : (
            <section className="rounded-[2rem] border border-black/5 bg-paper p-8 shadow-[0_20px_60px_rgba(55,62,53,.08)] sm:p-10">
              <CalendarDays className="text-[#52634e]" size={24} />
              <h2 className="mt-6 font-serif text-3xl font-semibold">This week is complete.</h2>
              <p className="mt-3 max-w-xl leading-7 text-ink/60">You&apos;ve reached the end of the current plan. Review the week or adjust the family profile whenever you&apos;re ready.</p>
              <div className="mt-7 flex flex-wrap gap-3"><Link href="/week" className="button-primary">Review our week <ArrowRight size={17} /></Link><Link href="/setup" className="button-ghost">Adjust profile</Link></div>
            </section>
          )}

          <aside className="space-y-5">
            <div className="soft-card">
              <div className="icon-orb icon-orb-sage"><Leaf size={20} /></div>
              <p className="eyebrow mt-6">Why this today</p>
              <p className="mt-3 leading-7 text-ink/60">{activity?.activity_templates?.why_it_matters ?? `Your family profile helps MIRA choose invitations that fit ${child.nickname}'s age and your real daily rhythm.`}</p>
            </div>
            <div className="rounded-[1.75rem] bg-ink p-7 text-[#f7f3e9]">
              <Lightbulb size={22} className="text-[#e7ac92]" />
              <h3 className="mt-5 font-serif text-2xl font-semibold">Keep it light</h3>
              <p className="mt-3 leading-7 text-white/60">If interest lasts two minutes, that still counts. MIRA follows attention; it doesn&apos;t demand it.</p>
            </div>
          </aside>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-ink/40"><span className="size-1.5 rounded-full bg-[#829378]" /> Saved securely for {family?.display_name ?? "your family"}</div>
      </div>
    </main>
  );
}
