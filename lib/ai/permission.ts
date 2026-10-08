import "server-only";
import { isAiAllowed, type AiFeature, type AiPreferences } from "@/lib/ai-preferences";
import type { SupabaseClient } from "@supabase/supabase-js";
export class AiPermissionError extends Error {}
export function familyAiAuthorizer(client: SupabaseClient, familyId: string, feature: AiFeature) {
  return async () => {
    const { data, error } = await client.from("family_ai_preferences")
      .select("guide_enabled,profile_enabled,journal_enabled,policy_version,revision").eq("family_id", familyId).maybeSingle();
    if (error) throw new AiPermissionError("MIRA could not verify your family’s AI setting, so the next request was blocked. Saved plans and direct observations still work.");
    if (!isAiAllowed(data as AiPreferences | null, feature)) throw new AiPermissionError("This AI feature is off for your family, so the next request was blocked. The owner can review and change it in Settings.");
  };
}
