"use server";

import { requireFamilyContext } from "@/lib/family-context";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function buildNextWeek() {
  const { supabase, activeChild: child } = await requireFamilyContext();

  const { data: planId, error } = await supabase.rpc("generate_next_week_plan", { p_child_id: child.id });
  if (error) throw new Error(error.message);

  revalidatePath("/week");
  redirect(`/week?plan=${planId}`);
}
