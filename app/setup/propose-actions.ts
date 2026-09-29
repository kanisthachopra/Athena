"use server";

import { createHash } from "node:crypto";
import { extractProfile } from "@/lib/ai/profile-extractor";
import { AiProviderError } from "@/lib/ai/nebius";
import { requireFamilyContext } from "@/lib/family-context";
import type { ProfileSuggestion } from "@/lib/profile-proposal";

export type ProfileProposalState = { error: string | null; suggestions: ProfileSuggestion[] | null };

export async function proposeProfile(_previous: ProfileProposalState, formData: FormData): Promise<ProfileProposalState> {
  const rawNote = String(formData.get("familyNote") ?? "").trim();
  if (rawNote.length < 15 || rawNote.length > 1800) return { error: "Use 15 to 1,800 characters to describe your family's rhythm and hopes.", suggestions: null };
  const { supabase, membership, userId } = await requireFamilyContext();
  if (membership.role === "viewer") return { error: "A caregiver or owner can suggest profile changes.", suggestions: null };

  const { count, error: budgetError } = await supabase.from("ai_runs").select("id", { count: "exact", head: true })
    .eq("user_id", userId).eq("feature", "onboarding_extraction")
    .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  if (budgetError) return { error: "Suggestions are unavailable right now. You can still fill in the profile below.", suggestions: null };
  if ((count ?? 0) >= 10) return { error: "You've used today's ten profile suggestions. You can keep editing the profile below.", suggestions: null };

  // Log metadata only; neither the note nor the proposal is persisted here.
  const run = {
    family_id: membership.family_id, user_id: userId, feature: "onboarding_extraction",
    provider: "nebius", model: process.env.NEBIUS_MODEL || "Qwen/Qwen3-30B-A3B-Instruct-2507",
    input_hash: createHash("sha256").update(rawNote).digest("hex"),
  };
  try {
    const result = await extractProfile(rawNote);
    const inputRate = Number(process.env.NEBIUS_INPUT_USD_PER_MILLION);
    const outputRate = Number(process.env.NEBIUS_OUTPUT_USD_PER_MILLION);
    const estimatedCost = Number.isFinite(inputRate) && Number.isFinite(outputRate) && inputRate >= 0 && outputRate >= 0
      ? Math.round(result.promptTokens * inputRate + result.completionTokens * outputRate) : null;
    await supabase.from("ai_runs").insert({ ...run, status: "succeeded", model: result.model,
      prompt_tokens: result.promptTokens, completion_tokens: result.completionTokens,
      latency_ms: result.latencyMs, estimated_cost_microusd: estimatedCost });
    return { error: null, suggestions: result.suggestions };
  } catch (error) {
    await supabase.from("ai_runs").insert({ ...run, status: "failed", error_code: error instanceof AiProviderError ? error.code : "validation_error" });
    return { error: "MIRA couldn't make a reliable suggestion. Your note is still here; try again or fill in the profile below.", suggestions: null };
  }
}
