"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseActivityObservation } from "@/lib/activity-observation";

export type FeedbackState = { error: string | null };

export async function saveFeedback(_previous: FeedbackState, formData: FormData): Promise<FeedbackState> {
  let observation;
  try { observation = parseActivityObservation(formData); }
  catch (error) { return { error: error instanceof Error ? error.message : "Check your observation before saving." }; }
  const { instanceId, ...args } = observation;
  const requestedReturn = String(formData.get("returnTo") ?? "/today");
  const returnTo = requestedReturn === `/activity/${instanceId}` ? requestedReturn : "/today";
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  if (!authData?.claims?.sub) redirect("/auth/login");
  let result;
  try { result = await supabase.rpc("record_activity_observation_checked", args); }
  catch { return { error: "The save could not be confirmed. Keep your note and reload the activity to check before retrying." }; }
  if (result.error) return { error: result.error.message.includes("MIRA_STALE_OBSERVATION")
    ? "This observation changed in another session. Keep your note and reload to compare before saving again."
    : result.error.message.includes("MIRA_ACTIVITY_CHANGED") ? "This activity changed while you were writing. Keep your note and reload before saving."
    : "The save could not be confirmed. Keep your note and reload the activity to check before retrying." };
  if (!Number.isInteger(result.data) || result.data <= args.p_expected_revision) return { error: "MIRA could not confirm the saved observation. Reload to check before retrying." };
  revalidatePath("/today");
  revalidatePath("/week");
  revalidatePath("/insights");
  revalidatePath(`/activity/${instanceId}`);
  redirect(returnTo);
}

export async function skipActivity(formData: FormData) {
  const instanceId = String(formData.get("instanceId") ?? "");
  if (!instanceId) throw new Error("Activity not found.");
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  if (!authData?.claims?.sub) redirect("/auth/login");
  const { error } = await supabase.rpc("skip_activity", { p_instance_id: instanceId });
  if (error) throw new Error(error.message);
  revalidatePath("/today");
  revalidatePath("/week");
  revalidatePath(`/activity/${instanceId}`);
  redirect("/today");
}
