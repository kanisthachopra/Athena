import { AppHeader } from "@/components/app-header";
import { SaveActivityForm } from "@/components/save-activity-form";
import { requireFamilyContext } from "@/lib/family-context";
import { ArrowLeft, Clock3, Eye, Heart, Layers3, MessageCircle, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

type Template = {
  id: string;
  title: string;
  domain: string;
  duration_minutes: number;
  summary: string;
  instructions: string;
  conversation_prompt: string;
  look_for: string;
  why_it_matters: string;
  safety_note: string;
  materials: string[];
  setup_minutes: number;
  cleanup_level: string;
  parent_preparation: string;
  adult_role: string;
  support_ladder: string[];
  child_choices: string;
  make_easier: string;
  extend_activity: string;
  stop_signals: string;
  avoid_prompt: string;
  observation_prompts: string[];
  hazards: string[];
  supervision_level: string;
  source_note: string;
  review_status: string;
  content_version: number;
  activity_template_capabilities: { emphasis: string; core_capabilities: { name: string } | null }[];
  activity_template_tracks: { enrichment_tracks: { name: string } | null }[];
};

function ageInMonths(child: { birth_year: number; birth_month: number }) {
  const now = new Date();
  return Math.max(0, (now.getFullYear() - child.birth_year) * 12 + now.getMonth() + 1 - child.birth_month);
}

export default async function LibraryActivityPage({ params }: PageProps<"/library/[id]">) {
  const { id } = await params;
  const { supabase, membership, family, activeChild } = await requireFamilyContext();
  const months = ageInMonths(activeChild);
  const { data: preference } = await supabase.from("family_preferences").select("screen_policy,weekday_minutes,weekend_minutes").eq("family_id", membership.family_id).maybeSingle();
  const timeCeiling = Math.max(preference?.weekday_minutes ?? 15, preference?.weekend_minutes ?? 15);
  let activityQuery = supabase.from("activity_templates").select("id,title,domain,duration_minutes,summary,instructions,conversation_prompt,look_for,why_it_matters,safety_note,materials,setup_minutes,cleanup_level,parent_preparation,adult_role,support_ladder,child_choices,make_easier,extend_activity,stop_signals,avoid_prompt,observation_prompts,hazards,supervision_level,source_note,review_status,content_version,activity_template_capabilities(emphasis,core_capabilities(name)),activity_template_tracks(enrichment_tracks(name))").eq("id", id).eq("reviewed", true).neq("review_status", "retired").lte("min_age_months", months).gte("max_age_months", months).lte("duration_minutes", timeCeiling);
  if (preference?.screen_policy !== "no_preference") activityQuery = activityQuery.neq("screen_requirement", "required");
  const [{ data }, { data: savedRow }] = await Promise.all([
    activityQuery.maybeSingle(),
    supabase.from("saved_activities").select("template_id").eq("child_id", activeChild.id).eq("template_id", id).maybeSingle(),
  ]);
  if (!data) notFound();
  const activity = data as unknown as Template;

  return (
    <main className="min-h-screen bg-cream pb-24 text-ink sm:pb-0">
      <AppHeader familyName={family?.display_name ?? "Your family"} />
      <div className="mx-auto max-w-5xl px-5 py-10 lg:px-10 lg:py-14">
        <Link href="/library" className="button-ghost -ml-4 gap-2"><ArrowLeft size={17} /> Back to the library</Link>
        <div className="mt-5 grid gap-6 lg:grid-cols-[1.3fr_.7fr]">
          <article className="overflow-hidden rounded-[2rem] border border-black/5 bg-paper shadow-[0_20px_60px_rgba(55,62,53,.08)]">
            <div className="bg-[#e8dcc6] p-7 sm:p-10"><div className="flex flex-wrap items-center gap-3"><span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold capitalize text-[#52634e]">{activity.domain.replace("_", " ")}</span><span className="flex items-center gap-1 text-xs text-ink/50"><Clock3 size={13} /> {activity.duration_minutes} min · {activity.setup_minutes} min setup</span><span className="text-xs capitalize text-ink/45">{activity.cleanup_level} cleanup</span></div><p className="eyebrow mt-7">Parent Mode</p><h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">{activity.title}</h1><p className="mt-4 max-w-2xl text-lg leading-8 text-ink/65">{activity.summary}</p></div>
            <div className="space-y-8 p-7 sm:p-10">
              <section className="grid gap-4 sm:grid-cols-2"><div className="rounded-2xl bg-[#f3eee3] p-5"><p className="text-xs font-bold uppercase tracking-[.14em] text-ink/40">Before you begin</p><p className="mt-3 leading-7 text-ink/65">{activity.parent_preparation}</p></div><div className="rounded-2xl bg-[#eef3ea] p-5"><p className="text-xs font-bold uppercase tracking-[.14em] text-ink/40">Your role</p><p className="mt-3 leading-7 text-ink/65">{activity.adult_role}</p></div></section>
              <section><p className="eyebrow">How to begin</p><p className="mt-3 text-lg leading-8 text-ink/65">{activity.instructions}</p></section>
              <section className="grid gap-4 sm:grid-cols-2"><div className="rounded-2xl bg-[#f3eee3] p-5"><MessageCircle size={19} className="text-[#a9503b]" /><p className="mt-4 text-xs font-bold uppercase tracking-[.14em] text-ink/40">Try saying</p><p className="mt-2 font-serif text-lg italic">{activity.conversation_prompt}</p></div><div className="rounded-2xl bg-[#eef3ea] p-5"><Eye size={19} className="text-[#52634e]" /><p className="mt-4 text-xs font-bold uppercase tracking-[.14em] text-ink/40">Notice—not test</p><p className="mt-2 leading-6 text-ink/65">{activity.observation_prompts[0] ?? activity.look_for}</p></div></section>
              <section><p className="text-xs font-bold uppercase tracking-[.14em] text-ink/40">You&apos;ll need</p><p className="mt-2 text-ink/65">{activity.materials.join(", ") || "Nothing special"}</p></section>
              <section className="rounded-2xl border border-black/5 p-5"><div className="flex items-center gap-2"><Layers3 size={18} className="text-[#52634e]" /><h2 className="font-serif text-xl font-semibold">Support ladder</h2></div><ol className="mt-4 space-y-3">{activity.support_ladder.map((step, index) => <li key={step} className="flex gap-3 text-sm leading-6 text-ink/65"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#eef3ea] text-xs font-bold text-[#52634e]">{index + 1}</span>{step}</li>)}</ol></section>
              <section className="grid gap-4 sm:grid-cols-2"><div className="rounded-2xl bg-[#f7f3e9] p-5"><p className="text-xs font-bold uppercase tracking-[.14em] text-ink/40">Make it easier</p><p className="mt-3 text-sm leading-6 text-ink/65">{activity.make_easier}</p></div><div className="rounded-2xl bg-[#f7f3e9] p-5"><p className="text-xs font-bold uppercase tracking-[.14em] text-ink/40">If interest continues</p><p className="mt-3 text-sm leading-6 text-ink/65">{activity.extend_activity}</p></div></section>
              <section className="rounded-2xl bg-[#eef3ea] p-5"><p className="text-xs font-bold uppercase tracking-[.14em] text-[#52634e]">The child keeps control</p><p className="mt-3 leading-7 text-ink/65">{activity.child_choices}</p><p className="mt-3 text-sm leading-6 text-ink/50"><strong>Avoid:</strong> {activity.avoid_prompt}</p><p className="mt-2 text-sm leading-6 text-ink/50"><strong>Stop when:</strong> {activity.stop_signals}</p></section>
              <div className="border-t border-black/5 pt-6"><p className="flex items-start gap-2 text-sm leading-6 text-ink/50"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#52634e]" /><span><strong className="capitalize">{activity.supervision_level} supervision.</strong> {activity.safety_note}</span></p>{activity.hazards.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{activity.hazards.map((hazard) => <span key={hazard} className="rounded-full bg-[#f3eee3] px-3 py-1 text-xs text-[#80613f]">{hazard.replaceAll("-", " ")}</span>)}</div>}</div>
            </div>
          </article>
          <aside className="space-y-5"><div className="soft-card"><Heart size={20} className="text-[#a9503b]" /><p className="eyebrow mt-5">Why it matters</p><p className="mt-3 leading-7 text-ink/60">{activity.why_it_matters}</p><div className="mt-5 flex flex-wrap gap-2">{activity.activity_template_capabilities.map((item) => item.core_capabilities && <span key={item.core_capabilities.name} className="rounded-full bg-[#eef3ea] px-3 py-1 text-xs text-[#52634e]">{item.core_capabilities.name}</span>)}{activity.activity_template_tracks.map((item) => item.enrichment_tracks && <span key={item.enrichment_tracks.name} className="rounded-full bg-[#f3eee3] px-3 py-1 text-xs text-[#80613f]">{item.enrichment_tracks.name}</span>)}</div><p className="mt-3 text-xs leading-5 text-ink/40">Coverage lenses, never child scores.</p></div>{membership.role !== "viewer" && <div className="soft-card"><h2 className="font-serif text-2xl font-semibold">Keep this idea</h2><p className="mt-2 text-sm leading-6 text-ink/50">Save it for an easy return when it suits {activeChild.nickname}.</p><div className="mt-5"><SaveActivityForm templateId={activity.id} saved={Boolean(savedRow)} returnTo={`/library/${activity.id}`} /></div></div>}<div className="rounded-[1.5rem] border border-black/5 bg-paper p-5 text-xs leading-5 text-ink/40"><p className="font-semibold text-ink/55">Content status: {activity.review_status.replaceAll("_", " ")} · version {activity.content_version}</p><p className="mt-1">{activity.source_note}</p></div></aside>
        </div>
      </div>
    </main>
  );
}
