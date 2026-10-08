"use server";

import { revalidatePath } from "next/cache";
import { requireFamilyContext } from "@/lib/family-context";
import { languageEnvironmentFieldErrors, parseLanguageEnvironment, planningLanguages, planningLanguageLabel } from "@/lib/language-planning";

export type LanguageSaveState = {
  status: "idle" | "saved" | "stale" | "invalid" | "error";
  message?: string;
  revision?: number;
  fieldErrors?: Record<string, string>;
};

export type LanguageAddState = { status: "idle" | "saved" | "error"; message?: string; goalId?: string };

export async function addFamilyLanguage(_previous: LanguageAddState, formData: FormData): Promise<LanguageAddState> {
  const { supabase, activeChild, membership } = await requireFamilyContext();
  const error = (message: string): LanguageAddState => ({ status: "error", message });
  if (membership.role === "viewer") return error("Your access is read-only. Ask a caregiver to add a language.");
  if (formData.get("childId") !== activeChild.id) return error("The selected child changed. Return to Family before adding a language.");
  const code = formData.get("languageCode"), requestId = formData.get("requestId");
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (typeof code !== "string" || !planningLanguages.some(([key]) => key === code)
    || typeof requestId !== "string" || !uuid.test(requestId)) return error("Choose a language before adding it. Your list has not changed.");
  try {
    const result = await supabase.rpc("add_family_language", { p_child_id: activeChild.id, p_request_id: requestId, p_language_code: code });
    if (result.error) {
      if (result.error.message === "MIRA_LANGUAGE_LIST_FULL") return error("The language list already has 40 entries. Your existing languages and their details are unchanged.");
      if (result.error.message === "MIRA_LANGUAGE_EXISTS") return error("This language is already in the list, possibly under its written name. Open that entry to edit its details.");
      if (result.error.message === "MIRA_LANGUAGE_REQUEST_RETIRED") return error("This earlier addition was removed or changed. Check the list before choosing a language again.");
      if (result.error.message === "MIRA_LANGUAGE_REQUEST_CHANGED") return error("This retry no longer matches the original choice. Check the list before choosing again.");
      if (result.error.message === "MIRA_LANGUAGE_ACCESS") return error("This child's languages could not be updated. Return to Family to check your access.");
      return error("We could not confirm the addition. Retry the same request; it will not add a second copy.");
    }
    if (typeof result.data !== "string" || !uuid.test(result.data)) return error("We could not confirm the addition. Retry the same request.");
    try { revalidatePath("/family"); revalidatePath("/setup"); revalidatePath("/week"); } catch { /* Confirmed save must survive a failed refresh. */ }
    return { status: "saved", goalId: result.data, message: `${planningLanguageLabel(code)} added. Open it in the list to describe your hopes and everyday moments.` };
  } catch { return error("The connection ended before we could confirm the addition. Retry the same request when it returns."); }
}

export async function saveLanguageEnvironment(
  _previous: LanguageSaveState,
  formData: FormData,
): Promise<LanguageSaveState> {
  const { supabase, activeChild, membership } = await requireFamilyContext();
  const error = (message: string): LanguageSaveState => ({ status: "error", message });
  if (membership.role === "viewer") return error("Your access is read-only. Ask a caregiver to update this language.");
  const childId = formData.get("childId");
  const goalId = formData.get("goalId");
  const revision = formData.get("revision");
  const operation = formData.get("operation");
  if (childId !== activeChild.id) return error("The selected child changed. Return to Family before editing this language.");
  if (typeof goalId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(goalId)
    || typeof revision !== "string" || !/^\d{1,10}$/.test(revision) || Number(revision) > 2147483646
    || !["save", "clear"].includes(String(operation))) {
    return error("This language form could not be read. Your changes have not been saved.");
  }
  let environment = null;
  if (operation === "save") {
    const raw = formData.get("environment");
    if (typeof raw !== "string" || raw.length > 50000) return { status: "invalid", message: "These details are too large or could not be read. Shorten the text and try again; nothing was saved." };
    let value: unknown;
    try { value = JSON.parse(raw); environment = parseLanguageEnvironment(value); } catch { /* Invalid input is not a cleared context. */ }
    if (!environment) {
      const fieldErrors = languageEnvironmentFieldErrors(value);
      return { status: "invalid", fieldErrors, message: Object.keys(fieldErrors).length ? "Check the marked fields. Your draft is still here; nothing was saved." : "These language details could not be read. Edit your draft before trying again; nothing was saved." };
    }
  }
  try {
    const result = await supabase.rpc("save_language_environment", {
      p_child_id: activeChild.id,
      p_goal_id: goalId,
      p_expected_revision: Number(revision),
      p_environment: environment,
    });
    if (result.error) {
      if (result.error.message === "MIRA_LANGUAGE_STALE") return { status: "stale", message: "These details changed since you opened them. Keep your draft and review the saved version before trying again." };
      if (result.error.message === "MIRA_LANGUAGE_CAREGIVER_LINK") return error("One of the linked caregivers is no longer available in this family. Review the people listed before saving.");
      if (["MIRA_LANGUAGE_ACCESS", "MIRA_LANGUAGE_NOT_FOUND"].includes(result.error.message)) return error("This child's language could not be updated. Return to Family to check your access and the selected child.");
      return error("We could not confirm the save. Keep these details and try the same save again.");
    }
    if (!Number.isInteger(result.data) || result.data < Number(revision) || result.data > Number(revision) + 1) {
      return error("We could not confirm the save. Keep these details and try the same save again.");
    }
    // Return the confirmed revision even if a cache refresh fails after the save.
    try { revalidatePath("/family"); revalidatePath("/family/languages"); revalidatePath("/week"); } catch { /* The RPC result still confirms persistence. */ }
    return { status: "saved", revision: result.data, message: operation === "clear" ? "Language details cleared. The language goal and existing plans are unchanged." : "Language details saved. Existing plans are unchanged." };
  } catch {
    return error("The connection ended before we could confirm the save. Keep these details and retry the same save.");
  }
}
