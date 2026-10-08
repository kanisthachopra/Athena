"use server";

import { requireFamilyContext } from "@/lib/family-context";
import { activityEligibilityMessage, safeLibraryReturn } from "@/lib/library-view";
import { parseReplacement, replacementFailure, type ReplacementState } from "@/lib/activity-replacement";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function replaceActivity(_previous: ReplacementState, formData: FormData): Promise<ReplacementState> {
  const input = parseReplacement(formData);
  if (!input) return { error: "The replacement details are incomplete. Refresh the alternatives and choose again.", refreshRequired: true };
  const { instanceId, templateId, revision, templateSnapshot } = input;
  const { supabase, membership, activeChild } = await requireFamilyContext();
  if (membership.role === "viewer") return { error: "Only a caregiver can replace an activity.", refreshRequired: true };
  const { data: instance, error: contextError } = await supabase.from("activity_instances").select("id").eq("id", instanceId).eq("child_id", activeChild.id).maybeSingle();
  if (contextError || !instance) return { error: "This activity could not be checked for the selected child. Refresh the week before trying again.", refreshRequired: true };
  try {
    const { error } = await supabase.rpc("replace_planned_activity_checked", {
      p_instance_id: instanceId,
      p_template_id: templateId,
      p_expected_revision: revision,
      p_expected_template: templateSnapshot,
    });
    if (error) return replacementFailure(error.message, error.code) ?? { error: activityEligibilityMessage(error.message) ?? "We could not confirm the replacement. Refresh your week to check what was saved before trying again.", refreshRequired: true };
  } catch {
    return { error: "The connection was interrupted. Refresh your week to check whether the replacement was saved before trying again.", refreshRequired: true };
  }

  revalidatePath("/today");
  revalidatePath("/week");
  revalidatePath(`/activity/${instanceId}`);
  redirect(`/activity/${instanceId}`);
}

export async function setSavedActivity(formData: FormData) {
  const templateId = String(formData.get("templateId") ?? "");
  const savedValue = String(formData.get("saved") ?? "");
  if (savedValue !== "true" && savedValue !== "false") throw new Error("Choose whether to save or remove this idea.");
  const saved = savedValue === "true";
  const requestedReturn = String(formData.get("returnTo") ?? "/library");
  const returnTo = safeLibraryReturn(requestedReturn);
  if (!templateId) throw new Error("Activity not found.");

  const { supabase, membership, activeChild } = await requireFamilyContext();
  if (membership.role === "viewer") throw new Error("Caregiver access is required.");
  const { error } = await supabase.rpc("set_activity_saved", {
    p_child_id: activeChild.id,
    p_template_id: templateId,
    p_saved: saved,
  });
  if (error) throw new Error(activityEligibilityMessage(error.message) ?? "We could not confirm the saved choice. Refresh the library before trying again.");

  revalidatePath("/library");
  revalidatePath(returnTo);
  redirect(returnTo);
}
