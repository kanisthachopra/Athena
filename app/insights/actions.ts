"use server";

import { AiProviderError } from "@/lib/ai/nebius";
import {
  deterministicObservationFallback,
  extractObservation,
  type ObservationProposal,
} from "@/lib/ai/observation-extractor";
import { requireFamilyContext } from "@/lib/family-context";
import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";

export type LearningMomentState = { error: string | null; success: string | null };
export type ObservationProposalState = {
  error: string | null;
  notice: string | null;
  source: "ai" | "fallback" | null;
  proposal: (ObservationProposal & { occurredOn: string }) | null;
};

const domains = new Set(["everyday", "language", "movement", "sensory", "maths", "creative", "life_skills", "nature"]);
const AI_DAILY_CALL_LIMIT = 30;
const AI_DAILY_TOKEN_LIMIT = 60_000;

function estimatedCostMicrousd(promptTokens: number, completionTokens: number) {
  const inputRate = Number(process.env.NEBIUS_INPUT_USD_PER_MILLION);
  const outputRate = Number(process.env.NEBIUS_OUTPUT_USD_PER_MILLION);
  if (!Number.isFinite(inputRate) || !Number.isFinite(outputRate) || inputRate < 0 || outputRate < 0) return null;
  return Math.round(promptTokens * inputRate + completionTokens * outputRate);
}

async function recordAiRun(
  supabase: Awaited<ReturnType<typeof requireFamilyContext>>["supabase"],
  details: {
    familyId: string;
    userId: string;
    model: string;
    status: "succeeded" | "fallback" | "failed" | "budget_blocked";
    inputHash: string;
    promptTokens?: number;
    completionTokens?: number;
    latencyMs?: number;
    errorCode?: string;
  },
) {
  const promptTokens = details.promptTokens ?? 0;
  const completionTokens = details.completionTokens ?? 0;
  await supabase.from("ai_runs").insert({
    family_id: details.familyId,
    user_id: details.userId,
    feature: "observation_extraction",
    provider: "nebius",
    model: details.model,
    status: details.status,
    input_hash: details.inputHash,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    latency_ms: details.latencyMs ?? 0,
    estimated_cost_microusd: estimatedCostMicrousd(promptTokens, completionTokens),
    error_code: details.errorCode ?? null,
  });
}

export async function proposeLearningMoment(
  _previousState: ObservationProposalState,
  formData: FormData,
): Promise<ObservationProposalState> {
  const rawNote = String(formData.get("rawNote") ?? "").replace(/\s+/g, " ").trim();
  const occurredOn = String(formData.get("occurredOn") ?? "");
  if (rawNote.length < 8 || rawNote.length > 1200) {
    return { error: "Describe the moment in 8 to 1,200 characters.", notice: null, source: null, proposal: null };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn)) {
    return { error: "Choose when this happened.", notice: null, source: null, proposal: null };
  }

  const { supabase, membership, userId } = await requireFamilyContext();
  if (membership.role === "viewer") {
    return { error: "Caregiver access is required.", notice: null, source: null, proposal: null };
  }

  const inputHash = createHash("sha256").update(rawNote).digest("hex");
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recentRuns } = await supabase
    .from("ai_runs")
    .select("prompt_tokens,completion_tokens")
    .eq("user_id", userId)
    .eq("feature", "observation_extraction")
    .gte("created_at", since);
  const tokenCount = (recentRuns ?? []).reduce(
    (sum, run) => sum + Number(run.prompt_tokens ?? 0) + Number(run.completion_tokens ?? 0),
    0,
  );

  if ((recentRuns?.length ?? 0) >= AI_DAILY_CALL_LIMIT || tokenCount >= AI_DAILY_TOKEN_LIMIT) {
    const fallback = deterministicObservationFallback(rawNote);
    await recordAiRun(supabase, {
      familyId: membership.family_id,
      userId,
      model: process.env.NEBIUS_MODEL || "Qwen/Qwen3-30B-A3B-Instruct-2507",
      status: "budget_blocked",
      inputHash,
      errorCode: "daily_budget",
    });
    return {
      error: null,
      notice: "MIRA used its local fallback because today’s AI allowance has been reached. You can still edit and save this proposal.",
      source: "fallback",
      proposal: { ...fallback, occurredOn },
    };
  }

  try {
    const result = await extractObservation(rawNote);
    await recordAiRun(supabase, {
      familyId: membership.family_id,
      userId,
      model: result.model,
      status: "succeeded",
      inputHash,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      latencyMs: result.latencyMs,
    });
    return {
      error: null,
      notice: "MIRA shaped your words into a proposal. Nothing has been saved yet.",
      source: "ai",
      proposal: { ...result.proposal, occurredOn },
    };
  } catch (error) {
    const fallback = deterministicObservationFallback(rawNote);
    const errorCode = error instanceof AiProviderError ? error.code : "validation_error";
    await recordAiRun(supabase, {
      familyId: membership.family_id,
      userId,
      model: process.env.NEBIUS_MODEL || "Qwen/Qwen3-30B-A3B-Instruct-2507",
      status: "fallback",
      inputHash,
      errorCode,
    });
    return {
      error: null,
      notice: "MIRA could not reach its language helper, so it made a simple local proposal instead. You can still edit and save it.",
      source: "fallback",
      proposal: { ...fallback, occurredOn },
    };
  }
}

export async function saveLearningMoment(
  _previousState: LearningMomentState,
  formData: FormData,
): Promise<LearningMomentState> {
  const title = String(formData.get("title") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const domain = String(formData.get("domain") ?? "everyday");
  const occurredOn = String(formData.get("occurredOn") ?? "");

  if (!title || title.length > 100) return { error: "Add a short title of up to 100 characters.", success: null };
  if (!note || note.length > 1200) return { error: "Describe the moment in up to 1,200 characters.", success: null };
  if (!domains.has(domain)) return { error: "Choose a valid learning area.", success: null };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn)) return { error: "Choose when this happened.", success: null };

  const { supabase, membership, activeChild } = await requireFamilyContext();
  if (membership.role === "viewer") return { error: "Caregiver access is required.", success: null };

  const { error } = await supabase.rpc("create_learning_moment", {
    p_child_id: activeChild.id,
    p_occurred_on: occurredOn,
    p_domain: domain,
    p_title: title,
    p_note: note,
  });
  if (error) return { error: error.message, success: null };

  revalidatePath("/insights");
  return { error: null, success: "Moment added to the journal." };
}

export async function deleteLearningMoment(formData: FormData) {
  const momentId = String(formData.get("momentId") ?? "");
  if (!momentId) throw new Error("Learning moment not found.");

  const { supabase, membership } = await requireFamilyContext();
  if (membership.role === "viewer") throw new Error("Caregiver access is required.");
  const { error } = await supabase.rpc("delete_learning_moment", { p_moment_id: momentId });
  if (error) throw new Error(error.message);
  revalidatePath("/insights");
}
