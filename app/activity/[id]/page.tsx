import { ActivityPreparation } from "@/components/activity-preparation";
import { AppHeader } from "@/components/app-header";
import { FeedbackForm } from "@/components/feedback-form";
import { challengeLabels, engagementLabels, type ActivityObservation } from "@/lib/activity-observation";
import { requireFamilyContext } from "@/lib/family-context";
import { activityUseMessage, savedActivityContent } from "@/lib/activity-content";
import Link from "next/link";
import { notFound } from "next/navigation";
import { skipActivity } from "../actions";

type Activity = {
  id: string;
  template_id: string | null;
  status: string;
  selection_reason: string;
  personalized_title: string;
  personalized_instructions: string;
  content_snapshot?: unknown;
};

type Observation = ActivityObservation;

export default async function ActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, family, membership } = await requireFamilyContext();
  const [{ data, error: activityError }, { data: observationData, error: observationError }] = await Promise.all([
    supabase.from("activity_instances").select("*").eq("id", id).maybeSingle(),
    supabase.from("observations").select("engagement,challenge_level,repeated,parent_note,revision").eq("activity_instance_id", id).maybeSingle(),
  ]);
  if (activityError || observationError) throw new Error("Could not load this activity. Please try again.");
  if (!data) notFound();
  const activity = data as unknown as Activity;
  const observation = observationData as Observation | null;
  const content = savedActivityContent(activity.content_snapshot, activity.template_id);
  const template = content.template;
  const useCheck = activity.status === "planned" && content.state === "saved"
    ? await supabase.rpc("get_activity_use_check", { p_instance_id: id }) : null;
  const useNotice = content.state === "legacy" ? activityUseMessage("MIRA_LEGACY_CONTENT_VERSION_UNKNOWN")
    : content.state === "invalid" ? "The saved content version could not be read. Original activity text and observations remain available; this is not a current recommendation."
    : useCheck ? activityUseMessage(useCheck.data, Boolean(useCheck.error)) : null;

  return <main className="min-h-screen"><AppHeader familyName={family?.display_name ?? "Your family"} />
    <div className="workspace-page preparation-page">
      <div className="preparation-toolbar"><Link href="/week" className="button-ghost">Back to Week</Link><a href="#activity-reflection" className="button-ghost">Record a moment</a></div>
      {useNotice && <div className="spatial-notice" role="status"><p>{useNotice}</p>{typeof useCheck?.data === "string" && ["MIRA_CONTEXT_REQUIRED", "MIRA_CONTEXT_NOT_CONFIRMED"].includes(useCheck.data) && <Link className="button-ghost" href="/library/context">Check family context</Link>}</div>}
      {template ? <ActivityPreparation title={activity.personalized_title} instructions={activity.personalized_instructions} template={template} selectionReason={activity.selection_reason} savedVersion />
        : <article><h1 className="workspace-heading">{activity.personalized_title}</h1><p className="workspace-description">{content.state === "open" ? "An open day, not an activity to complete." : "Saved activity record"}</p><details className="mt-6"><summary>{content.state === "open" ? "About this open day" : "Read the original saved text"}</summary><p className="mt-4 whitespace-pre-wrap leading-7">{activity.personalized_instructions}</p>{activity.selection_reason && <p className="mt-4 leading-7">Saved planning note: {activity.selection_reason}</p>}</details></article>}
      <section id="activity-reflection" className="preparation-reflection"><h2>What happened?</h2><p className="workspace-description">Keep a note if it would be useful. You can leave this blank.</p><div className="mt-6">{
              activity.status === "skipped" ? <p className="rounded-xl bg-[#f1eaf3] p-4 text-sm font-semibold text-[#795d49]">Not offered. You can leave this day open.</p>
                : membership.role === "viewer" ? activity.status === "completed" && observation ? <div className="space-y-4 rounded-xl bg-[#f1eaf3] p-4 text-sm text-[#63486b]"><p className="font-semibold">Saved observation</p><div className="flex flex-wrap gap-2"><span className="rounded-full bg-white/70 px-3 py-1">{observation.engagement ? engagementLabels[observation.engagement] : "Interest not recorded"}</span><span className="rounded-full bg-white/70 px-3 py-1">{observation.challenge_level ? challengeLabels[observation.challenge_level] : "Challenge not recorded"}</span>{observation.repeated && <span className="rounded-full bg-white/70 px-3 py-1">Repeated it</span>}</div>{observation.parent_note && <p className="leading-6 text-ink/60">{observation.parent_note}</p>}<p className="text-xs text-ink/40">Viewer access is read-only.</p></div> : <p className="rounded-xl bg-[#f1eaf3] p-4 text-sm leading-6 text-[#63486b]">Viewer access is read-only. A caregiver can add an observation after trying this activity.</p>
                  : activity.status === "completed" ? <div><p className="mb-5 rounded-xl bg-[#f1eaf3] p-4 text-sm font-semibold text-[#63486b]">Observation saved. You can correct it anytime.</p><FeedbackForm templateId={activity.template_id} instanceId={activity.id} initial={observation} returnTo={`/activity/${activity.id}`} /></div>
                    : <FeedbackForm templateId={activity.template_id} instanceId={activity.id} />

      }</div></section>
      {membership.role !== "viewer" && activity.status === "planned" && activity.template_id !== null && <div className="preparation-footer"><Link href={`/library?replace=${activity.id}`} className="button-ghost">Choose something else</Link><form action={skipActivity}><input type="hidden" name="instanceId" value={activity.id} /><button type="submit" className="button-ghost">Leave this day open</button></form></div>}
    </div>
  </main>;
}
