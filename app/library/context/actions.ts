"use server";
import { requireFamilyContext } from "@/lib/family-context";
import { contextDatePlus, isContextDate, parseContextAnswers, parseContextContract } from "@/lib/activity-context";
import { revalidatePath } from "next/cache";
import { loadFamilyCalendar } from "@/lib/family-calendar";
export type ContextSaveState = { error: string | null; success: string | null; revision: number | null; refreshRequired: boolean };
export async function saveActivityContext(_previous: ContextSaveState, form: FormData): Promise<ContextSaveState> {
  const fail = (error: string, refreshRequired = false): ContextSaveState => ({ error, success: null, revision: null, refreshRequired });
  const childId = String(form.get("childId") ?? ""), templateId = String(form.get("templateId") ?? "");
  const rawVersion = String(form.get("contentVersion") ?? ""), rawRevision = String(form.get("revision") ?? "");
  const version = Number(rawVersion), revision = Number(rawRevision);
  const validFrom = String(form.get("validFrom") ?? ""), validUntil = String(form.get("validUntil") ?? "");
  let contract, answers;
  try {
    const rawContract = String(form.get("contract") ?? ""), rawAnswers = String(form.get("answers") ?? "");
    if (rawContract.length > 18000 || rawAnswers.length > 3000) throw new Error();
    contract = parseContextContract(JSON.parse(rawContract));
    answers = contract ? parseContextAnswers(JSON.parse(rawAnswers), contract) : null;
  } catch { return fail("The activity checks are incomplete. Refresh this page before answering.", true); }
  if (!contract || !answers || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(templateId)
    || !/^\d+$/.test(rawVersion) || !/^\d+$/.test(rawRevision)
    || !Number.isSafeInteger(version) || version < 1 || !Number.isSafeInteger(revision) || revision < 0) return fail("The activity checks changed. Refresh this page before answering.", true);
  const { supabase, activeChild, membership } = await requireFamilyContext();
  const calendar = await loadFamilyCalendar(supabase, membership.family_id).catch(() => null);
  if (!calendar) return fail("Your family calendar could not be checked. Your answers are still here; reload before saving.", true);
  const today = calendar.today;
  if (!isContextDate(validFrom) || !isContextDate(validUntil) || validFrom < today || validFrom > contextDatePlus(today, 14)
    || validUntil < validFrom || validUntil > contextDatePlus(validFrom, contract.max_valid_days - 1)) return fail("Choose a date within the next two weeks and an end date within this activity’s reviewed check window.");
  if (activeChild.id !== childId) return fail("The selected child changed. Your answers are still here; reopen this child's checks before saving.", true);
  if (membership.role === "viewer") return fail("A caregiver can save these answers. Your access is read-only.");
  try {
    const { data, error } = await supabase.rpc("save_activity_context", { p_child_id: childId, p_template_id: templateId,
      p_content_version: version, p_expected_contract: contract, p_expected_revision: revision,
      p_valid_from: validFrom, p_valid_until: validUntil, p_answers: answers });
    if (error) return fail(/MIRA_CONTEXT_STALE|MIRA_CONTEXT_TEMPLATE_CHANGED/.test(error.message)
      ? "These checks or saved answers changed in another session. Refresh to compare before saving again."
      : "The checks could not be saved against the current reviewed activity. Refresh to check its availability; your plan is unchanged.", true);
    if (!Number.isInteger(data) || data !== revision + 1) return fail("The save was not confirmed. Refresh to check your saved answers before trying again.", true);
    revalidatePath("/library"); revalidatePath("/library/context"); revalidatePath("/today"); revalidatePath("/week");
    return { error: null, success: "Answers saved. Your plan has not changed. Check again before offering the activity if anything changes.", revision: data, refreshRequired: false };
  } catch { return fail("The connection was interrupted. Your answers are still here. Refresh to check whether they saved before trying again.", true); }
}
