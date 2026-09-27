"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function buildNextWeek() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  if (!authData?.claims?.sub) redirect("/auth/login");

  const { data: membership } = await supabase.from("family_members").select("family_id").limit(1).maybeSingle();
  if (!membership) redirect("/onboarding");
  const { data: child } = await supabase.from("children").select("id").eq("family_id", membership.family_id).limit(1).maybeSingle();
  if (!child) redirect("/onboarding");

  const { data: planId, error } = await supabase.rpc("generate_next_week_plan", { p_child_id: child.id });
  if (error) throw new Error(error.message);

  revalidatePath("/week");
  redirect(`/week?plan=${planId}`);
}
