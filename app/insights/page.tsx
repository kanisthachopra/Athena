import { AppHeader } from "@/components/app-header";
import { JournalMomentControls } from "@/components/journal-moment-controls";
import { JournalNoticeProvider } from "@/components/journal-notice";
import { LearningMomentForm } from "@/components/learning-moment-form";
import { requireFamilyContext } from "@/lib/family-context";
import { BookHeart, History, Layers3, Repeat2, Sparkles } from "lucide-react";
import Link from "next/link";
import { randomUUID } from "node:crypto";
import { loadFamilyCalendar, calendarLabel, shortCalendarDate, calendarDayOfInstant } from "@/lib/family-calendar";

type Observation = {
  id: string;
  engagement: "low" | "medium" | "high" | null;
  challenge_level: "easy" | "just_right" | "stretch" | null;
  repeated: boolean | null;
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
  updated_at: string;
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

export const metadata = { title: "Insights" };

export default async function InsightsPage() {
  const { supabase, membership, family, activeChild: child } = await requireFamilyContext();
  const calendar = await loadFamilyCalendar(supabase, membership.family_id);
  function readableDate(value: string) {
    return value.length === 10 ? shortCalendarDate(value) : new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: calendar.timeZone ?? "UTC" }).format(new Date(value));
  }

  const [observationResult, momentResult] = await Promise.all([
    supabase
      .from("observations")
      .select("id,engagement,challenge_level,repeated,parent_note,created_at,activity_instances!observations_instance_child_fk(personalized_title,activity_templates(domain))")
      .eq("child_id", child.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("learning_moments")
      .select("id,occurred_on,domain,title,note,created_at,updated_at")
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
    ...observations.map((item) => ({ kind: "activity" as const, date: calendarDayOfInstant(item.created_at, calendar.timeZone ?? "UTC"), item })),
    ...moments.map((item) => ({ kind: "moment" as const, date: item.occurred_on, item })),
  ].sort((a, b) => b.date.localeCompare(a.date) || Date.parse(b.item.created_at) - Date.parse(a.item.created_at));
  const today = calendar.today;

  return (
    <main className="min-h-screen bg-cream pb-24 text-ink sm:pb-0">
      <AppHeader familyName={family?.display_name ?? "Your family"} />
      <div className="mx-auto max-w-6xl px-5 py-10 lg:px-10 lg:py-14">
        <p className="text-sm font-semibold text-[#63486b]">Learning, noticed</p>
        <h1 className="mt-3 font-serif text-4xl tracking-tight sm:text-5xl">The small story of {child.nickname}&apos;s days.</h1>
        <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">A caregiver journal—not a grade, milestone checklist, or developmental assessment. These are moments you chose to record, not a complete picture of your child’s days.</p>

        <section id="notice-a-moment" className="journal-rule mt-8 scroll-mt-28 pt-8">
          <div className="rounded-xl border border-[#d4c8e5] bg-[#eee7f5] p-7 shadow-[0_14px_40px_rgba(41,50,47,.04)] sm:p-9">
          <p className="eyebrow text-[#6d5688]"><Sparkles size={15} /> Notice a moment</p>
          <h2 className="mt-3 font-serif text-3xl">Tell it in your own words.</h2>
          <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">A small moment is enough. Save what you noticed in your own words; a title and learning area are optional.</p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground"><Link href="/settings#family-calendar" className="underline underline-offset-4">{calendarLabel(calendar)}</Link></p>
          {membership.role === "viewer" ? (
            <p className="mt-6 rounded-xl bg-sage/15 p-4 text-sm leading-6 text-[#63486b]">Viewer access keeps the journal read-only. An owner or caregiver can add moments.</p>
          ) : (
            <LearningMomentForm key={child.id} childId={child.id} childName={child.nickname} today={today} initialRequestId={randomUUID()} />
          )}
          </div>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="soft-card"><History size={20} className="text-[#63486b]" /><p className="mt-5 text-3xl font-semibold">{journal.length}</p><p className="mt-1 text-sm text-ink/50">moments remembered</p></div>
          <div className="soft-card"><BookHeart size={20} className="text-[#6d5688]" /><p className="mt-5 text-3xl font-semibold">{moments.length}</p><p className="mt-1 text-sm text-ink/50">everyday discoveries</p></div>
          <div className="soft-card"><Repeat2 size={20} className="text-[#466474]" /><p className="mt-5 text-3xl font-semibold">{repeated}</p><p className="mt-1 text-sm text-ink/50">repeated by choice</p></div>
          <div className="soft-card"><Layers3 size={20} className="text-[#795d49]" /><p className="mt-5 text-3xl font-semibold">{areasNoticed}</p><p className="mt-1 text-sm text-ink/50">areas appearing naturally</p></div>
        </section>

        <section id="observation-journal" className="mt-8 scroll-mt-28 rounded-xl border border-[#ded6e1] bg-paper p-7 shadow-[0_14px_40px_rgba(41,50,47,.04)] sm:p-9">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="eyebrow">Observation journal</p><h2 className="mt-3 font-serif text-3xl font-semibold">What you have noticed</h2></div><Link href="/week" className="button-ghost">View the plan</Link></div>
          <JournalNoticeProvider key={child.id}>
          {journal.length === 0 ? (
            <div className="mt-7 rounded-2xl bg-[#f1eaf3] p-6"><Sparkles size={22} className="text-[#a9503b]" /><h3 className="mt-4 font-serif text-2xl font-semibold">The story starts with one observation.</h3><p className="mt-2 max-w-xl text-sm leading-6 text-ink/60">Add an everyday moment above, or share what happened after trying a planned activity.</p></div>
          ) : (
            <div className="mt-7 divide-y divide-black/5">
              {journal.map((entry) => {
                if (entry.kind === "moment") {
                  const item = entry.item;
                  return <article id={`moment-${item.id}`} key={`moment-${item.id}`} className="min-w-0 scroll-mt-28 py-5"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#f1eaf3] px-2.5 py-1 text-xs font-semibold text-[#795d49]">{domainNames[item.domain] ?? item.domain}</span><span className="text-sm text-muted-foreground">{readableDate(item.occurred_on)}{item.updated_at !== item.created_at && " · Edited"}</span></div><h3 className="mt-3 break-words text-xl font-semibold"><bdi>{item.title}</bdi></h3><p className="mt-2 max-w-prose whitespace-pre-wrap break-words text-base leading-7" dir="auto">{item.note}</p>{membership.role !== "viewer" && <JournalMomentControls moment={item} childId={child.id} today={today} />}</article>;
                }
                const item = entry.item;
                const domain = item.activity_instances?.activity_templates?.domain;
                return <article key={`activity-${item.id}`} className="grid gap-3 py-5 sm:grid-cols-[1fr_auto] sm:items-start"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#f1eaf3] px-2.5 py-1 text-xs font-semibold text-[#63486b]">{domain ? domainNames[domain] ?? domain : "Activity"}</span><span className="text-xs text-ink/40">{readableDate(item.created_at)}</span></div><h3 className="mt-3 font-serif text-xl font-semibold">{item.activity_instances?.personalized_title}</h3>{item.parent_note && <p className="mt-2 text-sm leading-6 text-ink/60">“{item.parent_note}”</p>}</div><div className="text-sm text-ink/50 sm:text-right"><p>{item.engagement ? `${item.engagement} engagement` : "Interest not recorded"}</p><p className="mt-1">{item.challenge_level === null ? "Challenge not recorded" : item.challenge_level === "just_right" ? "Challenge felt just right" : item.challenge_level === "easy" ? "Challenge felt easy" : "A stretching challenge"}</p>{item.repeated && <p className="mt-1 font-semibold text-[#63486b]">Repeated by choice</p>}</div></article>;
              })}
            </div>
          )}
          </JournalNoticeProvider>
        </section>
      </div>
    </main>
  );
}
