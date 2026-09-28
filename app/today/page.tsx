import { AppHeader } from "@/components/app-header";
import { requireFamilyContext } from "@/lib/family-context";
import { ArrowRight, BookHeart, CalendarDays, Clock3, CloudSun, Leaf, Lightbulb, Settings2, ShieldCheck } from "lucide-react";
import Link from "next/link";

type Child = { id: string; nickname: string; birth_year: number; birth_month: number };
type TodayOpportunity = {
  id: string;
  status: "planned" | "completed" | "skipped";
  personalized_title: string;
  personalized_instructions: string;
  selection_reason: string;
  opportunity_type: "embedded" | "intentional" | "open" | "language";
  estimated_parent_minutes: number;
  activity_templates: {
    duration_minutes: number;
    summary: string;
    conversation_prompt: string;
    look_for: string;
    why_it_matters: string;
    safety_note: string;
    observation_prompts: string[];
  } | null;
};

const opportunityNames = {
  embedded: "Everyday moment",
  intentional: "Intentional invitation",
  language: "Communication opportunity",
  open: "Protected open time",
};

function localDateValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

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
  const { supabase, membership, family, activeChild } = await requireFamilyContext();
  const child = activeChild as Child;
  const now = new Date();

  const { data: preference } = await supabase.from("family_preferences").select("family_id").eq("family_id", membership.family_id).maybeSingle();
  let opportunity: TodayOpportunity | null = null;
  if (preference) {
    const { data } = await supabase
      .from("activity_instances")
      .select("id,status,personalized_title,personalized_instructions,selection_reason,opportunity_type,estimated_parent_minutes,activity_templates(duration_minutes,summary,conversation_prompt,look_for,why_it_matters,safety_note,observation_prompts)")
      .eq("child_id", child.id)
      .eq("scheduled_date", localDateValue(now))
      .maybeSingle();
    opportunity = data as unknown as TodayOpportunity | null;
  }

  const template = opportunity?.activity_templates;
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 18 ? "Good afternoon" : "Good evening";
  const date = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(now);

  return (
    <main className="min-h-screen bg-cream pb-24 text-ink sm:pb-0">
      <AppHeader familyName={family?.display_name ?? "Your family"} />
      <div className="mx-auto max-w-7xl px-5 py-10 lg:px-10 lg:py-14">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow"><CloudSun size={15} /> {date}</p>
            <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">{greeting}. <span className="text-coral">Notice what unfolds.</span></h1>
            <p className="mt-3 text-ink/55">One possible shape for today—not a task to finish.</p>
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
                <p className="mt-4 max-w-2xl text-lg leading-8 text-ink/65">Tell MIRA about your family rhythm, languages, and hopes. We&apos;ll create a light portfolio with room for ordinary life.</p>
              </div>
              <div className="flex flex-col gap-4 p-7 sm:flex-row sm:items-center sm:justify-between sm:p-9">
                <p className="max-w-lg text-sm leading-6 text-ink/50">About two minutes. Your answers stay private to your family.</p>
                {membership.role === "viewer" ? <p className="rounded-full bg-sage/15 px-4 py-2 text-sm font-semibold text-[#52634e]">Waiting for a caregiver to create the plan</p> : <Link href="/setup" className="button-primary">Create our plan <ArrowRight size={17} /></Link>}
              </div>
            </section>
          ) : opportunity?.opportunity_type === "open" ? (
            <section className="overflow-hidden rounded-[2rem] border border-black/5 bg-paper shadow-[0_20px_60px_rgba(55,62,53,.08)]">
              <div className="bg-[#dfe8d9] p-7 sm:p-10">
                <span className="rounded-full bg-paper px-3 py-1.5 text-xs font-semibold text-[#52634e]">Protected open time</span>
                <h2 className="mt-7 font-serif text-4xl font-semibold tracking-tight">Nothing needs to be prepared.</h2>
                <p className="mt-4 max-w-2xl text-lg leading-8 text-ink/65">{opportunity.personalized_instructions}</p>
              </div>
              <div className="p-7 sm:p-9"><p className="eyebrow">Why it is here</p><p className="mt-3 leading-7 text-ink/60">{opportunity.selection_reason}</p></div>
            </section>
          ) : opportunity && template ? (
            <section className="overflow-hidden rounded-[2rem] border border-black/5 bg-paper shadow-[0_20px_60px_rgba(55,62,53,.08)]">
              <div className="bg-[#e8dcc6] p-7 sm:p-9">
                <div className="flex flex-wrap items-center gap-3"><span className="rounded-full bg-[#fffdf8] px-3 py-1.5 text-xs font-semibold text-[#52634e]">{opportunityNames[opportunity.opportunity_type]}</span><span className="flex items-center gap-1.5 text-xs text-ink/50"><Clock3 size={14} /> {template.duration_minutes} min child time · {opportunity.estimated_parent_minutes} min setup</span></div>
                <h2 className="mt-7 max-w-xl font-serif text-3xl font-semibold tracking-tight sm:text-4xl">{opportunity.personalized_title}</h2>
                <p className="mt-4 max-w-2xl text-lg leading-8 text-ink/65">{template.summary}</p>
              </div>
              <div className="grid gap-8 p-7 sm:grid-cols-2 sm:p-9">
                <div><p className="text-xs font-bold uppercase tracking-[.16em] text-ink/40">Try saying</p><p className="mt-3 font-serif text-xl italic leading-8">{template.conversation_prompt}</p></div>
                <div><p className="text-xs font-bold uppercase tracking-[.16em] text-ink/40">Notice—not test</p><p className="mt-3 leading-7 text-ink/60">{template.observation_prompts[0] ?? template.look_for}</p></div>
              </div>
              <div className="flex flex-col gap-4 border-t border-black/5 px-7 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-9">
                <p className="flex items-start gap-2 text-sm leading-6 text-ink/50"><ShieldCheck size={17} className="mt-0.5 shrink-0 text-[#52634e]" /> {template.safety_note}</p>
                <Link href={`/activity/${opportunity.id}`} className="button-primary shrink-0">Open Parent Mode <ArrowRight size={17} /></Link>
              </div>
            </section>
          ) : (
            <section className="rounded-[2rem] border border-black/5 bg-paper p-8 shadow-[0_20px_60px_rgba(55,62,53,.08)] sm:p-10">
              <CalendarDays className="text-[#52634e]" size={24} />
              <h2 className="mt-6 font-serif text-3xl font-semibold">Nothing is planned for today.</h2>
              <p className="mt-3 max-w-xl leading-7 text-ink/60">That is a valid day. Rest, family routines, conversation, and self-directed play do not need to be turned into assignments.</p>
              <div className="mt-7 flex flex-wrap gap-3"><Link href="/week" className="button-primary">See the whole week <ArrowRight size={17} /></Link><Link href="/insights" className="button-ghost">Record something noticed</Link></div>
            </section>
          )}

          <aside className="space-y-5">
            <div className="soft-card">
              <div className="icon-orb icon-orb-sage"><Leaf size={20} /></div>
              <p className="eyebrow mt-6">Why this fits</p>
              <p className="mt-3 leading-7 text-ink/60">{opportunity?.selection_reason ?? `The plan protects ${child.nickname}'s autonomy and your family’s actual capacity.`}</p>
            </div>
            <div className="rounded-[1.75rem] bg-ink p-7 text-[#f7f3e9]">
              <Lightbulb size={22} className="text-[#e7ac92]" />
              <h3 className="mt-5 font-serif text-2xl font-semibold">Time is a ceiling</h3>
              <p className="mt-3 leading-7 text-white/60">Stop while it still feels good. Two engaged minutes can be enough, and choosing not to join is useful information.</p>
            </div>
            <Link href="/insights" className="flex items-center gap-3 rounded-[1.5rem] border border-black/5 bg-paper p-5 text-sm font-semibold shadow-sm"><BookHeart size={19} className="text-[#a9503b]" /> Add an everyday observation <ArrowRight size={16} className="ml-auto" /></Link>
          </aside>
        </div>
      </div>
    </main>
  );
}
