"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type FeedbackState = { error: string | null };

export async function saveFeedback(_previous: FeedbackState, formData: FormData): Promise<FeedbackState> {
  const instanceId = String(formData.get("instanceId") ?? "");
  const engagement = String(formData.get("engagement") ?? "");
  const challenge = String(formData.get("challenge") ?? "");
  if (!instanceId || !["low", "medium", "high"].includes(engagement) || !["easy", "just_right", "stretch"].includes(challenge)) return { error: "Choose an engagement and challenge level." };
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  if (!authData?.claims?.sub) redirect("/auth/login");
  const { error } = await supabase.rpc("record_activity_feedback", {
    p_instance_id: instanceId,
    p_engagement: engagement,
    p_challenge_level: challenge,
    p_repeated: formData.get("repeated") === "on",
    p_parent_note: String(formData.get("note") ?? "").trim() || null,
  });
  if (error) return { error: error.message };
  revalidatePath("/today");
  revalidatePath("/week");
  redirect("/today");
}
