import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export class ExtractionBudgetError extends Error {
  constructor(message: string, readonly reason: "limit" | "permission" | "unavailable") { super(message); }
}
type Feature = "profile" | "journal";
type Metadata = { model: string; promptTokens: number; completionTokens: number; latencyMs: number; usageKnown?: boolean };
function failure(error: { message?: string } | null): never {
  if (error?.message?.includes("MIRA_EXTRACTION_PERMISSION")) throw new ExtractionBudgetError("This AI feature is no longer available with your current family settings or access. Your own words are unchanged.", "permission");
  if (error?.message?.includes("MIRA_EXTRACTION_ALLOWANCE_REACHED") || error?.message?.includes("MIRA_EXTRACTION_REPORTED_TOKEN_LIMIT")) throw new ExtractionBudgetError("The AI suggestion allowance for the past 24 hours has been reached. You can still edit and save your own words without AI.", "limit");
  throw new ExtractionBudgetError("AI suggestions are unavailable because the request allowance could not be confirmed. You can still edit and save your own words without AI.", "unavailable");
}

export function extractionRequestBudget(client: SupabaseClient, familyId: string, feature: Feature) {
  let requestId: string | null = null;
  let attempts = 0;
  return {
    async beforeRequest() {
      if (!requestId) {
        const { data, error } = await client.rpc("reserve_extraction_request", { p_family_id: familyId, p_feature: feature });
        if (error || typeof data !== "string" || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(data)) failure(error);
        requestId = data;
      }
      const { data, error } = await client.rpc("begin_extraction_request_attempt", { p_request_id: requestId });
      if (error || data !== attempts + 1 || data > 2) failure(error);
      attempts = data;
    },
    async finish(outcome: "succeeded" | "failed", metadata?: Metadata, errorCode: "permission" | "provider" | "validation" | "accounting" | null = null) {
      if (!requestId) return;
      const { data, error } = await client.rpc("finish_extraction_request", {
        p_request_id: requestId, p_outcome: outcome, p_model: metadata?.model ?? null,
        p_prompt_tokens: metadata?.usageKnown ? metadata.promptTokens : null,
        p_completion_tokens: metadata?.usageKnown ? metadata.completionTokens : null,
        p_latency_ms: metadata?.latencyMs ?? null, p_error_code: errorCode,
      });
      if (error || data !== true) throw new ExtractionBudgetError("MIRA could not confirm the AI request record. Your own words are still here; you can save them without AI.", "unavailable");
    },
  };
}
