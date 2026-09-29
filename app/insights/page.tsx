import { AppHeader } from "@/components/app-header";
import { DeleteLearningMomentForm } from "@/components/delete-learning-moment-form";
import { LearningMomentForm } from "@/components/learning-moment-form";
import { requireFamilyContext } from "@/lib/family-context";
import { BookHeart, History, Layers3, Repeat2, Sparkles } from "lucide-react";
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

export const metadata = { title: "Journey" };

export default async function InsightsPage() {
  const { supabase, membership, family, activeChild: child } = await requireFamilyContext();

  const [observationResult, momentResult] = await Promise.all([
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
  ]);
  if (observationResult.error) throw new Error(observationResult.error.message);
  if (momentResult.error) throw new Error(momentResult.error.message);

  const observations = (observationResult.data ?? []) as unknown as Observation[];
  const moments = (momentResult.data ?? []) as LearningMoment[];
  const repeated = observations.filter((item) => item.repeated).length;
  const areasNoticed = new Set([
    ...moments.map((item) => item.domain),
    ...observations.map((item) => item.activity_instances?.activity_templates?.domain).filter(Boolean),
  ]).size;

  const journal = [
    ...observations.map((item) => ({ kind: "activity" as const, date: item.created_at, item })),
    ...moments.map((item) => ({ kind: "moment" as const, date: `${item.occurred_on}T12:00:00`, item })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const today = localDateString(new Date());

  return (
    <main className="min-h-screen bg-cream pb-24 text-ink sm:pb-0">
      <AppHeader familyName={family?.display_name ?? "Your family"} />
      <div className="mx-auto max-w-6xl px-5 py-10 lg:px-10 lg:py-14">
        <p className="text-sm font-semibold text-[#386357]">Learning, noticed</p>
        <h1 className="mt-3 font-serif text-4xl tracking-tight sm:text-5xl">The small story of {child.nickname}&apos;s days.</h1>
        <p className="mt-4 max-w-2xl leading-7 text-ink/55">A caregiver journal—not a grade, milestone checklist, or developmental assessment. MIRA uses confirmed moments gently to shape variety and relevance.</p>

        <section id="notice-a-moment" className="journal-rule mt-8 scroll-mt-28 pt-8">
          <div className="rounded-[1.5rem] border border-[#d4c8e5] bg-[#eee7f5] p-7 shadow-[0_14px_40px_rgba(41,50,47,.04)] sm:p-9">
          <p className="eyebrow text-[#6d5688]"><Sparkles size={15} /> Notice a moment</p>
          <h2 className="mt-3 font-serif text-3xl">Tell it in your own words.</h2>
          <p className="mt-3 max-w-2xl leading-7 text-ink/60">Learning rarely waits for the plan. MIRA can organize your note, but you inspect and edit every word before it enters the journal.</p>
          {membership.role === "viewer" ? (
            <p className="mt-6 rounded-xl bg-sage/15 p-4 text-sm leading-6 text-[#52634e]">Viewer access keeps the journal read-only. An owner or caregiver can add moments.</p>
          ) : (
            <LearningMomentForm childName={child.nickname} today={today} />
          )}
          </div>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="soft-card"><History size={20} className="text-[#386357]" /><p className="mt-5 text-3xl font-semibold">{journal.length}</p><p className="mt-1 text-sm text-ink/50">moments remembered</p></div>
          <div className="soft-card"><BookHeart size={20} className="text-[#6d5688]" /><p className="mt-5 text-3xl font-semibold">{moments.length}</p><p className="mt-1 text-sm text-ink/50">everyday discoveries</p></div>
          <div className="soft-card"><Repeat2 size={20} className="text-[#466474]" /><p className="mt-5 text-3xl font-semibold">{repeated}</p><p className="mt-1 text-sm text-ink/50">repeated by choice</p></div>
          <div className="soft-card"><Layers3 size={20} className="text-[#80613f]" /><p className="mt-5 text-3xl font-semibold">{areasNoticed}</p><p className="mt-1 text-sm text-ink/50">areas appearing naturally</p></div>
        </section>

        <section className="mt-8 rounded-[1.5rem] border border-[#bfd9d8] bg-paper p-7 shadow-[0_14px_40px_rgba(41,50,47,.04)] sm:p-9">
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
