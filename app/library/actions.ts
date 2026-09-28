"use server";

import { requireFamilyContext } from "@/lib/family-context";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function replaceActivity(formData: FormData) {
  const instanceId = String(formData.get("instanceId") ?? "");
  const templateId = String(formData.get("templateId") ?? "");
  if (!instanceId || !templateId) throw new Error("Choose an activity to replace.");

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  if (!authData?.claims?.sub) redirect("/auth/login");
  const { error } = await supabase.rpc("replace_planned_activity", {
    p_instance_id: instanceId,
    p_template_id: templateId,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/today");
  revalidatePath("/week");
  revalidatePath(`/activity/${instanceId}`);
  redirect(`/activity/${instanceId}`);
}

export async function setSavedActivity(formData: FormData) {
  const templateId = String(formData.get("templateId") ?? "");
  const saved = String(formData.get("saved") ?? "") === "true";
  const requestedReturn = String(formData.get("returnTo") ?? "/library");
  const returnTo = requestedReturn.startsWith("/library") && !requestedReturn.startsWith("//") ? requestedReturn : "/library";
  if (!templateId) throw new Error("Activity not found.");

  const { supabase, membership, activeChild } = await requireFamilyContext();
  if (membership.role === "viewer") throw new Error("Caregiver access is required.");
  const { error } = await supabase.rpc("set_activity_saved", {
    p_child_id: activeChild.id,
    p_template_id: templateId,
    p_saved: saved,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/library");
  revalidatePath(returnTo);
  redirect(returnTo);
}
