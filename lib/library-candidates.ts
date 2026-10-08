import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parseActivityEvidence } from "@/lib/activity-evidence";
import type { GuideClaim } from "@/lib/guide-grounding";
import { parsePublicationContext } from "@/lib/activity-publication-context";

export async function loadLibraryCandidates(supabase: Pick<SupabaseClient, "rpc">, childId: string, date: string) {
  const empty = { ids: [] as string[], snapshots: [] as Record<string, unknown>[], evidenceByTemplate: {} as Record<string, GuideClaim[]> };
  const { data, error } = await supabase.rpc("get_reviewed_library_context", { p_child_id: childId, p_on_date: date });
  if (error) return { ...empty, error: error.code === "PGRST202"
    ? "The library needs the latest database update before it can check reviewed activities. Existing plans have not changed."
    : "The library could not check activity eligibility. Your saved choices and plans have not changed. Try again shortly." };
  if (!Array.isArray(data) || data.some(row => !row || typeof row.template_id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.template_id) || !row.template_snapshot || row.template_snapshot.id !== row.template_id || row.template_snapshot.review_status !== "expert_reviewed" || !Number.isInteger(row.template_snapshot.content_version) || typeof row.template_snapshot.title !== "string" || typeof row.template_snapshot.instructions !== "string")) {
    return { ...empty, error: "The library received an incomplete eligibility check. Try again shortly; nothing has been added to your plan." };
  }
  const evidenceByTemplate: Record<string, GuideClaim[]> = {};
  for (const row of data) {
    if (row.template_snapshot.publication_context != null && !parsePublicationContext(row.template_snapshot.publication_context)) return { ...empty, error: "The library could not verify this activity’s reviewed context. Nothing has been added to your plan." };
    const evidence = parseActivityEvidence(row.evidence_snapshot, row.template_id);
    if (!evidence || evidence.some(claim => claim.checkedOn > date || claim.reviewDueOn < date)) return { ...empty, error: "The library could not verify the source scope for these entries. Nothing has been added to your plan." };
    evidenceByTemplate[row.template_id] = evidence;
  }
  const rows = [...new Map(data.map(row => [row.template_id as string, row.template_snapshot as Record<string, unknown>])).values()];
  return { ids: rows.map(row => row.id as string), snapshots: rows, evidenceByTemplate, error: null };
}
