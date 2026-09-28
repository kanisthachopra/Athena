import { AppHeader } from "@/components/app-header";
import { DeleteLearningMomentForm } from "@/components/delete-learning-moment-form";
import { LearningMomentForm } from "@/components/learning-moment-form";
import { requireFamilyContext } from "@/lib/family-context";
import { CompassEvidence, interpretCompassSignal, isLearningDomain, learningDomains } from "@/lib/learning-compass";
import { ArrowRight, BookHeart, Compass, Heart, History, Info, Repeat2, Sparkles } from "lucide-react";
import Link from "next/link";

type Observation = {
  id: string;
  engagement: "low" | "medium" | "high";
  challenge_level: "easy" | "just_right" | "stretch";
  repeated: boolean;
  parent_note: string | null;
  created_at: string;
  activity_instances: {
    personalized_title: string;
    activity_templates: { domain: string } | null;
  } | null;
};

type LearningMoment = {
  id: string;
  occurred_on: string;
  domain: string;
  title: string;
  note: string;
  created_at: string;
};

const domainNames: Record<string, string> = {
  everyday: "Everyday discovery",
  language: "Language",
  movement: "Movement",
  sensory: "Sensory",
  maths: "Early maths",
  creative: "Creative",
  life_skills: "Life skills",
  nature: "Nature",
};

function readableDate(value: string) {
  const date = value.length === 10 ? new Date(`${value}T12:00:00`) : new Date(value);
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
}

function localDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const metadata = { title: "Learning journey" };

