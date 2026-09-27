"use server";

import { requireFamilyContext } from "@/lib/family-context";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type ProfileState = { error: string | null };

function commaList(value: FormDataEntryValue | null) {
  return String(value ?? "").split(",").map((item) => item.trim()).filter(Boolean).slice(0, 8);
}

export async function saveLearningProfile(
  _previousState: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const { supabase, membership, activeChild: child } = await requireFamilyContext();

  const weekdayMinutes = Number(formData.get("weekdayMinutes"));
  const weekendMinutes = Number(formData.get("weekendMinutes"));
  if (!Number.isInteger(weekdayMinutes) || weekdayMinutes < 0 || weekdayMinutes > 180) return { error: "Weekday time must be between 0 and 180 minutes." };
  if (!Number.isInteger(weekendMinutes) || weekendMinutes < 0 || weekendMinutes > 240) return { error: "Weekend time must be between 0 and 240 minutes." };

  const aspirations = formData.getAll("aspirations").map(String);
  const customAspiration = String(formData.get("customAspiration") ?? "").trim();
  if (customAspiration) aspirations.push(customAspiration);
  if (aspirations.length === 0) return { error: "Choose at least one hope for your child." };

  const { error: profileError } = await supabase.rpc("configure_learning_profile", {
    p_family_id: membership.family_id,
    p_child_id: child.id,
    p_screen_policy: String(formData.get("screenPolicy") ?? "minimal_child_screen"),
    p_structure_level: String(formData.get("structureLevel") ?? "balanced"),
    p_weekday_minutes: weekdayMinutes,
    p_weekend_minutes: weekendMinutes,
    p_prefer_embedded: formData.get("preferEmbedded") === "on",
    p_caregiver_name: String(formData.get("caregiverName") ?? "").trim(),
    p_relationship: String(formData.get("relationship") ?? "").trim(),
    p_caregiver_languages: commaList(formData.get("caregiverLanguages")),
    p_aspirations: aspirations,
    p_language_goals: commaList(formData.get("languageGoals")),
  });
  if (profileError) return { error: profileError.message };

  const { error: planError } = await supabase.rpc("generate_weekly_plan", { p_child_id: child.id });
  if (planError) return { error: planError.message };

  revalidatePath("/today");
  revalidatePath("/week");
  redirect("/week");
}
