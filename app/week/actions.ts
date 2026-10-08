"use server";

import { requireFamilyContext } from "@/lib/family-context";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { WeekSnapshot } from "@/lib/week-workspace";
import { activityEligibilityMessage } from "@/lib/library-view";

export type RescheduleState = { error: string | null; success: string | null };

export async function moveWeekActivity(input: { instanceId: string; targetDate: string; expected: WeekSnapshot }): Promise<{ error: string | null; snapshot: WeekSnapshot | null }> {
  if (!input || !/^[0-9a-f-]{36}$/i.test(input.instanceId) || !/^\d{4}-\d{2}-\d{2}$/.test(input.targetDate) || !Array.isArray(input.expected) || input.expected.length > 100) return { error: "Choose an activity and a day in this week.", snapshot: null };
  const { supabase, membership, activeChild } = await requireFamilyContext();
  if (membership.role === "viewer") return { error: "Caregiver access is required.", snapshot: null };
  const { data: instance, error: readError } = await supabase.from("activity_instances").select("id").eq("id", input.instanceId).eq("child_id", activeChild.id).maybeSingle();
  if (readError || !instance) return { error: "This activity is no longer available for the selected child. Refresh the week.", snapshot: null };
  const { data, error } = await supabase.rpc("move_week_activity_checked", { p_instance_id: input.instanceId, p_target_date: input.targetDate, p_expected: input.expected });
  if (error) return { error: activityEligibilityMessage(error.message) ?? (error.message.includes("MIRA_STALE_PLAN") ? "This week changed since you opened it. Refresh before moving anything." : error.code === "PGRST202" ? "Week moves need the latest database update. Your plan has not changed." : "The move could not be confirmed. Refresh the week before trying again."), snapshot: null };
  revalidatePath("/week"); revalidatePath("/today"); revalidatePath(`/activity/${input.instanceId}`);
  return { error: null, snapshot: data as WeekSnapshot };
}

export async function buildNextWeek() {
  const { supabase, activeChild: child } = await requireFamilyContext();

  const { data: planId, error } = await supabase.rpc("generate_next_week_plan", { p_child_id: child.id });
  if (error) throw new Error(error.message);

  revalidatePath("/week");
  redirect(`/week?plan=${planId}`);
}

export async function rescheduleActivity(
  _previousState: RescheduleState,
  formData: FormData,
): Promise<RescheduleState> {
  const instanceId = String(formData.get("instanceId") ?? "");
  const targetDate = String(formData.get("targetDate") ?? "");
  if (!instanceId || !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
    return { error: "Choose a valid day in this plan.", success: null };
  }

  const { supabase, membership } = await requireFamilyContext();
  if (membership.role === "viewer") return { error: "Caregiver access is required.", success: null };
  const { error } = await supabase.rpc("reschedule_planned_activity", {
    p_instance_id: instanceId,
    p_target_date: targetDate,
  });
  if (error) return { error: activityEligibilityMessage(error.message) ?? "The move could not be confirmed. Refresh the week before trying again.", success: null };

  revalidatePath("/today");
  revalidatePath("/week");
  revalidatePath(`/activity/${instanceId}`);
  return { error: null, success: "Week updated." };
}
