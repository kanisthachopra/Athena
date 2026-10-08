"use server";

import { extractProfile } from "@/lib/ai/profile-extractor";
import { AiProviderError } from "@/lib/ai/nebius";
import { requireFamilyContext } from "@/lib/family-context";
import type { ProfileSuggestion } from "@/lib/profile-proposal";
import { familyAiAuthorizer, AiPermissionError } from "@/lib/ai/permission";
import { extractionRequestBudget, ExtractionBudgetError } from "@/lib/ai/extraction-budget";

export type ProfileProposalState = { error: string | null; suggestions: ProfileSuggestion[] | null };

export async function proposeProfile(_previous: ProfileProposalState, formData: FormData): Promise<ProfileProposalState> {
  const rawNote = String(formData.get("familyNote") ?? "").trim();
  if (rawNote.length < 15 || rawNote.length > 1800) return { error: "Use 15 to 1,800 characters to describe your family's rhythm and hopes.", suggestions: null };
  const { supabase, membership } = await requireFamilyContext();
  if (membership.role === "viewer") return { error: "A caregiver or owner can suggest profile changes.", suggestions: null };

  const budget = extractionRequestBudget(supabase, membership.family_id, "profile");
  const authorize = familyAiAuthorizer(supabase, membership.family_id, "profile");
  let completion: Awaited<ReturnType<typeof extractProfile>> | undefined;
  let finalizing = false;
  try {
    const result = await extractProfile(rawNote, async () => { await authorize(); await budget.beforeRequest(); });
    completion = result;
    await authorize();
    finalizing = true;
    await budget.finish("succeeded", result);
    return { error: null, suggestions: result.suggestions };
  } catch (error) {
    if (!finalizing) {
      try { await budget.finish("failed", completion, error instanceof AiPermissionError ? "permission" : error instanceof ExtractionBudgetError ? "accounting" : error instanceof AiProviderError ? "provider" : "validation"); }
      catch { /* The reservation still counts; never resend because logging failed. */ }
    }
    if (error instanceof AiPermissionError || error instanceof ExtractionBudgetError) return { error: error.message, suggestions: null };
    return { error: "MIRA couldn't make a reliable suggestion. Your note is still here; try again or fill in the profile below.", suggestions: null };
  }
}
