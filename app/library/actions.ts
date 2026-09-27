"use server";

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
