"use server";
import { requireFamilyContext } from "@/lib/family-context";
import { AI_POLICY_VERSION, type AiPreferences } from "@/lib/ai-preferences";
import { revalidatePath } from "next/cache";
export type AiSettingsState = { error: string | null; success: string | null; saved: AiPreferences | null };
export async function saveAiSettings(_previous: AiSettingsState, form: FormData): Promise<AiSettingsState> {
  const fail = (error: string): AiSettingsState => ({ error, success: null, saved: null });
  const { supabase, membership } = await requireFamilyContext();
  if (membership.role !== "owner") return fail("Only the family owner can change these settings.");
  if (form.get("familyId") !== membership.family_id) return fail("Your family changed. Reload Settings before saving.");
  const rawRevision = String(form.get("revision") ?? "");
  if (!/^\d+$/.test(rawRevision) || !Number.isSafeInteger(Number(rawRevision))) return fail("Reload Settings before saving.");
  const guide_enabled = form.get("guide") === "on", profile_enabled = form.get("profile") === "on", journal_enabled = form.get("journal") === "on";
  const anyEnabled = guide_enabled || profile_enabled || journal_enabled;
  if (anyEnabled && (form.get("acknowledge") !== "on" || form.get("policyVersion") !== AI_POLICY_VERSION)) return fail("Read and acknowledge what will be sent before enabling AI.");
  const { data, error } = await supabase.rpc("set_family_ai_preferences", {
    p_family_id: membership.family_id, p_expected_revision: Number(rawRevision),
    p_guide_enabled: guide_enabled, p_profile_enabled: profile_enabled, p_journal_enabled: journal_enabled,
    p_policy_version: anyEnabled ? AI_POLICY_VERSION : null,
  });
  if (error) return fail(error.message.includes("MIRA_STALE_AI_PREFERENCES")
    ? "These settings changed in another session. Reload to see the current choices before saving."
    : "The change could not be confirmed. Reload Settings to check the saved choices before retrying.");
  if (!Number.isInteger(data) || data <= Number(rawRevision)) return fail("MIRA could not confirm the saved version. Reload Settings before retrying.");
  revalidatePath("/settings");
  return { error: null, success: anyEnabled ? "AI choices saved." : "AI is off for your family.", saved: {
    guide_enabled, profile_enabled, journal_enabled, policy_version: anyEnabled ? AI_POLICY_VERSION : null, revision: data,
  } };
}
