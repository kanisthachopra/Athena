"use server";

import { requireFamilyContext } from "@/lib/family-context";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type RescheduleState = { error: string | null; success: string | null };

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
  if (error) return { error: error.message, success: null };

  revalidatePath("/today");
  revalidatePath("/week");
  revalidatePath(`/activity/${instanceId}`);
  return { error: null, success: "Week updated." };
}
