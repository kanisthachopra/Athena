import { libraryFilters, libraryUrl } from "@/lib/library-view";
import { ActivityPreparation } from "@/components/activity-preparation";
import { AppHeader } from "@/components/app-header";
import { SaveActivityForm } from "@/components/save-activity-form";
import { requireFamilyContext } from "@/lib/family-context";
import { loadLibraryCandidates } from "@/lib/library-candidates";
import { loadFamilyCalendar } from "@/lib/family-calendar";
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

export default async function LibraryActivityPage({ params, searchParams }: PageProps<"/library/[id]">) {
  const { id } = await params;
  const filters = libraryFilters(await searchParams);
  const backTo = libraryUrl(filters);
  const detailReturn = `/library/${id}${backTo.includes("?") ? backTo.slice(backTo.indexOf("?")) : ""}`;
  const { supabase, membership, family, activeChild } = await requireFamilyContext();
  const target = filters.replace ? await supabase.from("activity_instances").select("scheduled_date,status,opportunity_type").eq("id", filters.replace).eq("child_id", activeChild.id).maybeSingle() : { data: null, error: null };
  if (target.error) throw new Error("Could not check the replacement date. Your plan has not changed.");
  const date = target.data?.status === "planned" && target.data.opportunity_type !== "open" ? target.data.scheduled_date : (await loadFamilyCalendar(supabase, membership.family_id)).today;
  const candidates = await loadLibraryCandidates(supabase, activeChild.id, date);
  if (candidates.error || !candidates.ids.includes(id)) return <main className="min-h-screen"><AppHeader familyName={family?.display_name ?? "Your family"} /><div className="workspace-page"><h1 className="workspace-heading">This idea is not available to choose</h1><p className="workspace-description">{candidates.error ?? "The current review, age or day-specific capacity checks do not include this idea. Existing plans and saved choices have not changed."}</p><Link className="button-primary mt-6" href={backTo}>Back to Library</Link></div></main>;
  // Display the same immutable response that passed the database check, not a
  // second template read which could race an editorial change.
  const data = candidates.snapshots.find(item => item.id === id);
  const { data: savedRow, error: savedError } = await supabase.from("saved_activities").select("template_id").eq("child_id", activeChild.id).eq("template_id", id).maybeSingle();
  if (savedError) throw new Error("Could not load saved choices. Please try again.");
  if (!data) notFound();
  const activity = { ...data, sourceClaims: candidates.evidenceByTemplate[id], activity_template_capabilities: [], activity_template_tracks: [] } as unknown as Template;

  return <main className="min-h-screen"><AppHeader familyName={family?.display_name ?? "Your family"} />
    <div className="workspace-page preparation-page">
      <div className="preparation-toolbar"><Link href={backTo} className="button-ghost">Back to {filters.replace ? "alternatives" : "library"}</Link>{membership.role !== "viewer" && <SaveActivityForm templateId={activity.id} saved={Boolean(savedRow)} returnTo={detailReturn} />}</div>
      {filters.replace && <p className="spatial-notice">You are reading an alternative. Your plan has not changed. Return to alternatives to choose a replacement.</p>}
      <ActivityPreparation title={activity.title} summary={activity.summary} instructions={activity.instructions} template={activity} />
      <footer className="preparation-footer"><Link className="button-ghost" href={backTo}>Back to {filters.replace ? "alternatives" : "library"}</Link><Link className="button-ghost" href="/guide">Talk it through with Guide</Link></footer>
    </div>
  </main>;
}