export default async function InsightsPage() {
  const { supabase, membership, family, activeChild: child } = await requireFamilyContext();

  const [observationResult, momentResult, compassResult] = await Promise.all([
    supabase
      .from("observations")
      .select("id,engagement,challenge_level,repeated,parent_note,created_at,activity_instances(personalized_title,activity_templates(domain))")
      .eq("child_id", child.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("learning_moments")
      .select("id,occurred_on,domain,title,note,created_at")
      .eq("child_id", child.id)
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.rpc("get_learning_compass", { p_child_id: child.id }),
  ]);
  if (observationResult.error) throw new Error(observationResult.error.message);
  if (momentResult.error) throw new Error(momentResult.error.message);
  if (compassResult.error) throw new Error(compassResult.error.message);

  const observations = (observationResult.data ?? []) as unknown as Observation[];
  const moments = (momentResult.data ?? []) as LearningMoment[];
  const highEngagement = observations.filter((item) => item.engagement === "high").length;
  const repeated = observations.filter((item) => item.repeated).length;
  const compass = ((compassResult.data ?? []) as CompassEvidence[])
    .filter((item) => isLearningDomain(item.domain))
    .map((item) => ({ ...item, meta: learningDomains[item.domain as keyof typeof learningDomains], interpretation: interpretCompassSignal(item) }));
  const evidencedDomains = compass.filter((item) => item.interpretation.evidenceCount > 0);
  const currentPull = [...evidencedDomains].sort((a, b) => b.interpretation.score - a.interpretation.score || b.interpretation.evidenceCount - a.interpretation.evidenceCount)[0];
  const totalSignals = compass.reduce((total, item) => total + item.interpretation.evidenceCount, 0);

  const journal = [
    ...observations.map((item) => ({ kind: "activity" as const, date: item.created_at, item })),
    ...moments.map((item) => ({ kind: "moment" as const, date: `${item.occurred_on}T12:00:00`, item })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const today = localDateString(new Date());

  return (
    <main className="min-h-screen bg-cream pb-24 text-ink sm:pb-0">
      <AppHeader familyName={family?.display_name ?? "Your family"} />
      <div className="mx-auto max-w-7xl px-5 py-10 lg:px-10 lg:py-14">
        <p className="eyebrow"><Compass size={15} /> Learning compass</p>
        <div className="mt-3 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div><h1 className="font-serif text-4xl font-semibold tracking-tight sm:text-5xl">Follow the threads in {child.nickname}&apos;s days.</h1><p className="mt-4 max-w-3xl leading-7 text-ink/55">MIRA combines planned feedback with the learning you notice in ordinary life. It looks for current interests while deliberately protecting breadth and variety.</p></div>
          <Link href="/week" className="button-primary shrink-0">See this week <ArrowRight size={17} /></Link>
        </div>

        <section className="mt-10 overflow-hidden rounded-[2rem] border border-black/5 bg-paper shadow-[0_20px_60px_rgba(55,62,53,.06)]">
          <div className="grid gap-6 bg-[#2d342e] p-7 text-[#f7f3e9] sm:p-9 lg:grid-cols-[1fr_auto] lg:items-center">
            <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#becbb3]">A 90-day view</p><h2 className="mt-3 font-serif text-3xl font-semibold">A map of attention—not a report card.</h2><p className="mt-3 max-w-2xl leading-7 text-white/60">Quiet areas are not gaps, and strong signals are not scores. The compass helps MIRA choose what to revisit and where to keep the week open.</p></div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-white/10 px-4 py-3"><p className="text-2xl font-semibold">{totalSignals}</p><p className="mt-1 text-[11px] text-white/55">signals</p></div>
              <div className="rounded-2xl bg-white/10 px-4 py-3"><p className="text-2xl font-semibold">{evidencedDomains.length}</p><p className="mt-1 text-[11px] text-white/55">areas noticed</p></div>
              <div className="rounded-2xl bg-white/10 px-4 py-3"><p className="max-w-24 truncate font-serif text-lg font-semibold">{currentPull?.meta.shortName ?? "Listening"}</p><p className="mt-1 text-[11px] text-white/55">current pull</p></div>
            </div>
          </div>
          <div className="grid gap-px bg-black/5 sm:grid-cols-2 lg:grid-cols-4">
            {compass.map((item) => (
              <article key={item.domain} className="bg-paper p-6">
                <div className="flex items-start justify-between gap-3"><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${item.meta.accent}`}>{item.interpretation.label}</span><span className="text-xs text-ink/35">{item.interpretation.evidenceCount} {item.interpretation.evidenceCount === 1 ? "signal" : "signals"}</span></div>
                <h3 className="mt-5 font-serif text-xl font-semibold">{item.meta.name}</h3>
                <p className="mt-2 text-sm leading-6 text-ink/50">{item.meta.description}</p>
                <p className="mt-5 border-t border-black/5 pt-4 text-sm leading-6 text-ink/65"><span className="font-semibold text-ink">A gentle next move:</span> {item.interpretation.nextMove}</p>
              </article>
            ))}
          </div>
          <details className="group border-t border-black/5 px-7 py-5 sm:px-9">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold"><Info size={16} className="text-[#52634e]" /> How MIRA reads these signals</summary>
            <div className="mt-4 grid gap-4 text-sm leading-6 text-ink/55 sm:grid-cols-3"><p><strong className="text-ink">Interest:</strong> high engagement and child-led repetition make a thread more likely to return.</p><p><strong className="text-ink">Fit:</strong> challenge feedback changes whether the next invitation should stay familiar or add a small variation.</p><p><strong className="text-ink">Breadth:</strong> the planner covers different learning areas before repeating a popular one.</p></div>
          </details>
        </section>

        <section className="mt-10 rounded-[2rem] border border-black/5 bg-paper p-7 shadow-[0_20px_60px_rgba(55,62,53,.06)] sm:p-9">
          <p className="eyebrow"><BookHeart size={15} /> Everyday moments</p>
          <h2 className="mt-3 font-serif text-3xl font-semibold">Notice what happened naturally.</h2>
          <p className="mt-3 max-w-2xl leading-7 text-ink/60">Learning rarely waits for the plan. Save a question, discovery, new skill, or small fascination while it is still fresh.</p>
          {membership.role === "viewer" ? (
            <p className="mt-6 rounded-xl bg-sage/15 p-4 text-sm leading-6 text-[#52634e]">Viewer access keeps the journal read-only. An owner or caregiver can add moments.</p>
          ) : (
            <LearningMomentForm childName={child.nickname} today={today} />
          )}
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="soft-card"><History size={20} className="text-[#52634e]" /><p className="mt-5 text-3xl font-semibold">{journal.length}</p><p className="mt-1 text-sm text-ink/50">moments captured</p></div>
          <div className="soft-card"><Heart size={20} className="text-[#a9503b]" /><p className="mt-5 text-3xl font-semibold">{highEngagement}</p><p className="mt-1 text-sm text-ink/50">high-interest activities</p></div>
          <div className="soft-card"><Repeat2 size={20} className="text-[#4e696c]" /><p className="mt-5 text-3xl font-semibold">{repeated}</p><p className="mt-1 text-sm text-ink/50">chose to repeat</p></div>
          <div className="soft-card"><Sparkles size={20} className="text-[#80613f]" /><p className="mt-5 font-serif text-xl font-semibold">{currentPull?.meta.shortName ?? "Still listening"}</p><p className="mt-1 text-sm text-ink/50">current area of interest</p></div>
        </section>

        <section className="mt-8 rounded-[2rem] border border-black/5 bg-paper p-7 shadow-[0_20px_60px_rgba(55,62,53,.06)] sm:p-9">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="eyebrow">Observation journal</p><h2 className="mt-3 font-serif text-3xl font-semibold">What you have noticed</h2></div><Link href="/week" className="button-ghost">View the plan</Link></div>
          {journal.length === 0 ? (
            <div className="mt-7 rounded-2xl bg-[#f3eee3] p-6"><Sparkles size={22} className="text-[#a9503b]" /><h3 className="mt-4 font-serif text-2xl font-semibold">The story starts with one observation.</h3><p className="mt-2 max-w-xl text-sm leading-6 text-ink/60">Add an everyday moment above, or share what happened after trying a planned activity.</p></div>
          ) : (
            <div className="mt-7 divide-y divide-black/5">
              {journal.map((entry) => {
                if (entry.kind === "moment") {
                  const item = entry.item;
                  return <article key={`moment-${item.id}`} className="grid gap-3 py-5 sm:grid-cols-[1fr_auto] sm:items-start"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#f3eee3] px-2.5 py-1 text-xs font-semibold text-[#80613f]">{domainNames[item.domain] ?? item.domain}</span><span className="text-xs text-ink/40">{readableDate(item.occurred_on)}</span></div><h3 className="mt-3 font-serif text-xl font-semibold">{item.title}</h3><p className="mt-2 text-sm leading-6 text-ink/60">{item.note}</p></div>{membership.role !== "viewer" && <DeleteLearningMomentForm momentId={item.id} title={item.title} />}</article>;
                }
                const item = entry.item;
                const domain = item.activity_instances?.activity_templates?.domain;
                return <article key={`activity-${item.id}`} className="grid gap-3 py-5 sm:grid-cols-[1fr_auto] sm:items-start"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#e8efe3] px-2.5 py-1 text-xs font-semibold text-[#52634e]">{domain ? domainNames[domain] ?? domain : "Activity"}</span><span className="text-xs text-ink/40">{readableDate(item.created_at)}</span></div><h3 className="mt-3 font-serif text-xl font-semibold">{item.activity_instances?.personalized_title}</h3>{item.parent_note && <p className="mt-2 text-sm leading-6 text-ink/60">“{item.parent_note}”</p>}</div><div className="text-sm text-ink/50 sm:text-right"><p className="capitalize">{item.engagement} engagement</p><p className="mt-1">{item.challenge_level === "just_right" ? "Challenge felt just right" : item.challenge_level === "easy" ? "Challenge felt easy" : "A stretching challenge"}</p>{item.repeated && <p className="mt-1 font-semibold text-[#52634e]">Repeated by choice</p>}</div></article>;
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
