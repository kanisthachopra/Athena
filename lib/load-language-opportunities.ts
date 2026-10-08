import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { projectLanguageOpportunities, type LanguageOpportunities } from "@/lib/language-opportunities";

/** Session client only; callers obtain both IDs from requireFamilyContext.
 * Optional context failing must not hide the saved Week or invent a blank state.
 */
export async function loadLanguageOpportunities(supabase: Pick<SupabaseClient, "from">, childId: string, familyId: string): Promise<LanguageOpportunities> {
  const unavailable: LanguageOpportunities = { status: "unavailable", opportunities: [], hasSavedLanguages: false };
  try {
    const [goals, caregivers] = await Promise.all([
      supabase.from("child_language_goals").select("id,child_id,language_code,environment").eq("child_id", childId).order("created_at").order("id").limit(41),
      supabase.from("caregivers").select("id").eq("family_id", familyId),
    ]);
    if (goals.error || caregivers.error || !Array.isArray(caregivers.data) || caregivers.data.some(person => typeof person.id !== "string")) return unavailable;
    return projectLanguageOpportunities(goals.data, caregivers.data.map(person => person.id), childId);
  } catch {
    return unavailable;
  }
}
