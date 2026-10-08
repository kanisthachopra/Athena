import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadLibraryCandidates } from "@/lib/library-candidates";
import { type GuideClaim, type GuideContext, type GuideOption } from "@/lib/guide-grounding";
import { parsePublicationContext } from "@/lib/activity-publication-context";

export type GuideContextResult = { context: GuideContext; fingerprint: string; error: null } | { context: null; fingerprint: null; error: string };
export async function loadGuideContext(client: SupabaseClient, childId: string, question: string, date: string): Promise<GuideContextResult> {
  const candidates = await loadLibraryCandidates(client, childId, date);
  if (candidates.error) return { context: null, fingerprint: null, error: "Guide could not check the reviewed library. No question was sent to AI; try again later." };
  if (!candidates.ids.length) return { context: null, fingerprint: null, error: "Guide has no reviewed activity available for your child's current context. Research drafts are not approved guidance, so no question was sent to AI. You can inspect the pending research in Library or leave the day open." };
  // Bounded, deterministic lexical retrieval. A match ranks approved candidates;
  // it is not a new eligibility rule or evidence of a child's interest/readiness.
  const words = [...new Set(question.toLocaleLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? [])];
  const score = (item: Record<string, unknown>) => words.filter(word => `${item.title} ${item.summary}`.toLocaleLowerCase().includes(word)).length;
  const fieldLimits: Record<string, number> = { title: 160, summary: 800, instructions: 2400, adult_role: 1400, safety_note: 1600, stop_signals: 1000 };
  const selected = [...candidates.snapshots].filter(item => Object.entries(fieldLimits).every(([key,max]) => typeof item[key] === "string" && (item[key] as string).trim().length > 0 && (item[key] as string).length <= max)
    && Array.isArray(item.materials) && item.materials.length <= 20 && item.materials.every(value => typeof value === "string" && value.length <= 160))
    .sort((a,b) => score(b)-score(a) || String(a.id).localeCompare(String(b.id))).slice(0,8);
  if (!selected.length) return { context: null, fingerprint: null, error: "The reviewed entries do not have a complete, bounded Guide context. No question was sent to AI; you can still inspect the Library." };
  const claims = new Map<string, GuideClaim>();
  const optionClaims = new Map<string, string[]>();
  // Claims come from the same checked database response as the template, not a
  // second mutable join. Each claim retains its applicability and limits.
  for (const item of selected) {
    const sourceRecords = candidates.evidenceByTemplate[String(item.id)] ?? [];
    for (const claim of sourceRecords.slice(0,2)) {
      claims.set(claim.id, claim);
      optionClaims.set(String(item.id), [...(optionClaims.get(String(item.id)) ?? []), claim.id]);
    }
  }
  const options: GuideOption[] = selected.filter(item => optionClaims.has(String(item.id))).map(item => {
    const publication = parsePublicationContext(item.publication_context);
    const safety = [String(item.safety_note)];
    if (publication) safety.push(`Readiness: ${publication.readiness}`, `Exclusions: ${publication.exclusions}`);
    return {
      id: String(item.id), title: String(item.title), summary: String(item.summary), instructions: String(item.instructions),
      adultRole: String(item.adult_role), safety: safety.join("\n"), stop: String(item.stop_signals),
      materials: Array.isArray(item.materials) ? item.materials.map(String) : [], claimIds: [...new Set(optionClaims.get(String(item.id))!)].sort(),
    };
  });
  if (!options.length) return { context: null, fingerprint: null, error: "Guide does not yet have version-reviewed source records for these activities. It will not invent an evidence-backed answer. No question was sent to AI; your existing plans and observations remain available." };
  const relevantClaims = () => [...claims.values()].filter(claim => options.some(option => option.claimIds.includes(claim.id))).sort((a,b)=>a.id.localeCompare(b.id));
  const context: GuideContext = { date, options, claims: relevantClaims() };
  while (JSON.stringify(context).length > 14_000 && options.length > 1) { options.pop(); context.claims = relevantClaims(); }
  if (JSON.stringify(context).length > 14_000) return { context: null, fingerprint: null, error: "The source context exceeds Guide’s request limit. No question was sent to AI; read the full preparation in Library instead." };
  // Bind the complete candidate rows too, not only the abbreviated prompt fields.
  const fingerprint = createHash("sha256").update(JSON.stringify({ context, snapshots: selected })).digest("hex");
  return { context, fingerprint, error: null };
}
