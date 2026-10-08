import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export class GuideBudgetError extends Error {}
const unavailable = "Guide cannot check its allowance right now. Your plans are unchanged; please try again later.";
function failure(error: { message?: string } | null): never {
  throw new GuideBudgetError(error?.message?.includes("MIRA_GUIDE_ALLOWANCE_REACHED")
    ? "Guide has reached its allowance for the past 24 hours. Your plans and observations still work normally; try again later."
    : unavailable);
}

// A fresh server-created reservation is never accepted from form input. A retry
// uses the same reservation, but must claim another bounded attempt atomically.
export function guideRequestBudget(client: SupabaseClient, familyId: string) {
  let requestId: string | null = null;
  let attempts = 0;
  return {
    async beforeRequest() {
      if (!requestId) {
        const { data, error } = await client.rpc("reserve_guide_request", { p_family_id: familyId });
        if (error || typeof data !== "string" || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(data)) failure(error);
        requestId = data;
      }
      const { data, error } = await client.rpc("begin_guide_request_attempt", { p_request_id: requestId });
      if (error || data !== attempts + 1 || data > 2) failure(error);
      attempts = data;
    },
    async finish(outcome: "succeeded" | "failed", metadata?: {
      model: string; promptTokens: number; completionTokens: number; latencyMs: number; usageKnown?: boolean;
    }, errorCode: "permission" | "context_changed" | "provider" | "validation" | "accounting" | null = null) {
      if (!requestId) return;
      const { data, error } = await client.rpc("finish_guide_request", {
        p_request_id: requestId, p_outcome: outcome, p_model: metadata?.model ?? null,
        p_prompt_tokens: metadata?.usageKnown ? metadata.promptTokens : null,
        p_completion_tokens: metadata?.usageKnown ? metadata.completionTokens : null,
        p_latency_ms: metadata?.latencyMs ?? null, p_error_code: errorCode,
      });
      if (error || data !== true) throw new GuideBudgetError("Guide could not confirm its request record. Your plans are unchanged and your question is still here; please try again later.");
    },
  };
}
