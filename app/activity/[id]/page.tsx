import { AppHeader } from "@/components/app-header";
import { FeedbackForm } from "@/components/feedback-form";
import { requireFamilyContext } from "@/lib/family-context";
import { ArrowLeft, Clock3, Eye, Heart, Layers3, MessageCircle, RefreshCw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { skipActivity } from "../actions";

type Activity = {
  id: string;
  status: string;
  personalized_title: string;
  personalized_instructions: string;
  activity_templates: {
    domain: string;
    duration_minutes: number;
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
  } | null;
};

type Observation = {
  engagement: "low" | "medium" | "high";
  challenge_level: "easy" | "just_right" | "stretch";
  repeated: boolean;
  parent_note: string | null;
};

const engagementLabels = { low: "Not today", medium: "Some interest", high: "Loved it" };
const challengeLabels = { easy: "Very easy", just_right: "Just right", stretch: "A stretch" };

export default async function ActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, family, membership } = await requireFamilyContext();
  const [{ data }, { data: observationData }] = await Promise.all([
    supabase.from("activity_instances").select("id,status,personalized_title,personalized_instructions,activity_templates(domain,duration_minutes,conversation_prompt,look_for,why_it_matters,safety_note,materials,setup_minutes,cleanup_level,parent_preparation,adult_role,support_ladder,child_choices,make_easier,extend_activity,stop_signals,avoid_prompt,observation_prompts,hazards,supervision_level,source_note,review_status,content_version,activity_template_capabilities(emphasis,core_capabilities(name)),activity_template_tracks(enrichment_tracks(name)))").eq("id", id).maybeSingle(),
    supabase.from("observations").select("engagement,challenge_level,repeated,parent_note").eq("activity_instance_id", id).maybeSingle(),
  ]);
  if (!data) notFound();
  const activity = data as unknown as Activity;
  const observation = observationData as Observation | null;
  const template = activity.activity_templates;
  if (!template) notFound();

  return (
    <main className="min-h-screen bg-cream pb-24 text-ink sm:pb-0">
      <AppHeader familyName={family?.display_name ?? "Your family"} />
      <div className="mx-auto max-w-5xl px-5 py-10 lg:px-10 lg:py-14">
        <Link href="/week" className="button-ghost -ml-4 gap-2"><ArrowLeft size={17} /> Back to the week</Link>
        <div className="mt-5 grid gap-6 lg:grid-cols-[1.3fr_.7fr]">
          <article className="overflow-hidden rounded-[2rem] border border-black/5 bg-paper shadow-[0_20px_60px_rgba(55,62,53,.08)]">
            <div className="bg-[#e8dcc6] p-7 sm:p-10"><div className="flex flex-wrap items-center gap-3"><span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold capitalize text-[#52634e]">{template.domain.replace("_", " ")}</span><span className="flex items-center gap-1 text-xs text-ink/50"><Clock3 size={13} /> {template.duration_minutes} min · {template.setup_minutes} min setup</span><span className="text-xs capitalize text-ink/45">{template.cleanup_level} cleanup</span></div><p className="eyebrow mt-7">Parent Mode</p><h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">{activity.personalized_title}</h1></div>
            <div className="space-y-8 p-7 sm:p-10">
              <section className="grid gap-4 sm:grid-cols-2"><div className="rounded-2xl bg-[#f3eee3] p-5"><p className="text-xs font-bold uppercase tracking-[.14em] text-ink/40">Before you begin</p><p className="mt-3 leading-7 text-ink/65">{template.parent_preparation}</p></div><div className="rounded-2xl bg-[#eef3ea] p-5"><p className="text-xs font-bold uppercase tracking-[.14em] text-ink/40">Your role</p><p className="mt-3 leading-7 text-ink/65">{template.adult_role}</p></div></section>
              <section><p className="eyebrow">How to begin</p><p className="mt-3 text-lg leading-8 text-ink/65">{activity.personalized_instructions}</p></section>
              <section className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-[#f3eee3] p-5"><MessageCircle size={19} className="text-[#a9503b]" /><p className="mt-4 text-xs font-bold uppercase tracking-[.14em] text-ink/40">Try saying</p><p className="mt-2 font-serif text-lg italic">{template.conversation_prompt}</p></div>
                <div className="rounded-2xl bg-[#eef3ea] p-5"><Eye size={19} className="text-[#52634e]" /><p className="mt-4 text-xs font-bold uppercase tracking-[.14em] text-ink/40">Notice—not test</p><p className="mt-2 leading-6 text-ink/65">{template.observation_prompts[0] ?? template.look_for}</p></div>
              </section>
              <section><p className="text-xs font-bold uppercase tracking-[.14em] text-ink/40">You&apos;ll need</p><p className="mt-2 text-ink/65">{template.materials.join(", ") || "Nothing special"}</p></section>
              <section className="rounded-2xl border border-black/5 p-5"><div className="flex items-center gap-2"><Layers3 size={18} className="text-[#52634e]" /><h2 className="font-serif text-xl font-semibold">Support ladder</h2></div><ol className="mt-4 space-y-3">{template.support_ladder.map((step, index) => <li key={step} className="flex gap-3 text-sm leading-6 text-ink/65"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#eef3ea] text-xs font-bold text-[#52634e]">{index + 1}</span>{step}</li>)}</ol></section>
              <section className="grid gap-4 sm:grid-cols-2"><div className="rounded-2xl bg-[#f7f3e9] p-5"><p className="text-xs font-bold uppercase tracking-[.14em] text-ink/40">Make it easier</p><p className="mt-3 text-sm leading-6 text-ink/65">{template.make_easier}</p></div><div className="rounded-2xl bg-[#f7f3e9] p-5"><p className="text-xs font-bold uppercase tracking-[.14em] text-ink/40">If interest continues</p><p className="mt-3 text-sm leading-6 text-ink/65">{template.extend_activity}</p></div></section>
              <section className="rounded-2xl bg-[#eef3ea] p-5"><p className="text-xs font-bold uppercase tracking-[.14em] text-[#52634e]">The child keeps control</p><p className="mt-3 leading-7 text-ink/65">{template.child_choices}</p><p className="mt-3 text-sm leading-6 text-ink/50"><strong>Avoid:</strong> {template.avoid_prompt}</p><p className="mt-2 text-sm leading-6 text-ink/50"><strong>Stop when:</strong> {template.stop_signals}</p></section>
              <div className="border-t border-black/5 pt-6"><p className="flex items-start gap-2 text-sm leading-6 text-ink/50"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#52634e]" /><span><strong className="capitalize">{template.supervision_level} supervision.</strong> {template.safety_note}</span></p>{template.hazards.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{template.hazards.map((hazard) => <span key={hazard} className="rounded-full bg-[#f3eee3] px-3 py-1 text-xs text-[#80613f]">{hazard.replaceAll("-", " ")}</span>)}</div>}</div>
            </div>
          </article>
          <aside className="space-y-5">
            <div className="soft-card"><Heart size={20} className="text-[#a9503b]" /><p className="eyebrow mt-5">Why it matters</p><p className="mt-3 leading-7 text-ink/60">{template.why_it_matters}</p><div className="mt-5 flex flex-wrap gap-2">{template.activity_template_capabilities.map((item) => item.core_capabilities && <span key={item.core_capabilities.name} className="rounded-full bg-[#eef3ea] px-3 py-1 text-xs text-[#52634e]">{item.core_capabilities.name}</span>)}{template.activity_template_tracks.map((item) => item.enrichment_tracks && <span key={item.enrichment_tracks.name} className="rounded-full bg-[#f3eee3] px-3 py-1 text-xs text-[#80613f]">{item.enrichment_tracks.name}</span>)}</div><p className="mt-3 text-xs leading-5 text-ink/40">These are coverage lenses, not scores or targets for your child.</p></div>
            <div className="soft-card"><h2 className="font-serif text-2xl font-semibold">What happened?</h2><p className="mt-2 text-sm leading-6 text-ink/50">Quick feedback helps the next plan fit better. No judgement, no scores.</p><div className="mt-6">{
              activity.status === "skipped" ? <p className="rounded-xl bg-[#f3eee3] p-4 text-sm font-semibold text-[#80613f]">Skipped without penalty. Family life comes first.</p>
                : membership.role === "viewer" ? activity.status === "completed" && observation ? <div className="space-y-4 rounded-xl bg-[#eef3ea] p-4 text-sm text-[#52634e]"><p className="font-semibold">Saved observation</p><div className="flex flex-wrap gap-2"><span className="rounded-full bg-white/70 px-3 py-1">{engagementLabels[observation.engagement]}</span><span className="rounded-full bg-white/70 px-3 py-1">{challengeLabels[observation.challenge_level]}</span>{observation.repeated && <span className="rounded-full bg-white/70 px-3 py-1">Repeated it</span>}</div>{observation.parent_note && <p className="leading-6 text-ink/60">{observation.parent_note}</p>}<p className="text-xs text-ink/40">Viewer access is read-only.</p></div> : <p className="rounded-xl bg-[#eef3ea] p-4 text-sm leading-6 text-[#52634e]">Viewer access is read-only. A caregiver can add an observation after trying this activity.</p>
                  : activity.status === "completed" ? <div><p className="mb-5 rounded-xl bg-[#eef3ea] p-4 text-sm font-semibold text-[#52634e]">Observation saved. You can correct it anytime.</p><FeedbackForm instanceId={activity.id} initial={observation} returnTo={`/activity/${activity.id}`} /></div>
                    : <FeedbackForm instanceId={activity.id} />
            }</div></div>
            {membership.role !== "viewer" && activity.status === "planned" && <div className="rounded-[1.75rem] border border-black/5 bg-paper p-6"><p className="text-sm leading-6 text-ink/50">Not the right fit today?</p><div className="mt-4 flex flex-wrap gap-2"><Link href={`/library?replace=${activity.id}`} className="button-ghost gap-2"><RefreshCw size={16} /> Choose another</Link><form action={skipActivity}><input type="hidden" name="instanceId" value={activity.id} /><button type="submit" className="button-ghost text-ink/50">Skip without penalty</button></form></div></div>}
            <div className="rounded-[1.5rem] border border-black/5 bg-paper p-5 text-xs leading-5 text-ink/40"><p className="font-semibold text-ink/55">Content status: {template.review_status.replaceAll("_", " ")} · version {template.content_version}</p><p className="mt-1">{template.source_note}</p></div>
          </aside>
        </div>
      </div>
    </main>
  );
}
