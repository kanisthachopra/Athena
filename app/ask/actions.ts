"use server";

import { askCopilot, type CopilotAnswer } from "@/lib/ai/ask-copilot";
import { AiProviderError } from "@/lib/ai/nebius";
import { requireFamilyContext } from "@/lib/family-context";
import { guideRequestBudget, GuideBudgetError } from "@/lib/ai/guide-budget";
import { familyAiAuthorizer, AiPermissionError } from "@/lib/ai/permission";
import { ageContext } from "@/lib/age-context";
import { loadGuideContext } from "@/lib/guide-context";
import { loadFamilyCalendar } from "@/lib/family-calendar";

export type AskState = {
  error: string | null;
  answer: CopilotAnswer | null;
};

export async function askMira(_previousState: AskState, formData: FormData): Promise<AskState> {
  const question = String(formData.get("question") ?? "").replace(/\s+/g, " ").trim();
  if (question.length < 8 || question.length > 600) {
    return { error: "Ask a question between 8 and 600 characters.", answer: null };
  }

  const { supabase, membership, activeChild } = await requireFamilyContext();
  const calendar = await loadFamilyCalendar(supabase, membership.family_id).catch(() => null);
  if (!calendar) return { error: "Your family calendar could not be checked. No AI request was sent. Reload before asking again.", answer: null };
  const date = calendar.today;
  const childAge = ageContext(activeChild.birth_year, activeChild.birth_month, new Date(`${date}T12:00:00Z`));
  if (!childAge || childAge.scope !== "within_target") return { error: "Guide cannot establish an age within MIRA’s birth-to-under-seven scope from the saved month and year. You can still read saved plans and record observations. Check the child details in Family; no AI request was sent.", answer: null };
  const budget = guideRequestBudget(supabase, membership.family_id);
  let completion: Awaited<ReturnType<typeof askCopilot>> | undefined;
  let finalizing = false;

  try {
    const authorize = familyAiAuthorizer(supabase, membership.family_id, "guide");
    await authorize();
    const grounded = await loadGuideContext(supabase, activeChild.id, question, date);
    if (grounded.error || !grounded.context) return { error: grounded.error, answer: null };
    const recheck = async () => {
      await authorize();
      const { data: currentChild, error: childError } = await supabase.from("children")
        .select("birth_year,birth_month").eq("id", activeChild.id).eq("family_id", membership.family_id).maybeSingle();
      if (childError || !currentChild || currentChild.birth_year !== activeChild.birth_year || currentChild.birth_month !== activeChild.birth_month) throw new Error("MIRA_GUIDE_CONTEXT_CHANGED");
      const latest = await loadGuideContext(supabase, activeChild.id, question, date);
      const currentCalendar = await loadFamilyCalendar(supabase, membership.family_id);
      if (currentCalendar.today !== date || currentCalendar.revision !== calendar.revision || latest.error || latest.fingerprint !== grounded.fingerprint) throw new Error("MIRA_GUIDE_CONTEXT_CHANGED");
    };
    const result = await askCopilot({
      beforeRequest: async () => { await recheck(); await budget.beforeRequest(); },
      question,
      age: childAge,
      context: grounded.context,
    });
    completion = result;
    await recheck();
    finalizing = true;
    await budget.finish("succeeded", result);
    return { error: null, answer: result.answer };
  } catch (error) {
    if (!finalizing) {
      try {
        await budget.finish("failed", completion, error instanceof AiPermissionError ? "permission"
          : error instanceof GuideBudgetError ? "accounting"
          : error instanceof Error && error.message === "MIRA_GUIDE_CONTEXT_CHANGED" ? "context_changed"
          : error instanceof AiProviderError ? "provider" : "validation");
      } catch {
        // The durable reservation still counts. Never retry the provider or
        // replace a known permission/context failure with a logging exception.
      }
    }
    if (error instanceof AiPermissionError || error instanceof GuideBudgetError) return { error: error.message, answer: null };
    return { error: error instanceof Error && error.message === "MIRA_GUIDE_CONTEXT_CHANGED"
      ? "The library or your saved context changed while Guide was answering. That response was not shown. Your plan is unchanged; refresh before asking again."
      : "Guide could not produce a complete answer with valid library references. Your plan is unchanged and your question is still here; try again later.", answer: null };
  }
}
