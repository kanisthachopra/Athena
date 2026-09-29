"use server";

import { askCopilot, type CopilotAnswer } from "@/lib/ai/ask-copilot";
import { AiProviderError } from "@/lib/ai/nebius";
import { requireFamilyContext } from "@/lib/family-context";
import { createHash } from "node:crypto";

export type AskState = {
  error: string | null;
  answer: CopilotAnswer | null;
};

function localDateValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export async function askMira(_previousState: AskState, formData: FormData): Promise<AskState> {
  const question = String(formData.get("question") ?? "").replace(/\s+/g, " ").trim();
  if (question.length < 8 || question.length > 600) {
    return { error: "Ask a question between 8 and 600 characters.", answer: null };
  }

  const { supabase, membership, userId, activeChild } = await requireFamilyContext();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("ai_runs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("feature", "ask")
    .gte("created_at", since);
  if ((count ?? 0) >= 20) {
    return { error: "Ask has reached today’s allowance. Your plans and journal still work normally; try again tomorrow.", answer: null };
  }

  const now = new Date();
  const ageMonths = Math.max(0, (now.getFullYear() - activeChild.birth_year) * 12 + now.getMonth() + 1 - activeChild.birth_month);
  const { data: opportunity } = await supabase
    .from("activity_instances")
    .select("personalized_title")
    .eq("child_id", activeChild.id)
    .eq("scheduled_date", localDateValue(now))
    .maybeSingle();
  const inputHash = createHash("sha256").update(question).digest("hex");

  try {
    const result = await askCopilot({
      question,
      ageMonths,
      currentOpportunity: opportunity?.personalized_title ?? null,
    });
    await supabase.from("ai_runs").insert({
      family_id: membership.family_id,
      user_id: userId,
      feature: "ask",
      provider: "nebius",
      model: result.model,
      status: "succeeded",
      input_hash: inputHash,
      prompt_tokens: result.promptTokens,
      completion_tokens: result.completionTokens,
      latency_ms: result.latencyMs,
    });
    return { error: null, answer: result.answer };
  } catch (error) {
    await supabase.from("ai_runs").insert({
      family_id: membership.family_id,
      user_id: userId,
      feature: "ask",
      provider: "nebius",
      model: process.env.NEBIUS_MODEL || "Qwen/Qwen3-30B-A3B-Instruct-2507",
      status: "failed",
      input_hash: inputHash,
      error_code: error instanceof AiProviderError ? error.code : "validation_error",
    });
    return { error: "MIRA’s language helper is unavailable right now. Nothing was changed—please try again shortly.", answer: null };
  }
}
