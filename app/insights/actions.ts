"use server";

import { AiProviderError } from "@/lib/ai/nebius";
import {
  deterministicObservationFallback,
  extractObservation,
  type ObservationProposal,
} from "@/lib/ai/observation-extractor";
import { requireFamilyContext } from "@/lib/family-context";
import { revalidatePath } from "next/cache";
import { isCalendarDate, journalTitle, validateJournalEntry, isJournalVersion, journalCorrectionFailure, emptyJournalCorrection, type JournalCorrectionState } from "@/lib/journal-entry";
import { familyAiAuthorizer, AiPermissionError } from "@/lib/ai/permission";
import { extractionRequestBudget, ExtractionBudgetError } from "@/lib/ai/extraction-budget";

export type LearningMomentState = { error: string | null; success: string | null; retry?: "same" | "review" };
export type ObservationProposalState = {
  error: string | null;
  notice: string | null;
  source: "ai" | "fallback" | null;
  proposal: (ObservationProposal & { occurredOn: string }) | null;
};

export async function proposeLearningMoment(
  _previousState: ObservationProposalState,
  formData: FormData,
): Promise<ObservationProposalState> {
  const rawNote = String(formData.get("rawNote") ?? "");
  const occurredOn = String(formData.get("occurredOn") ?? "");
  if (formData.get("allowAi") !== "on") return { error: "Choose whether to send this note to Nebius first. Saving your own words does not need AI.", notice: null, source: null, proposal: null };
  if (rawNote.trim().length < 8 || rawNote.length > 1200) {
    return { error: "Describe the moment in 8 to 1,200 characters.", notice: null, source: null, proposal: null };
  }
  if (!isCalendarDate(occurredOn)) {
    return { error: "Choose when this happened.", notice: null, source: null, proposal: null };
  }

  const { supabase, membership, activeChild } = await requireFamilyContext();
  if (String(formData.get("childId") ?? "") !== activeChild.id) return { error: "The selected child changed. Reopen Insights before requesting a suggestion.", notice: null, source: null, proposal: null };
  if (membership.role === "viewer") {
    return { error: "Caregiver access is required.", notice: null, source: null, proposal: null };
  }

  const budget = extractionRequestBudget(supabase, membership.family_id, "journal");
  const authorize = familyAiAuthorizer(supabase, membership.family_id, "journal");
  let completion: Awaited<ReturnType<typeof extractObservation>> | undefined;
  let finalizing = false;
  try {
    const result = await extractObservation(rawNote, async () => { await authorize(); await budget.beforeRequest(); });
    completion = result;
    await authorize();
    finalizing = true;
    await budget.finish("succeeded", result);
    return {
      error: null,
      notice: "Suggested title and area only. Your observation has not been rewritten or saved.",
      source: "ai",
      proposal: { ...result.proposal, occurredOn },
    };
  } catch (error) {
    if (!finalizing) {
      try { await budget.finish("failed", completion, error instanceof AiPermissionError ? "permission" : error instanceof ExtractionBudgetError ? "accounting" : error instanceof AiProviderError ? "provider" : "validation"); }
      catch { /* A lost record cannot reset the reserved allowance or trigger another call. */ }
    }
    if (error instanceof AiPermissionError) return { error: error.message, notice: null, source: null, proposal: null };
    if (error instanceof ExtractionBudgetError && error.reason !== "limit") return { error: error.message, notice: null, source: null, proposal: null };
    if (finalizing) return { error: "MIRA could not confirm the AI request record. Your own words are still here; you can save them without AI.", notice: null, source: null, proposal: null };
    const fallback = deterministicObservationFallback(rawNote);
    return {
      error: null,
      notice: error instanceof ExtractionBudgetError
        ? "The AI allowance for the past 24 hours has been reached. This title is a simple local suggestion; you can still edit and save your own words."
        : "AI suggestions are unavailable. This is a simple local title and area, not an AI interpretation. You can still edit and save your own words.",
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
  const note = String(formData.get("note") ?? "");
  const domain = String(formData.get("domain") ?? "everyday");
  const occurredOn = String(formData.get("occurredOn") ?? "");
  const childId = String(formData.get("childId") ?? "");
  const requestId = String(formData.get("requestId") ?? "");

  const validationError = validateJournalEntry({ title, note, domain, occurredOn, childId });
  if (validationError) return { error: validationError, success: null };
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) return { error: "This draft is missing its save reference. Keep your words and start a new draft before saving.", success: null, retry: "review" };

  const { supabase, membership, activeChild } = await requireFamilyContext();
  if (membership.role === "viewer") return { error: "Caregiver access is required.", success: null };
  if (childId !== activeChild.id) return { error: "The selected child changed in another tab. Your note is still here. Return to this child's Insights before saving.", success: null };

  const { data, error } = await supabase.rpc("create_learning_moment_checked", {
    p_request_id: requestId,
    p_child_id: activeChild.id,
    p_occurred_on: occurredOn,
    p_domain: domain,
    p_title: title || journalTitle(note),
    p_note: note,
  });
  if (error?.message.includes("MIRA_MOMENT_REQUEST_CHANGED")) return { error: "This save reference was already used for different details. Nothing was overwritten. Check the journal before starting a new draft with these words.", success: null, retry: "review" };
  if (error?.message.includes("MIRA_MOMENT_REMOVED")) return { error: "This observation was removed after its first save. The retry did not recreate it. You can choose to start a new draft with these words.", success: null, retry: "review" };
  if (error && /past year/i.test(error.message)) return { error: "Choose a date within the past year. Your note has not been cleared.", success: null };
  if (error && /Caregiver access required/i.test(error.message)) return { error: "Your access changed. The journal could not save this observation; your words are still here.", success: null };
  if (error || typeof data !== "string" || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(data)) return { error: "The journal could not confirm the save. Retry the same observation to check or finish that save; it will not create a second copy.", success: null, retry: "same" };

  revalidatePath("/insights");
  return { error: null, success: "Your observation is saved in the journal." };
}

export async function correctLearningMoment(_previous: JournalCorrectionState, formData: FormData): Promise<JournalCorrectionState> {
  const momentId = String(formData.get("momentId") ?? "");
  const childId = String(formData.get("childId") ?? "");
  const version = String(formData.get("updatedAt") ?? "");
  const intent = String(formData.get("intent") ?? "");
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuid.test(momentId) || !uuid.test(childId) || !isJournalVersion(version) || !["save", "remove"].includes(intent)) return { ...emptyJournalCorrection, error: "The note’s edit reference is missing or outdated. Keep your words and reload the journal.", refreshRequired: true };
  const entry = { title: String(formData.get("title") ?? "").trim(), note: String(formData.get("note") ?? ""), domain: String(formData.get("domain") ?? ""), occurredOn: String(formData.get("occurredOn") ?? ""), childId };
  if (intent === "save") {
    const error = validateJournalEntry(entry);
    if (error) return { ...emptyJournalCorrection, error };
  }
  try {
    const { supabase, membership, activeChild } = await requireFamilyContext();
    if (membership.role === "viewer") return journalCorrectionFailure("Caregiver access required");
    if (activeChild.id !== childId) return { ...emptyJournalCorrection, error: "The selected child changed. Keep these words and return to this child’s journal before editing or removing the note.", refreshRequired: true };
    const identity = { p_moment_id: momentId, p_child_id: childId, p_expected_updated_at: version };
    const { data, error } = intent === "remove"
      ? await supabase.rpc("delete_learning_moment_checked", identity)
      : await supabase.rpc("update_learning_moment_checked", { ...identity, p_occurred_on: entry.occurredOn, p_domain: entry.domain, p_title: entry.title || journalTitle(entry.note), p_note: entry.note });
    if (error) return journalCorrectionFailure(error.message);
    if (intent === "remove" ? data !== true : !data || typeof data.updatedAt !== "string" || !isJournalVersion(data.updatedAt)) return journalCorrectionFailure();
    revalidatePath("/insights");
    return { ...emptyJournalCorrection, removed: intent === "remove", updatedAt: intent === "save" ? data.updatedAt : null, success: intent === "remove" ? "Note removed from the journal." : "Your changes are saved." };
  } catch {
    return journalCorrectionFailure();
  }
}
